import { CombatPauseType } from "module/combat/index.js";
import { askUserForTickAddition } from "module/combat/TickAdditionDialog.js";
import { foundryApi } from "../api/foundryApi";
import { FoundryCombat } from "module/api/Combat";
import { elapsedCombatSeconds } from "module/worldTime/time";
import { recordsCombatTime } from "module/worldTime/settings";
import { queueWorldTimeChange } from "module/worldTime/service";

/**
 * @param {SplittermondCombat} instance
 * @param {{round:number,turn:number}} updateData
 */
function combatStartHook(instance, updateData) {
    updateData.round = instance.calculateCurrentRound();
}
foundryApi.hooks.on("combatStart", combatStartHook);

/**
 * @param {SplittermondCombat} instance
 * @param {{round:number,turn:number}} updateData
 * @param {{worldTime:{delta:number},diff?:boolean}} updateOptions
 */
function combatRoundHook(instance, updateData, updateOptions) {
    updateData.round = instance.calculateCurrentRound();
    updateData.turn = 0;
    updateOptions.worldTime.delta = recordsCombatTime() ? instance.worldTimeDelta : 0;
    // Negative ticks and tick 0 share round 1; retain the update carrying their elapsed time.
    if (updateOptions.worldTime.delta !== 0) updateOptions.diff = false;
}
foundryApi.hooks.on("combatRound", combatRoundHook);

export default class SplittermondCombat extends FoundryCombat {
    worldTimeDelta = 0;

    getTimeDelta() {
        // Foundry rounds clamp negative ticks to 1. Only an actual tick move supplies elapsed time.
        return 0;
    }
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
            console.log(`Splittermond | Random initiative for actors ${a.name}, ${b.name}!`);
        }

        return iniA + (a.isDefeated ? 1000 : 0) - (iniB + (b.isDefeated ? 1000 : 0));
    }

    async startCombat() {
        return super.startCombat();
    }

    async resetAll() {
        await super.resetAll();
        return this.update({ round: 0 }, { turnEvents: false });
    }

    async nextTurn(nTicks = 0) {
        if (nTicks === 0) {
            nTicks = await askUserForTickAddition(3, "").catch(() => 0);
            if (nTicks === 0) return;
        }

        let combatant = this.combatant;

        let newInitiative = Math.round(combatant.initiative) + nTicks;

        return this.setInitiative(combatant.id, newInitiative);
    }

    async previousTurn() {
        return this.previousRound();
    }

    async setInitiative(id, value, first = false) {
        return queueWorldTimeChange(() => this.applyInitiative(id, value, first));
    }

    async applyInitiative(id, value, first = false, recordTime = true) {
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

        const previousTick = this.currentTick;
        await this.combatants.get(id).update({
            initiative: value,
        });
        if (this.started) {
            this.worldTimeDelta = recordTime
                ? elapsedCombatSeconds(previousTick, this.currentTick, CombatPauseType.wait)
                : 0;
            try {
                await this.nextRound();
            } finally {
                this.worldTimeDelta = 0;
            }
        }
    }

    get combatant() {
        //this function may be called during setup turns, where the "turns" array does not yet exist.
        return this.turns?.[0];
    }

    get currentTick() {
        if (this.turns) {
            const lowestInitiative = this.turns[0]?.initiative;
            if (!lowestInitiative || !isFinite(lowestInitiative)) {
                return 0;
            }
            return Math.round(lowestInitiative);
        } else {
            return null;
        }
    }

    /** @returns {number} */
    calculateCurrentRound() {
        const round = Math.floor(this.currentTick ?? 0);
        if ([CombatPauseType.keepReady, CombatPauseType.wait].includes(round)) {
            /**@type number*/
            return this.round; //reuse the last stored round value if all combatants are paused
        }
        return Math.max(round, 1); //combat does not like negative round numbers.
    }

    async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
        return queueWorldTimeChange(async () => {
            await super.rollInitiative(ids, {
                formulaToDisplay: formula,
                updateTurn: updateTurn,
                messageOptions: messageOptions,
            });

            if (this.started) {
                let tick = this.currentTick;
                for (const id of Array.isArray(ids) ? ids : [ids]) {
                    let combatant = this.combatants.get(id);
                    // Establishing initiative changes the order, but does not consume adventure time.
                    await this.applyInitiative(combatant.id, Math.max(combatant.initiative + tick, tick), false, false);
                }
                return this.nextRound();
            }
        });
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
