import type { SpellDataModelType } from "./dataModel/SpellDataModel";
import type { SpellVariantProperty } from "./dataModel/SpellValueVariants";

type BaseSpellValues = { [K in SpellVariantProperty]: SpellDataModelType[K]["base"] };
export type SpellValues = Omit<BaseSpellValues, "damageType" | "costType"> & {
    damageType: Exclude<BaseSpellValues["damageType"], "none"> | null;
    costType: Exclude<BaseSpellValues["costType"], "none"> | null;
};

export function resolveSpellValues(system: SpellDataModelType, enhanced = false): SpellValues {
    const damageType = selected(system.damageType, enhanced);
    const costType = selected(system.costType, enhanced);
    return {
        damage: selected(system.damage, enhanced),
        features: selected(system.features, enhanced),
        damageType: damageType === "none" ? null : damageType,
        costType: costType === "none" ? null : costType,
        range: selected(system.range, enhanced),
        effectArea: selected(system.effectArea, enhanced),
        effectDuration: selected(system.effectDuration, enhanced),
    };
}

function selected<T>(values: { base: T; enhanced: T | null }, enhanced: boolean): T {
    return enhanced && values.enhanced !== null ? values.enhanced : values.base;
}
