import type {IModifier} from "module/modifiers";
import type {ICostModifier} from "module/util/costs/spellCostManagement";
import type {ModifierDataModel} from "./dataModel/ModifierDataModel";
import type {InverseModifierDataModel} from "./dataModel/InverseModifierDataModel";
import type {MultiplicativeModifierDataModel} from "./dataModel/MultiplicativeModifierDataModel";
import type {CostModifierDataModel} from "./dataModel/CostModifierDataModel";
import {SplittermondBaseActiveEffect} from "module/data/SplittermondBaseActiveEffect";
import {and, isMember} from "module/util/util";
import {COST_MODIFIER_TYPES, type EffectType, MODIFIER_TYPES} from "./dataModel/effectTypes";

export type { EffectType };

/**
 * Splittermond system subclass of ActiveEffect.
 *
 * This is a test balloon: for now, status effect items propagate their parsed modifiers
 * as ActiveEffect documents. The effects are displayed in the actor's status tab but are
 * NOT yet consumed by the modifier system — the old pipeline still handles application.
 */
export class SplittermondActiveEffect extends SplittermondBaseActiveEffect {
    declare system: IModifier | ICostModifier;
    declare type: EffectType;
    /**
     * Determine whether this effect is suppressed based on the source item's state.
     * For example, weapon effects are suppressed when the weapon is not equipped.
     *
     * Currently only statuseffect items create effects, so this is mostly a no-op,
     * but it lays the groundwork for equipped/active suppression later.
     */
    get isSuppressed(): boolean {
        if (super.isSuppressed) return true;

        // For transferred effects, this.parent is the Actor, not the Item.
        const sourceItem = this.item ?? null;
        if (!sourceItem) return false;

        switch (sourceItem.type) {
            case "weapon":
            case "shield":
            case "armor":
                return !(sourceItem.system as any).equipped;
            case "spelleffect":
                return !(sourceItem.system as any).active;
            default:
                return false;
        }
    }


    /**
     * Returns the typed system data as an {@link IModifier} if this effect's type
     * is one of the scalar modifier types, otherwise `null`.
     */
    get asModifier(): IModifier | null {
        if (isMember(MODIFIER_TYPES, this.type)) {
            return this.system as unknown as
                | ModifierDataModel
                | InverseModifierDataModel
                | MultiplicativeModifierDataModel;
        }
        return null;
    }

    /**
     * Returns the typed system data as an {@link ICostModifier} if this effect's type
     * is a cost modifier type, otherwise `null`.
     */
    get asCostModifier(): ICostModifier | null {
        if (isMember(COST_MODIFIER_TYPES, this.type)) {
            return this.system as CostModifierDataModel;
        }
        return null;
    }

    /**
     * Collect all {@link IModifier} instances from a collection of active effects,
     * filtering out suppressed and disabled effects.
     */
    static getModifiers(effects: Iterable<SplittermondActiveEffect>): IModifier[] {
        return getModifiers(effects, ableAndUnsuppressed)
    }
    static withFilter(func: (e:SplittermondActiveEffect) => boolean){
        const fullFilter= and(ableAndUnsuppressed, func)
        return {
            getModifiers:(e:Iterable<SplittermondActiveEffect>)=> getModifiers(e,fullFilter),
            getCostModifiers:(e:Iterable<SplittermondActiveEffect>)=> getCostModifiers(e, fullFilter),
        }
    }

    /**
     * Collect all {@link ICostModifier} instances from a collection of active effects,
     * filtering out suppressed and disabled effects.
     */
    static getCostModifiers(effects: Iterable<SplittermondActiveEffect>): ICostModifier[] {
        return getCostModifiers(effects, ableAndUnsuppressed);
    }
}


type EffectFilter = (effect: SplittermondActiveEffect) => boolean;
function ableAndUnsuppressed(effect: SplittermondActiveEffect) {
    return !effect.isSuppressed  && !effect.disabled
}

function* filterEffects(effects: Iterable<SplittermondActiveEffect>, filter:EffectFilter) {
    for (const effect of effects) {
        if (!filter(effect)) continue;
        yield effect;
    }
}

function getModifiers(effects: Iterable<SplittermondActiveEffect>, filter:EffectFilter): IModifier[] {
    const result: IModifier[] = [];
    for (const effect of filterEffects(effects,(e)=> filter(e))) {
        const modifier = effect.asModifier;
        if (modifier) result.push(modifier);
    }
    return result;
}

/**
 * Collect all {@link ICostModifier} instances from a collection of active effects,
 * filtering out suppressed and disabled effects.
 */
function getCostModifiers(effects: Iterable<SplittermondActiveEffect>,filter:EffectFilter): ICostModifier[] {
    const result: ICostModifier[] = [];
    for (const effect of filterEffects(effects,(e)=> filter(e))) {
        const costModifier = effect.asCostModifier;
        if (costModifier) result.push(costModifier);
    }
    return result;
}
