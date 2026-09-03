import type { ModifierType } from "module/modifiers";
import type { EffectType } from "module/activeEffect/dataModel/effectTypes";
import type { ItemType } from "module/config/itemTypes";

const equipmentItemTypes: ReadonlySet<ItemType> = new Set(["weapon", "projectile", "armor", "shield", "equipment"]);
const magicItemTypes: ReadonlySet<ItemType> = new Set(["spell", "spelleffect"]);
const magicEffectTypes: ReadonlySet<EffectType> = new Set(["spellEffect", "spellEnhancedEffect"]);

export function modifierTypeForItemType(itemType: string): ModifierType {
    if (equipmentItemTypes.has(itemType as ItemType)) return "equipment";
    if (magicItemTypes.has(itemType as ItemType)) return "magic";
    return "innate";
}

export function modifierTypeForEffectType(effectType: string): ModifierType {
    if (magicEffectTypes.has(effectType as EffectType)) return "magic";
    return "innate";
}

export interface EffectHost {
    documentName: string;
    type: string;
}

export function modifierTypeForHost(host: EffectHost, effectType: string): ModifierType {
    if (host.documentName === "Item") {
        return modifierTypeForItemType(host.type);
    }
    if (host.documentName === "Actor") {
        return modifierTypeForEffectType(effectType);
    }
    return "innate";
}
