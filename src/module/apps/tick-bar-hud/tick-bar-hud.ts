import { FoundryDragDrop } from "../../api/Application";
import { TickBarHudTemplateData } from "./templateInterface";
import type { StatusEffectMessageData } from "../../util/chat.js";
import * as Chat from "../../util/chat.js";
import { closestData } from "../../data/ClosestDataMixin";
import { foundryApi } from "../../api/foundryApi";
import {
    type ApplicationContextOptions,
    ApplicationOptions,
    type ApplicationRenderContext,
    SplittermondApplication,
} from "../../data/SplittermondApplication";
import type { VirtualToken } from "../../combat/VirtualToken";
import { initMaxWidthTransitionForTickBarHud } from "./tickBarResizing";
import type { FoundryCombat, FoundryCombatant } from "module/api/foundryTypes";
import type SplittermondItem from "module/item/item";
import { combatantIsPaused, CombatPauseType } from "module/combat";

export default class TickBarHud extends SplittermondApplication {
    viewed: FoundryCombat | null = null;
    viewedTick: number = 0;
    currentTick: number = 0;
    lastStatusTick: number = 0;
    maxTick: number = 0;
    minTick: number = 0;
    _dragOverTimeout: number = 0;
    _clickTime: number = 0;
    dragDrop: FoundryDragDrop[] = [];

    static PARTS = {
        app: {
            template: "systems/splittermond/templates/apps/tick-bar-hud.hbs",
        },
    };
    static DEFAULT_OPTIONS = {
        id: "tick-bar-hud",
        classes: ["splittermond", "tick-bar-hud"],
        window: {
            frame: false,
            popOut: false,
            minimizable: false,
            resizable: false,
        },
        popOut: false,
        dragDrop: [
            {
                dragSelector: ".tick-bar-hud-combatant-list-item",
                dropSelector: [".tick-bar-hud-tick", ".tick-bar-hud-nav-btn"],
            },
        ],
    };

    constructor(options: ApplicationOptions = {}) {
        super(options);
    }

    get combats(): FoundryCombat[] {
        const currentScene = foundryApi.currentScene;
        return foundryApi.combats.filter((c: FoundryCombat) => c.scene === null || c.scene === currentScene);
    }

    get firstApplicableCombat(): FoundryCombat | null {
        const combats = this.combats;
        //Finds the first active combat or the first combat if none is active. Null if no combats exist
        return combats.length ? combats.find((c) => c.isActive) || combats[0] : null;
    }

