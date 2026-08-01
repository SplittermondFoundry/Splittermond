import { foundryApi } from "module/api/foundryApi";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import type { ModifierType } from "module/modifiers";
import type { EffectType } from "module/activeEffect/dataModel/effectTypes";
import { modifierTypeForHost } from "./modifierTypeResolver";

interface ModifierEntry {
    attributes?: { type?: unknown } | null;
}

interface EffectSystem {
    modifiers?: ModifierEntry[];
}

interface EffectWithSystem {
    type: string;
    system: EffectSystem;
}

const ACTION_EFFECT_TYPES: ReadonlySet<EffectType> = new Set([
    "modifier",
    "spellEffect",
    "spellEnhancedEffect",
    "attackEffect",
]);

function isActionEffectType(type: string): type is EffectType {
    return ACTION_EFFECT_TYPES.has(type as EffectType);
}

function recalculateModifierTypes(
    effect: EffectWithSystem,
    desiredType: ModifierType
): { modifiers: ModifierEntry[] } | null {
    if (!isActionEffectType(effect.type)) return null;
    const modifiers = Array.isArray(effect.system?.modifiers) ? effect.system!.modifiers! : [];
    let changed = false;
    const updatedModifiers = modifiers.map((entry) => {
        if (entry.attributes?.type === desiredType) return entry;
        changed = true;
        return { ...entry, attributes: { ...(entry.attributes ?? {}), type: desiredType } };
    });
    if (!changed) return null;
    return { modifiers: updatedModifiers };
}

function reapplyModifierTypes(effect: FoundryActiveEffect): void {
    const parent = effect.parent;
    if (!parent) return;
    const effectData = effect as unknown as EffectWithSystem;
    const host = { documentName: parent.documentName, type: parent.type };
    const desiredType = modifierTypeForHost(host, effectData.type);
    const result = recalculateModifierTypes(effectData, desiredType);
    if (!result) return;
    effect.updateSource({ system: { modifiers: result.modifiers } });
}

export function setPreCreateActiveEffectHook(): void {
    foundryApi.hooks.on("preCreateActiveEffect", (effect: FoundryActiveEffect) => {
        reapplyModifierTypes(effect);
    });
}
