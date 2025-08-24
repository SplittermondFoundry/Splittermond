import {FoundryApplication, FoundryDragDrop} from "../../api/Application";
import {TickBarHudTemplateData} from "./templateInterface";
import * as Chat from "../../util/chat.js";
import type {FoundryCombat, FoundryCombatant} from "module/api/foundryTypes"
import {closestData} from "../../data/ClosestDataMixin";
import {foundryApi} from "../../api/foundryApi";
import type {ApplicationContextOptions, ApplicationRenderContext} from "../../data/SplittermondApplication";
import type {VirtualToken} from "../../combat/VirtualToken";
import type {StatusEffectMessageData} from "../../util/chat.js";

export default class TickBarHud extends FoundryApplication {
    viewed: FoundryCombat | null = null;
    viewedTick: number = 0;
    currentTick: number = 0;
    lastStatusTick: number = 0;
    maxTick: number = 0;
    minTick: number = 0;
    _dragOverTimeout: number = 0;
    _clickTime: number = 0;
    dragDrop: FoundryDragDrop[] = [];

    static DEFAULT_OPTIONS = {
        id: "tick-bar-hud",
        template: "systems/splittermond/templates/apps/tick-bar-hud.hbs",
        popOut: false,
        dragDrop: [{dragSelector: ".tick-bar-hud-combatant-list-item", dropSelector: [".tick-bar-hud-tick", ".tick-bar-hud-nav-btn"]}]
    };

    get combats(): FoundryCombat[] {
        const currentScene = foundryApi.currentScene;
        return foundryApi.combats.filter((c: FoundryCombat) => (c.scene === null) || (c.scene === currentScene));
    }

    async _prepareContext(options: ApplicationContextOptions): Promise<TickBarHudTemplateData & ApplicationRenderContext> {
        const data: TickBarHudTemplateData & ApplicationRenderContext = {
            ...await super._prepareContext(options),
            ticks: [],
            wait: [],
            keepReady: []
        };

        const combats = this.combats;
        let temp = combats.length ? combats.find(c => c.isActive) || combats[0] : null;
        if (temp != this.viewed) {
            this.viewedTick = 0;
        }
        if (this.viewedTick != this.viewedTick) {
            this.viewedTick = 0;
        }

        this.viewed = temp;
        if (this.viewed && this.viewed.started) {
            const combat = this.viewed;
            let wasOnCurrentTick = this.currentTick == this.viewedTick;

            this.currentTick = Math.round(combat.turns[combat.turn]?.initiative);

            if (isNaN(this.currentTick)) {
                this.currentTick = 0;
            }

            this.viewedTick = this.viewedTick ?? this.currentTick;

            if (wasOnCurrentTick || this.viewedTick < this.currentTick) {
                this.viewedTick = this.currentTick
            }

            const statusOnCombatants:{combatant:FoundryCombatant, virtualTokens: VirtualToken[]}[] = combat.combatants.contents.map(e => {
                return {
                    combatant: e,
                    virtualTokens: e.actor.getVirtualStatusTokens() || [],
                }
            });

            const iniData = combat.turns
                .filter(combatant => "initiative" in combatant)
                .filter(combatant => (combatant.initiative != null && !combatant.isDefeated))
                .map(combatant => Math.round(combatant.initiative))
                .filter(initiative => initiative < 9999);
            var maxStatusEffectTick = Math.max(...statusOnCombatants.map(e => {
                var ticks = e.virtualTokens.map(f => {
                    return (f.times * f.interval) + f.startTick;
                });
                return Math.max(...ticks)
            }));

            var lastTick = this.minTick;
            this.maxTick = Math.max(Math.max(...iniData, maxStatusEffectTick) + 25, 50);
            this.minTick = Math.min(...iniData);
            for (let tickNumber = this.minTick; tickNumber <= this.maxTick; tickNumber++) {
                data.ticks.push({
                    tickNumber: tickNumber,
                    isCurrentTick: this.currentTick == tickNumber,
                    combatants: [],
                    statusEffects: []
                });
            }

            for ( let [i, c] of combat.turns.entries() ) {



                if (c.initiative == null) continue;

                if ( c.initiative > 9999) {

                    let combatantData = {
                        id: c.id,
                        name: c.name,
                        img: c.img,
                        active: false,
                        owner: c.isOwner,
                        defeated: c.isDefeated,
                        hidden: c.hidden,
                        initiative: c.initiative,
                        hasRolled: c.initiative !== null
                    };

                    if (c.initiative === 10000) {
                        data.wait.push(combatantData);
                    }

                    if (c.initiative === 20000) {
                        data.keepReady.push(combatantData);
                    }

                    continue;
                };

                if ( !c.visible || c.isDefeated) continue;

                data.ticks.find(t => t.tickNumber == Math.round(c.initiative))?.combatants.push({
                    id: c.id,
                    name: c.name,
                    img: c.img,
                    active: i === combat.turn,
                    owner: c.isOwner,
                    defeated: c.isDefeated,
                    hidden: c.hidden,
                    initiative: c.initiative,
                    hasRolled: c.initiative !== null
                });
            }

            const activatedStatusTokens:(StatusEffectMessageData &{combatant:FoundryCombatant})[] = [];

            statusOnCombatants.forEach(combatant => {
                combatant.virtualTokens.forEach(element => {
                    for (let index = 0; index < element.times; index++) {
                        const onTick = (index * element.interval) + element.startTick;
                        if(onTick <= this.minTick)
                        {
                            if(this.lastStatusTick != null &&
                                lastTick <= onTick &&
                                this.lastStatusTick != this.currentTick &&
                                this.lastStatusTick != onTick &&
                                combatant.combatant.isOwner)
                            {
                                //this effect was activated in between the last tick and the current tick or we just got to that tick
                                activatedStatusTokens.push({
                                    onTick,
                                    virtualToken: element,
                                    maxActivation: element.times,
                                    activationNo: index + 1,
                                    combatant: combatant.combatant,
                                })
                            }
                            if(onTick < this.minTick)
                            {
                                continue;
                            }
                        }
                        data.ticks.find(t => t.tickNumber == onTick)?.statusEffects.push({
                            id: combatant.combatant.id,
                            owner: combatant.combatant.owner,
                            active: false,
                            img: element.img || combatant.combatant.img,
                            description: element.description,
                            name: `${combatant.combatant.name} - ${element.name} ${element.level} #${index}`
                        });
                    }
                });
            });
            for (let index = 0; index < activatedStatusTokens.length; index++) {
                const element = activatedStatusTokens[index];
                foundryApi.createChatMessage(await Chat.prepareStatusEffectMessage(element.combatant.actor, element))
            }
        }

        this.lastStatusTick = this.currentTick;

        return data;
    }