    async _prepareContext(
        options: ApplicationContextOptions
    ): Promise<TickBarHudTemplateData & ApplicationRenderContext> {
        const data: TickBarHudTemplateData & ApplicationRenderContext = {
            ...(await super._prepareContext(options)),
            ticks: [],
            wait: [],
            keepReady: [],
        };

        //saveguard against a botched calculation in a previous call
        const firstApplicableCombat = this.firstApplicableCombat;
        if (isNaN(this.viewedTick)) {
            this.viewedTick = 0;
        }

        if (firstApplicableCombat != this.viewed) {
            this.viewedTick = 0;
        }

        this.viewed = firstApplicableCombat;
        if (this.viewed && this.viewed.started) {
            const combat = this.viewed;
            let wasOnCurrentTick = this.currentTick == this.viewedTick;

            this.currentTick = Math.round(combat.turns[combat.turn]?.initiative ?? 0);

            if (isNaN(this.currentTick)) {
                this.currentTick = 0;
            }

            this.viewedTick = this.viewedTick ?? this.currentTick;

            if (wasOnCurrentTick || this.viewedTick < this.currentTick) {
                this.viewedTick = this.currentTick;
            }

            const statusOnCombatants: {
                combatant: FoundryCombatant;
                virtualTokens: VirtualToken[];
            }[] = combat.combatants.contents
                .filter((combatant) => !!combatant.actor) //safeguard against combatants whose actor got deleted
                .map((e) => {
                    return {
                        combatant: e,
                        virtualTokens: e.actor.getVirtualStatusTokens() || [],
                    };
                });

            const iniData = combat.turns
                .filter((combatant) => "initiative" in combatant)
                .filter((combatant) => combatant.initiative != null && !combatant.isDefeated)
                .map((combatant) => Math.round(combatant.initiative ?? 0))
                .filter((initiative) => initiative < 9999);
            var maxStatusEffectTick = Math.max(
                ...statusOnCombatants.map((e) => {
                    var ticks = e.virtualTokens.map((f) => {
                        return f.times * f.interval + f.startTick;
                    });
                    return Math.max(...ticks);
                })
            );

            let lastTick = this.minTick;
            this.maxTick = Math.max(Math.max(...iniData, maxStatusEffectTick) + 25, 50);
            this.minTick = Math.min(...iniData);
            this.validateTickRange();
            for (let tickNumber = this.minTick; tickNumber <= this.maxTick; tickNumber++) {
                data.ticks.push({
                    tickNumber: tickNumber,
                    isCurrentTick: this.currentTick == tickNumber,
                    combatants: [],
                    statusEffects: [],
                });
            }

            for (let [i, c] of combat.turns.entries()) {
                if (c.initiative == null) continue;

                if (combatantIsPaused(c)) {
                    let combatantData = {
                        id: c.id,
                        name: c.name,
                        img: c.img,
                        active: false,
                        owner: c.isOwner,
                        defeated: c.isDefeated,
                        hidden: c.hidden,
                        initiative: c.initiative,
                        hasRolled: true,
                    };

                    if (c.initiative === CombatPauseType.wait) {
                        data.wait.push(combatantData);
                    }

                    if (c.initiative === CombatPauseType.keepReady) {
                        data.keepReady.push(combatantData);
                    }

                    continue;
                }
                if (!c.visible || c.isDefeated) continue;

                data.ticks
                    .find((t) => t.tickNumber == Math.round(c.initiative ?? 0))
                    ?.combatants.push({
                        id: c.id,
                        name: c.name,
                        img: c.img,
                        active: i === combat.turn,
                        owner: c.isOwner,
                        defeated: c.isDefeated,
                        hidden: c.hidden,
                        initiative: c.initiative,
                        hasRolled: c.initiative !== null,
                    });
            }

            const activatedStatusTokens: (StatusEffectMessageData & { combatant: FoundryCombatant })[] = [];

            statusOnCombatants.forEach((combatant) => {
                combatant.virtualTokens.forEach((element) => {
                    for (let index = 0; index < element.times; index++) {
                        const onTick = index * element.interval + element.startTick;
                        if (onTick <= this.minTick) {
                            if (
                                this.lastStatusTick != null &&
                                lastTick <= onTick &&
                                this.lastStatusTick != this.currentTick &&
                                this.lastStatusTick != onTick &&
                                combatant.combatant.isOwner
                            ) {
                                //this effect was activated in between the last tick and the current tick or we just got to that tick
                                activatedStatusTokens.push({
                                    onTick,
                                    virtualToken: element,
                                    maxActivation: element.times,
                                    activationNo: index + 1,
                                    combatant: combatant.combatant,
                                });
                            }
                            if (onTick < this.minTick) {
                                continue;
                            }
                        }
                        data.ticks
                            .find((t) => t.tickNumber == onTick)
                            ?.statusEffects.push({
                                id: combatant.combatant.id,
                                owner: combatant.combatant.owner,
                                active: false,
                                img: element.img || combatant.combatant.img,
                                description: element.description,
                                name: `${combatant.combatant.name} - ${element.name} ${element.level} #${index}`,
                            });
                    }
                });
            });
            for (let index = 0; index < activatedStatusTokens.length; index++) {
                const element = activatedStatusTokens[index];
                // noinspection ES6MissingAwait Chat message is info for the user, we don't need to await it.
                foundryApi.createChatMessage(await Chat.prepareStatusEffectMessage(element.combatant.actor, element));
            }
        }

        this.lastStatusTick = this.currentTick;

        return data;
    }

