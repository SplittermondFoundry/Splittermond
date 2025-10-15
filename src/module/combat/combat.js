import { CombatPauseType } from "module/combat/index.js";

export default class SplittermondCombat extends Combat {
    _sortCombatants(a, b) {
        let iniA = parseFloat(a.initiative);
        let iniB = parseFloat(b.initiative);

        // if equal initiative => compare intuition
        if (iniA === iniB) {
            iniA = -a.actor.system.attributes.intuition.value;
            iniB = -b.actor.system.attributes.intuition.value;
        }

        // if equal intuition => player character first!
        if (iniA === iniB) {
            iniA = a.actor.type === "character" ? iniA - 1 : iniA;
            iniB = b.actor.type === "character" ? iniB - 1 : iniB;
        }

        // if equal intuition => else random
        if (iniA === iniB) {
            iniA = Math.random();
            iniB = Math.random();
            console.log("SplittermondCombat._sortCombatants: random INI!");
        }

        return iniA + (a.isDefeated ? 1000 : 0) - (iniB + (b.isDefeated ? 1000 : 0));
    }

    async startCombat() {
        await super.startCombat();
        this.update({ round: this.currentTick ?? 0 });
        return this;
    }

    async resetAll() {
        await super.resetAll();

        return this.update({ round: 0 });
    }

    async nextTurn(nTicks = 0) {
        if (nTicks === 0) {
            let p = new Promise((resolve, reject) => {
                let dialog = new Dialog({
                    title: "Ticks",
                    content: "<input type='text' class='ticks' value='3'>",
                    buttons: {
                        ok: {
                            label: "Ok",
                            callback: (html) => {
                                resolve(parseInt(html.find(".ticks")[0].value));
                            },
                        },
                    },
                });
                dialog.render(true);
            });
            nTicks = await p;
        }

        let combatant = this.combatant;

        let newInitiative = Math.round(combatant.initiative) + nTicks;

        return this.setInitiative(combatant.id, newInitiative);
    }

    async previousTurn() {
        return this.previousRound();
    }

    async setInitiative(id, value, first = false) {
        value = Math.round(value);
        if (value < CombatPauseType.wait) {
            if (!first) {
                value = this.combatants.reduce((acc, c) => {
                    return Math.round(c.initiative) === value ? Math.max((c.initiative || 0) + 0.01, acc) : acc;
                }, value);
            } else {
                value = this.combatants.reduce((acc, c) => {
                    return Math.round(c.initiative) === value ? Math.min((c.initiative || 0) - 0.01, acc) : acc;
                }, value);
            }
        } else {
            if (value !== CombatPauseType.wait && value !== CombatPauseType.keepReady) {
                return;
            }
        }

        await this.combatants.get(id).update({
            initiative: value,
        });
        if (this.started) {
            await this.nextRound(); // I honestly have no clue what this is for.
        }
    }

    get combatant() {
        //this function may be called during setup turns, where the "turns" array does not yet exist.
        return this.turns?.[0];
    }

    get currentTick() {
        if (this.turns) {
            return Math.round(parseFloat(this.turns[0]?.initiative));
        } else {
            return null;
        }
    }

    async nextRound() {
        if (!this.started) return;

        const updateData = { round: this.currentTick, turn: 0 };
        this.setupTurns();
        const updateOptions = { direction: 1 };
        Hooks.callAll("combatRound", this, updateData, updateOptions);
        return this.update(updateData);
    }

    async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
        let tick = this.currentTick;
        await super.rollInitiative(ids, {
            formulaToDisplay: formula,
            updateTurn: updateTurn,
            messageOptions: messageOptions,
        });

        if (this.started) {
            for (let [i, id] of ids.entries()) {
                let combatant = this.combatants.get(id);
                await this.setInitiative(combatant.id, Math.max(combatant.initiative + tick, tick));
            }
            return this.nextRound();
        }
    }

    /**
     * @protected
     * @deprecated use updateDescendantDocuments instead
     */
    _onUpdateEmbeddedDocuments(embeddedName, documents, result, options, userId) {
        this.setupTurns(); //otherwise the next player is not marked correctly
        super._onUpdateEmbeddedDocuments(embeddedName, documents, result, options, userId);
    }

    _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
        this.setupTurns(); //otherwise the next player is not marked correctly
        super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
    }
}
