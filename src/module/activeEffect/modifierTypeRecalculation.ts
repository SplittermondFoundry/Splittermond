import { foundryApi } from "module/api/foundryApi";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import type { ModifierType } from "module/modifiers";
import { ACTION_EFFECT_TYPES, type EffectType } from "module/activeEffect/dataModel/effectTypes";
import type { EffectDataObject, ModifierEntry } from "./types";
import { modifierTypeForHost } from "./modifierTypeResolver";

const ACTION_EFFECT_TYPE_SET: ReadonlySet<EffectType> = new Set(ACTION_EFFECT_TYPES);

function isActionEffectType(type: string): type is EffectType {
    return ACTION_EFFECT_TYPE_SET.has(type as EffectType);
}

function recalculateModifierTypes(
    effect: EffectDataObject,
    desiredType: ModifierType
): { modifiers: ModifierEntry[] } | null {
    const type = effect.type;
    if (!type || !isActionEffectType(type)) return null;
    const modifiers: ModifierEntry[] = Array.isArray(effect.system?.modifiers) ? effect.system!.modifiers! : [];
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
    const effectData = effect as unknown as EffectDataObject;
    const type = effectData.type ?? "";
    const host = { documentName: parent.documentName, type: parent.type };
    const desiredType = modifierTypeForHost(host, type);
    const result = recalculateModifierTypes(effectData, desiredType);
    if (!result) return;
    effect.updateSource({ system: { modifiers: result.modifiers } });
}

export function setPreCreateActiveEffectHook(): void {
    foundryApi.hooks.on("preCreateActiveEffect", (effect: FoundryActiveEffect) => {
        reapplyModifierTypes(effect);
    });
}