    /**
     * Validates the calculated tick range to ensure it falls within acceptable bounds. Through mishap or malicious input
     * The range can be made to be absurdly large (like billions of ticks). For each tick we create and allocate an object
     * easily crashing foundry on startup.
     */
    private validateTickRange() {
        if (isNaN(this.minTick) || !isFinite(this.minTick) || this.minTick < -100) {
            //try to set minTick from combat
            const combatRound: number | undefined = this.firstApplicableCombat?.round;
            if (combatRound !== undefined && isFinite(combatRound)) {
                this.minTick = combatRound;
                return;
            }
            console.warn(
                "Splittermond | Tick Bar HUD calculated a faulty minimum tick value. Setting -20 as min Tick."
            );
            this.minTick = -20;
        }
        if (isNaN(this.maxTick) || !isFinite(this.maxTick) || this.maxTick > 1000) {
            console.warn("Splittermond | Tick Bar HUD calculated a faulty maximum tick value. Setting 50 as max Tick.");
            this.maxTick = 50;
        }
    }

    private animateMouseMovement(event: Event, animation: (e: HTMLElement) => Keyframe[] | PropertyIndexedKeyframes) {
        const target = event.currentTarget as HTMLElement;
        const childElements = Array.from(target.children).slice(1) as HTMLElement[]; // :not(:first-child)
        childElements.forEach((child) => child.animate(animation(child), { duration: 200, fill: "forwards" }));
    }

    async _onRender(context: any, options: any): Promise<void> {
        await super._onRender(context, options);
        this.dragDrop = this.dragDrop.length > 0 ? this.dragDrop : this.createDragDropHandlers(); //lazy init
        this.dragDrop.forEach((d) => d.bind(this.element));
        // Listeners and UI logic
        const html = this.element;
        html.querySelectorAll(".tick-bar-hud-combatant-list").forEach((list) => {
            let zIndexCounter = list.children.length - 1;
            Array.from(list.children).forEach((child) => {
                (child as HTMLElement).style.zIndex = zIndexCounter.toString();
                zIndexCounter--;
            });
            list.addEventListener("mouseenter", (event) => {
                this.animateMouseMovement(event, (child) => [
                    { marginTop: child.style.marginTop || "0px" },
                    { marginTop: "5px" },
                ]);
            });
            list.addEventListener("mouseleave", (event) => {
                this.animateMouseMovement(event, (child) => [
                    { marginTop: child.style.marginTop || "5px" },
                    { marginTop: "-38px" },
                ]);
            });
        });
        html.querySelectorAll(".tick-bar-hud-nav-btn").forEach((btn) => {
            btn.addEventListener("click", (event) => {
                let action = closestData(event.currentTarget as HTMLElement, "action");
                let ticksElem = html.querySelector(".tick-bar-hud-ticks") as HTMLElement;
                let inView = ticksElem ? ticksElem.offsetWidth / 72 : 0;
                let step = Math.ceil(inView / 2);
                if (action == "next-ticks") {
                    this.viewedTick = (this.viewedTick ?? 0) + step;
                }
                if (action == "previous-ticks") {
                    this.viewedTick = (this.viewedTick ?? 0) - step;
                }
                if ((this.viewedTick ?? 0) < (this.currentTick ?? 0)) {
                    this.viewedTick = this.currentTick;
                }
                if ((this.viewedTick ?? 0) + Math.floor(inView) > (this.maxTick ?? 0)) {
                    this.viewedTick = (this.maxTick ?? 0) - Math.floor(inView) + 1;
                }
                let offset = (this.viewedTick - this.currentTick) * 72;
                this.moveScrollbar(offset);
            });
        });
        let offset = (this.viewedTick - this.currentTick) * 72;
        html.querySelectorAll(".tick-bar-hud-ticks:not(.tick-bar-hud-ticks-special)").forEach((ticks) => {
            Array.from(ticks.children).forEach((child) => {
                (child as HTMLElement).style.left = -offset + "px";
            });
        });
        html.querySelectorAll(".tick-bar-hud-combatant-list-item").forEach((item) => {
            item.addEventListener("mouseenter", (event) => {
                const combatant = this.viewed?.combatants.get(
                    (event.currentTarget as HTMLElement).dataset.combatantId!
                );
                const token = combatant?.token?.object;
                if (token && !token.controlled) token._onHoverIn(event);
            });
            item.addEventListener("mouseleave", (event) => {
                const combatant = this.viewed?.combatants.get(
                    (event.currentTarget as HTMLElement).dataset.combatantId!
                );
                const token = combatant?.token?.object;
                if (token) token._onHoverOut(event);
            });
        });
        html.querySelectorAll(".tick-bar-hud-combatant-list-item").forEach((item) => {
            item.addEventListener("click", (event) => {
                const combatant = this.viewed?.combatants.get(
                    (event.currentTarget as HTMLElement).dataset.combatantId!
                );
                const token = combatant?.token;
                if (
                    token === null ||
                    !combatant?.actor?.testUserPermission(foundryApi.currentUser, "OBSERVED", { exact: false })
                )
                    return;
                const now = Date.now();
                const dt = now - this._clickTime;
                this._clickTime = now;
                if (dt <= 250) return token?.actor?.sheet.render(true);
                if (token === undefined) {
                    return foundryApi.warnUser("COMBAT.CombatantNotInScene", { name: combatant?.name });
                }
                if (token.object) {
                    token.object.control({ releaseOthers: true });
                    return foundryApi.canvas.animatePan({ x: token.x, y: token.y });
                }
            });
        });
        html.querySelectorAll(".tick-bar-hud-combatant-list-item").forEach((item) => {
            item.addEventListener("dragstart", () => {
                html.querySelectorAll(".tick-bar-hud-tick-special-no-data").forEach((el) => {
                    const element = el as HTMLElement;
                    element.animate(
                        [
                            { width: element.style.width || "0px", opacity: parseFloat(element.style.opacity || "0") },
                            { width: "128px", opacity: 1 },
                        ],
                        { duration: 200, fill: "forwards" }
                    );
                });
            });
            item.addEventListener("dragend", () => {
                html.querySelectorAll(".tick-bar-hud-tick-special-no-data").forEach((el) => {
                    const element = el as HTMLElement;
                    element.animate(
                        [
                            {
                                width: element.style.width || "128px",
                                opacity: parseFloat(element.style.opacity || "1"),
                            },
                            { width: "0px", opacity: 0 },
                        ],
                        { duration: 200, fill: "forwards" }
                    );
                });
            });
        });
        if (this.currentTick === this.viewedTick) {
            this.withPresentPreviousTickButton((button) => {
                button.style.width = "0px";
                button.style.marginLeft = "-10px";
                button.style.opacity = "0";
            });
        }
        foundryApi.hooks.call("splittermond.tickBarHudRendered", this);
    }

