import type { SpellDataModelType } from "./dataModel/SpellDataModel";
import type { EnhancedSpellProperty } from "./dataModel/EnhancedSpellValues";

export type SpellValues = Pick<SpellDataModelType, EnhancedSpellProperty>;

export function resolveSpellValues(system: SpellDataModelType, enhanced = false): SpellValues {
    if (!enhanced) return system;
    const values = system.enhanced;
    return {
        damage: values.damage ?? system.damage,
        features: values.features ?? system.features,
        damageType: values.damageType ? values.damageType.value : system.damageType,
        costType: values.costType ? values.costType.value : system.costType,
        range: values.range?.value ?? system.range,
        effectArea: values.effectArea?.value ?? system.effectArea,
        effectDuration: values.effectDuration?.value ?? system.effectDuration,
    };
}
