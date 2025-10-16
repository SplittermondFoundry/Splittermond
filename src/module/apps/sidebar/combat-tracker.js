import { foundryApi } from "module/api/foundryApi";
import { askUserAboutPauseType } from "module/apps/sidebar/PauseCombatantDialogue";
import { combatantIsPaused, CombatPauseType } from "module/combat";
import { askUserForTickAddition } from "module/combat/TickAdditionDialog";
import { closestData } from "module/data/ClosestDataMixin";

export default class SplittermondCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
    /**
     * @param {ApplicationOptions} options
     */
    constructor(options = {}) {
        options.actions = {
            ...options.actions,
            addTicks(event, target) {
                return this._onAddTicks(event, target);
            },
            togglePause(event, target) {
                return this._onTogglePause(event, target);
            },
        };
        super(options);
    }

    /**
     * @param {string} partId
     * @param {ApplicationRenderContext} context
     * @param {HandlebarsRenderOptions} options
     * @returns {Promise<ApplicationRenderContext>}
     * @protected
     */
    async _preparePartContext(partId, context, options) {
        const renderContext = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "tracker":
                return this.prepareTracker(renderContext);
            default:
                return renderContext;
        }
    }

    /**
     * @returns {ApplicationRenderContext}
     * @private
     */
    prepareTracker(renderContext) {
        renderContext.turns?.forEach((c) => {
            if (c.initiative === null || c.initiative === undefined) {
            } else if (parseInt(c.initiative) === CombatPauseType.wait) {
                c.initiative = foundryApi.localize("splittermond.wait");
            } else if (parseInt(c.initiative) === CombatPauseType.keepReady) {
                c.initiative = foundryApi.localize("splittermond.keepReady");
            } else {
                let tickNumber = c.initiative ? Math.round(c.initiative) : 0;
                c.initiative = tickNumber + " | " + Math.round(100 * (c.initiative - tickNumber));
            }
        });
        return renderContext;
    }

    /**
     *
     * @param {Event} ev
     * @param {HTMLElement} target
     * @return {Promise<void>}
     * @private
     */
    async _onTogglePause(ev, target) {
        ev.preventDefault();
        ev.stopPropagation();

        const li = target.closest(".combatant");
        const combat = this.viewed;
        const c = combat.combatants.get(li.dataset.combatantId);

        if (combatantIsPaused(c)) {
            switch (c.initiative) {
                case CombatPauseType.wait:
                    return combat.setInitiative(c.id, parseInt(combat.round));
                case CombatPauseType.keepReady:
                    return combat.setInitiative(c.id, parseInt(combat.round), true);
                default:
                    break;
            }
        } else {
            return askUserAboutPauseType()
                .then((pauseType) => {
                    return combat.setInitiative(c.id, pauseType);
                })
                .catch(() => {});
        }
    }

    async _onAddTicks(ev, target) {
        ev.preventDefault();
        ev.stopPropagation();
        const combat = this.viewed;
        const c = combat.combatants.get(closestData(target, "combatant-id"));
        const ticksToAdd = await askUserForTickAddition(
            3,
            foundryApi.format("splittermond.applications.combatTracker.addTickDialogueMessage", { name: c.name })
        );

        const newInitiative = Math.round(c.initiative) + ticksToAdd;
        return combat.setInitiative(c.id, newInitiative);
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const combat = this.viewed;
        this.element.querySelectorAll(".combatant").forEach((/**@type HTMLElement*/ element) => {
            const cid = element.dataset.combatantId;
            const c = combat.combatants.get(cid);
            if (c && c.isOwner) {
                const combatantControls = element.querySelector(".combatant-controls");
                if (!combatantControls) {
                    console.warn("Splittermond | Could not find combatant controls to insert buttons into");
                    return;
                }
                if (combatantIsPaused(c)) {
                    this.#insertActivateButton(combatantControls);
                } else {
                    this.#insertPauseButton(combatantControls);
                    this.#insertAddTickButton(combatantControls);
                }
            }
        });
    }

    /**
     * @param {HTMLElement} combatantControls
     */
    #insertAddTickButton(combatantControls) {
        const ariaLabel = foundryApi.localize("splittermond.applications.combatTracker.addTickAriaLabel");
        const spacerElement = combatantControls.querySelector(".token-effects");
        if (!spacerElement) {
            console.warn("Splittermond | Could not find spacer element in combatant controls.");
            return;
        }
        spacerElement.insertAdjacentHTML(
            "beforebegin",
            `<button 
                     class="inline-control combatant-control icon fa-solid fa-circle-right" 
                     data-tooltip aria-label="${ariaLabel}" 
                     data-action="addTicks"
                   />`
        );
    }

    /**
     * @param {HTMLElement} combatantControls
     */
    #insertPauseButton(combatantControls) {
        const labelKey = "splittermond.applications.combatTracker.pauseCombatantAriaLabel";
        const pauseCombatantLabel = foundryApi.localize(labelKey);
        combatantControls.insertAdjacentHTML(
            "afterbegin",
            `<button 
                        class="inline-control combatant-control icon fa-solid fa-pause-circle" 
                        data-tooltip aria-label="${pauseCombatantLabel}" 
                        data-action="togglePause"
                   />`
        );
    }

    /**
     * @param {HTMLElement} combatantControls
     */
    #insertActivateButton(combatantControls) {
        const labelKey = "splittermond.applications.combatTracker.activateCombatantAriaLabel";
        const activateCombatantLabel = foundryApi.localize(labelKey);
        combatantControls.insertAdjacentHTML(
            "afterbegin",
            `<button 
                            class="inline-control combatant-control icon fa-solid fa-play-circle" 
                            data-tooltip aria-label="${activateCombatantLabel}"
                            data-action="togglePause"
                       />`
        );
    }
}