    private get previousTickButton(): HTMLButtonElement | null {
        return this.element.querySelector('.tick-bar-hud-nav-btn[data-action="previous-ticks"]');
    }

    private withPresentPreviousTickButton(action: (button: HTMLButtonElement) => void) {
        const button = this.previousTickButton;
        if (button) {
            return action(button);
        }
    }

    _canDragStart(): boolean {
        return true;
    }

    _canDragDrop(): boolean {
        return true;
    }

    private createDragDropHandlers(): FoundryDragDrop[] {
        return (this.options.dragDrop as Record<string, unknown>[]).map((d) => {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            };
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this),
            };
            return new FoundryDragDrop(d);
        });
    }

    _onDragStart(event: DragEvent): void {
        const element = event.currentTarget as HTMLElement;
        if (element.classList.contains("tick-bar-hud-status-effect-list-item")) {
            event.dataTransfer!.effectAllowed = "none";
            return;
        }

        // Set effectAllowed and ensure it's properly configured
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            // Also set a drag image if needed for better visual feedback
            const dragImage = element.cloneNode(true) as HTMLElement;
            dragImage.style.opacity = "0.8";
            event.dataTransfer.setDragImage(dragImage, 0, 0);
        }

        const combatantId = closestData(element, "combatant-id");
        event.dataTransfer!.setData(
            "text/plain",
            JSON.stringify({
                type: "Combatant",
                combatantId: combatantId,
            })
        );
    }

    _onDrop(event: DragEvent): void {
        if (!this.viewed) return;
        const element = event.currentTarget as HTMLElement;
        const tick = closestData(element, "tick");
        const data = JSON.parse(event.dataTransfer!.getData("text/plain"));
        if (tick !== undefined && data.type === "Combatant") {
            const combatant = this.viewed.combatants.get(data.combatantId);
            if (combatant && combatant.isOwner) {
                if (combatant.initiative === CombatPauseType.keepReady) {
                    this.viewed.setInitiative(data.combatantId, tick, true);
                } else {
                    this.viewed.setInitiative(data.combatantId, tick);
                }
            }
        }
    }

    _onDragOver(event: DragEvent): void {
        const targetElement = event.currentTarget as HTMLElement;
        const action = closestData(targetElement, "action");
        const now = Date.now();
        if (action && now - this._dragOverTimeout > 300) {
            this._dragOverTimeout = now;
            const parentElement = targetElement.parentElement;
            if (!parentElement) {
                console.warn(`Splittermond | Somehow drag element ${targetElement.outerHTML} has no parent`);
                return;
            }
            const tickElement = parentElement?.querySelector(".tick-bar-hud-ticks")!.getBoundingClientRect().width ?? 0;
            const inView = tickElement / 72;
            const step = 1;
            if (action === "next-ticks") {
                this.viewedTick = this.viewedTick + step;
            }
            if (action === "previous-ticks") {
                this.viewedTick = this.viewedTick - step;
            }
            if (this.viewedTick && this.currentTick && this.viewedTick < this.currentTick) {
                this.viewedTick = this.currentTick;
            }
            if (this.viewedTick && this.maxTick && this.viewedTick + Math.floor(inView) > this.maxTick) {
                this.viewedTick = this.maxTick - Math.floor(inView) + 1;
            }
            const offset = (this.viewedTick - this.currentTick) * 72;
            this.moveScrollbar(offset);
        }
    }

    private moveScrollbar(offset: number) {
        const scrollElement = this.element.querySelector(".tick-bar-hud-ticks-scroll") as HTMLElement;
        if (scrollElement) {
            scrollElement.animate([{ left: scrollElement.style.left || "0px" }, { left: -offset + "px" }], {
                duration: 200,
                fill: "forwards",
            });
        }

        this.withPresentPreviousTickButton((previousTickButton) => {
            if (this.currentTick === this.viewedTick) {
                const buttonOpacity = parseFloat(previousTickButton.style.opacity || "1");
                if (buttonOpacity === 1) {
                    previousTickButton.animate(
                        [
                            {
                                width: previousTickButton.style.width || "32px",
                                marginLeft: previousTickButton.style.marginLeft || "10px",
                                opacity: buttonOpacity,
                            },
                            { width: "0px", marginLeft: "-10px", opacity: 0 },
                        ],
                        { duration: 100, fill: "forwards" }
                    );
                }
            } else {
                const buttonOpacity = parseFloat(previousTickButton.style.opacity || "0");
                if (buttonOpacity === 0) {
                    previousTickButton.animate(
                        [
                            {
                                width: previousTickButton.style.width || "0px",
                                marginLeft: previousTickButton.style.marginLeft || "-10px",
                                opacity: buttonOpacity,
                            },
                            { width: "32px", marginLeft: "10px", opacity: 1 },
                        ],
                        { duration: 100, fill: "forwards" }
                    );
                }
            }
        });
    }
}

