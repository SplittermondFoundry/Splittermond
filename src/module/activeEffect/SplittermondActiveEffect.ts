import type { IModifier } from "module/modifiers";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import type { HasCostModifiers, HasModifiers } from "module/activeEffect/dataModel/ActionEffectDataModel";
import { SplittermondBaseActiveEffect } from "module/data/SplittermondBaseActiveEffect";
import { and } from "module/util/util";
import type { DatabaseUpdateOperation, DataModelUpdateOptions } from "module/api/foundryTypes";
import { foundryApi } from "module/api/foundryApi";
import type { EffectType } from "module/activeEffect/dataModel/effectTypes";
import type { ActionEffectDataModel } from "module/activeEffect/dataModel/ActionEffectDataModel";

export type DurationMode = "timed" | "channelled" | "permanent";

/**
 * Splittermond system subclass of ActiveEffect.
 *
 * This is a test balloon: for now, status effect items propagate their parsed modifiers
 * as ActiveEffect documents. The effects are displayed in the actor's status tab but are
 * NOT yet consumed by the modifier system — the old pipeline still handles application.
 */
export class SplittermondActiveEffect extends SplittermondBaseActiveEffect {
    declare type: EffectType | "base";
    declare system: ActionEffectDataModel | {};
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
     * Returns the {@link IModifier} collection from this effect's system data
     * if it is backed by an {@link ActionEffectDataModel},
     * otherwise an empty array.
     */
    get asModifiers(): IModifier[] {
        if (this.type === "base") return [];
        const system = this.system as HasModifiers;
        return system.asModifiers ?? [];
    }

    /**
     * Returns the {@link ICostModifier} collection from this effect's system data
     * if this effect is backed by an {@link ActionEffectDataModel},
     * otherwise an empty array.
     */
    get asCostModifiers(): ICostModifier[] {
        if (this.type === "base") return [];
        const system = this.system as HasCostModifiers;
        return system.asCostModifiers ?? [];
    }

    get durationMode(): DurationMode {
        const value = this.getFlag("splittermond", "durationMode");
        if (value === "timed" || value === "channelled" || value === "permanent") return value;
        return "permanent";
    }

    set durationMode(mode: DurationMode) {
        this.setFlag("splittermond", "durationMode", mode);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (this.durationMode === "channelled") {
            this.duration.label = foundryApi.localize("splittermond.activeEffect.duration.channelled");
        } else if (this.durationMode === "permanent") {
            this.duration.label = foundryApi.localize("splittermond.activeEffect.duration.permanent");
        }
    }

    updateSource(data: object, operation: DataModelUpdateOptions = {}): object {
        return super.updateSource(data, this.#withForcedReplacementOnTypeChange(data, operation));
    }

    update(data: object, operation: Partial<Omit<DatabaseUpdateOperation, "updates">> = {}): Promise<FoundryDocument> {
        return super.update(data, this.#withForcedReplacementOnTypeChange(data, operation));
    }

    #withForcedReplacementOnTypeChange(data: object, operation: DataModelUpdateOptions): DataModelUpdateOptions {
        const type = this.#readType(data);
        if (!type || type === this.type) return operation;
        return {
            ...operation,
            recursive: false,
        };
    }

    #readType(data: object): string | null {
        if (!("type" in data)) return null;
        const type = data.type;
        return typeof type === "string" ? type : null;
    }

    /**
     * Collect all {@link IModifier} instances from a collection of active effects,
     * filtering out suppressed and disabled effects.
     */
    static getModifiers(effects: Iterable<SplittermondActiveEffect>): IModifier[] {
        return getModifiers(effects, ableAndUnsuppressed);
    }
    static withFilter(func: (e: SplittermondActiveEffect) => boolean) {
        const fullFilter = and(ableAndUnsuppressed, func);
        return {
            getModifiers: (e: Iterable<SplittermondActiveEffect>) => getModifiers(e, fullFilter),
            getCostModifiers: (e: Iterable<SplittermondActiveEffect>) => getCostModifiers(e, fullFilter),
        };
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
    return !effect.isSuppressed && !effect.disabled;
}

function* filterEffects(effects: Iterable<SplittermondActiveEffect>, filter: EffectFilter) {
    for (const effect of effects) {
        if (!filter(effect)) continue;
        yield effect;
    }
}

function getModifiers(effects: Iterable<SplittermondActiveEffect>, filter: EffectFilter): IModifier[] {
    const result: IModifier[] = [];
    for (const effect of filterEffects(effects, (e) => filter(e))) {
        result.push(...effect.asModifiers);
    }
    return result;
}

function getCostModifiers(effects: Iterable<SplittermondActiveEffect>, filter: EffectFilter): ICostModifier[] {
    const result: ICostModifier[] = [];
    for (const effect of filterEffects(effects, (e) => filter(e))) {
        result.push(...effect.asCostModifiers);
    }
    return result;
}
