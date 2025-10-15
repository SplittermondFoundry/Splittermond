import { foundryApi } from "module/api/foundryApi.js";
import { askUserAboutPauseType } from "module/apps/sidebar/TogglePauseDialogue.js";
import { combatantIsPaused, CombatPauseType } from "module/combat/index.js";

export default class SplittermondCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
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

    _onTogglePause(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const btn = ev.currentTarget;
        const li = btn.closest(".combatant");
        const combat = this.viewed;
        const c = combat.combatants.get(li.dataset.combatantId);

        if (!combatantIsPaused(c)) {
            return askUserAboutPauseType()
                .then((pauseType) => {
                    return combat.setInitiative(c.id, pauseType);
                })
                .catch(() => {});
        } else {
            switch (c.initiative) {
                case CombatPauseType.wait:
                    return combat.setInitiative(c.id, parseInt(combat.round));
                case CombatPauseType.keepReady:
                    return combat.setInitiative(c.id, parseInt(combat.round), true);
                default:
                    break;
            }
        }
    }

    _onAddTicks(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const btn = ev.currentTarget;
        const li = btn.closest(".combatant");
        const combat = this.viewed;
        const c = combat.combatants.get(li.dataset.combatantId);

        let dialog = new Dialog({
            title: "Ticks",
            content: "<input type='text' class='ticks' value='3'>",
            buttons: {
                ok: {
                    label: "Ok",
                    callback: (html) => {
                        let nTicks = parseInt(html.find(".ticks")[0].value);
                        let newInitiative = Math.round(c.initiative) + nTicks;

                        combat.setInitiative(c.id, newInitiative);
                    },
                },
                cancel: {
                    label: "Cancel",
                },
            },
        }).render(true);
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = $(this.element);

        const combat = this.viewed;
        $(html.find(".combatant")).each(function () {
            const cid = $(this).closestData("combatant-id");
            const c = combat.combatants.get(cid);
            if (c && c.isOwner) {
                if (combatantIsPaused(c)) {
                    $(".token-initiative .initiative", this).wrap(
                        '<a class="combatant-control" title="" data-control="addTicks"/>'
                    );
                    $(".combatant-controls", this)
                        .prepend(`<a class="combatant-control" title="" data-control="togglePause">
            <i class= "fas fa-pause-circle" ></i></a>`);
                } else {
                    $(".combatant-controls", this)
                        .prepend(`<a class="combatant-control" title="" data-control="togglePause">
            <i class= "fas fa-play-circle" ></i></a>`);
                }
            }
        });

        html.find('[data-control="togglePause"]').click((ev) => this._onTogglePause(ev));
        html.find('[data-control="addTicks"]').click((ev) => this._onAddTicks(ev));
    }
}
