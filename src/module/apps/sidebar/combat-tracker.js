export default class SplittermondCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
    async getData(options) {
        const data = await super.getData(options);
        if (!data.hasCombat) return data;
        data.turns.forEach((c) => {
            if (parseInt(c.initiative) === 10000) {
                c.initiative = game.i18n.localize("splittermond.wait");
            } else if (parseInt(c.initiative) === 20000) {
                c.initiative = game.i18n.localize("splittermond.keepReady");
            } else {
                let tickNumber = c.initiative ? Math.round(c.initiative) : 0;
                c.initiative = tickNumber + " | " + Math.round(100 * (c.initiative - tickNumber));
            }
        });
        data.round = data.combat.started ? Math.round(parseFloat(data.combat.turns[0]?.initiative)) + "" : "";
        if (game.release.generation < 10) {
            data.combat = data.combat.toObject();
            data.combat.data = data.combat;
            data.combat.data.round = data.round;
        } else {
            data.combat = data.combat.toObject();
            data.combat.round = data.round;
        }

        return data;
    }

    _onTogglePause(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const btn = ev.currentTarget;
        const li = btn.closest(".combatant");
        const combat = this.viewed;
        const c = combat.combatants.get(li.dataset.combatantId);

        if (c.initiative < 10000) {
            let dialog = new Dialog({
                title: "Abwarten / Bereithalten",
                buttons: {
                    cancel: {
                        label: game.i18n.localize("splittermond.cancel"),
                        callback: (html) => {},
                    },
                    keepReady: {
                        label: game.i18n.localize("splittermond.keepReady"),
                        callback: (html) => {
                            combat.setInitiative(c.id, 20000);
                        },
                    },
                    wait: {
                        label: game.i18n.localize("splittermond.wait"),
                        callback: (html) => {
                            combat.setInitiative(c.id, 10000);
                        },
                    },
                },
            });
            dialog.render(true);
        } else {
            switch (c.initiative) {
                case 10000:
                    combat.setInitiative(c.id, parseInt(combat.round));
                    break;
                case 20000:
                    combat.setInitiative(c.id, parseInt(combat.round), true);
                    break;
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

    activateListeners(html) {
        super.activateListeners(html);

        const combat = this.viewed;
        $(html.find(".combatant")).each(function () {
            const cid = $(this).closestData("combatant-id");
            const c = combat.combatants.get(cid);
            if (c && c.isOwner) {
                if (c.initiative < 10000) {
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