/**
 * Initializer for the Tick Bar HUD application.
 * Needs to be called in the 'ready' hook
 */
export function initTickBarHud(splittermond: Record<string, unknown>) {
    const tickBarHud = new TickBarHud();
    splittermond.tickBarHud = tickBarHud;
    foundryApi.combats.apps.push(tickBarHud);

    function renderForActiveCombatant(combatant: FoundryCombatant) {
        if (tickBarHud.combats.find((c) => c.isActive && c === combatant.combat)) {
            tickBarHud.render(true);
        }
    }
    function renderForItemChange(item: SplittermondItem) {
        if (!item.actor) return;
        const combatant = foundryApi.combat?.combatants.find((c) => c.actorId === item.actor.id);
        if (combatant && item.type === "statuseffect") {
            renderForActiveCombatant(combatant);
        }
    }
    foundryApi.hooks.on("updateCombatant", renderForActiveCombatant);
    foundryApi.hooks.on("deleteCombatant", renderForActiveCombatant);
    foundryApi.hooks.on("updateItem", renderForItemChange);
    foundryApi.hooks.on("deleteItem", renderForItemChange);
    foundryApi.hooks.on("createItem", renderForItemChange);

    return tickBarHud.render(true).then(() => initMaxWidthTransitionForTickBarHud(tickBarHud));
}