    async _onRender(): Promise<void> {
        // Drag & drop setup
        this.dragDrop = (this.options.dragDrop as Record<string, unknown>[]).map((d) => {
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
        this.dragDrop.forEach((d) => d.bind(this.element));

        // Listeners and UI logic
        const html = this.element;
        // Replace jQuery .each with native forEach
        html.querySelectorAll('.tick-bar-hud-combatant-list').forEach(list => {
            let zIndexCounter = list.children.length - 1;
            Array.from(list.children).forEach(child => {
                (child as HTMLElement).style.zIndex = zIndexCounter.toString();
                zIndexCounter--;
            });
            $(list).hover(function () {
                $(this).children(":not(:first-child)").animate({"margin-top": "5px"}, 200);
            }, function () {
                $(this).children(":not(:first-child)").animate({"margin-top": "-38px"}, 200);
            });
        });
        html.querySelectorAll('.tick-bar-hud-nav-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                let action = closestData(event.currentTarget as HTMLElement, "action");
                let ticksElem = html.querySelector('.tick-bar-hud-ticks') as HTMLElement;
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
                let offset = this.viewedTick - this.currentTick  * 72;
                this.moveScrollbar(offset)
            });
        });
        let offset = ((this.viewedTick ?? 0) - (this.currentTick ?? 0)) * 72;
        html.querySelectorAll('.tick-bar-hud-ticks:not(.tick-bar-hud-ticks-special)').forEach(ticks => {
            Array.from(ticks.children).forEach(child => {
                (child as HTMLElement).style.left = -offset + "px";
            });
        });
        html.querySelectorAll(".tick-bar-hud-combatant-list-item").forEach(item => {
            item.addEventListener('mouseenter', (event) => {
                const combatant = this.viewed?.combatants.get((event.currentTarget as HTMLElement).dataset.combatantId!);
                const token = combatant?.token?.object;
                if (token && !token._controlled) token._onHoverIn(event);
            });
            item.addEventListener('mouseleave', (event) => {
                const combatant = this.viewed?.combatants.get((event.currentTarget as HTMLElement).dataset.combatantId!);
                const token = combatant?.token?.object;
                if (token) token._onHoverOut(event);
            });
        });
        html.querySelectorAll(".tick-bar-hud-combatant-list-item").forEach(item => {
            item.addEventListener('click', (event) => {
                const combatant = this.viewed?.combatants.get((event.currentTarget as HTMLElement).dataset.combatantId!);
                const token = combatant?.token;
                if ((token === null) || !combatant?.actor?.testUserPermission(foundryApi.currentUser, "OBSERVED")) return;
                const now = Date.now();
                const dt = now - this._clickTime;
                this._clickTime = now;
                if (dt <= 250) return token?.actor?.sheet.render(true);
                if (token === undefined) {
                    return foundryApi.warnUser("COMBAT.CombatantNotInScene", {name: combatant?.name});
                }
                if (token.object) {
                    token.object?.control({releaseOthers: true});
                    return foundryApi.canvas.animatePan({x: token.x, y: token.y});
                }
            });
        });
        html.querySelectorAll(".tick-bar-hud-combatant-list-item").forEach(item => {
            item.addEventListener("dragstart", () => {
                $(html.querySelectorAll(".tick-bar-hud-tick-special-no-data")).animate({width: "128px", opacity: 1}, 200);
            });
            item.addEventListener("dragend", () => {
                $(html.querySelectorAll(".tick-bar-hud-tick-special-no-data")).animate({width: "0px", opacity: 0}, 200);
            });
        });
        if (this.currentTick === this.viewedTick) {
            this.withPresentPreviousTickButton((button) => {
                button.style.width = "0px";
                button.style.marginLeft = "-10px";
                button.style.opacity = "0";
            });
        }
    }

    private get previousTickButton(): HTMLButtonElement|null {
        return this.element.querySelector('.tick-bar-hud-nav-btn[data-action="previous-ticks"]')
    }
    private withPresentPreviousTickButton(action:(button: HTMLButtonElement)=>void){
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
    _onDragStart(event: DragEvent): void {
        const element = event.currentTarget as HTMLElement;
        if (element.classList.contains("tick-bar-hud-status-effect-list-item")) {
            event.dataTransfer!.effectAllowed = "none";
            return;
        }
        event.dataTransfer!.effectAllowed = "move";
        const combatantId = closestData(element, 'combatant-id');
        event.dataTransfer!.setData("text/plain", JSON.stringify({
            type: "Combatant",
            combatantId: combatantId,
        }));
    }
    _onDrop(event: DragEvent): void {
        if (!this.viewed) return;
        const element = event.currentTarget as HTMLElement;
        const tick = closestData(element, 'tick');
        const data = JSON.parse(event.dataTransfer!.getData("text/plain"));
        if (tick !== undefined && data.type === "Combatant") {
            const combatant = this.viewed.combatants.get(data.combatantId);
            if (combatant && combatant.isOwner) {
                if (combatant.initiative === 20000) {
                    this.viewed.setInitiative(data.combatantId, tick, true);
                } else {
                    this.viewed.setInitiative(data.combatantId, tick);
                }
            }
        }
    }
    _onDragOver(event: DragEvent): void {
        const targetElement = event.currentTarget as HTMLElement;
        const action = closestData(targetElement,"action");
        const now = Date.now();
        if (action && now - this._dragOverTimeout > 300) {
            this._dragOverTimeout = now;
            const parentElement = targetElement.parentElement;
            if(!parentElement){
                console.warn(`Splittermond | Somehow drag element ${targetElement.outerHTML} has no parent`)
                return;
            }
            const tickElement = parentElement?.querySelector(".tick-bar-hud-ticks")!.getBoundingClientRect().width ?? 0
            const inView =  tickElement/ 72;
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
            this.moveScrollbar(offset)
        }
    }
    
    private moveScrollbar(offset:number){
        $(this.element).find(".tick-bar-hud-ticks-scroll").animate({left: -offset + "px"}, 200);
        this.withPresentPreviousTickButton(previousTickButton=>{
            if (this.currentTick === this.viewedTick) {
                const buttonOpacity = parseInt(previousTickButton.style.opacity);
                if (buttonOpacity === 1) {
                    $(previousTickButton).animate({width: "0px", "margin-left": "-10px", opacity: 0}, 100);
                }
            } else {
                const buttonOpacity = parseInt(previousTickButton.style.opacity);
                if (buttonOpacity === 0) {
                    $(previousTickButton).animate({width: "32px", "margin-left": "10px", opacity: 1}, 100);
                }
            }});
    }
}
