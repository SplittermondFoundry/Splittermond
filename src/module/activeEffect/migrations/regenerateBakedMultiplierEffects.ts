import { foundryApi } from "module/api/foundryApi";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import type SplittermondItem from "module/item/item";
import { getAddModifier } from "module/item/item";
import type { ModifierType } from "module/modifiers";
import { isFirstActiveGM } from "module/util/foundryUserUtils";
import { isGenerated, rebuildModifierEffects } from "../effectBuilder";

const MIGRATION_FLAG_SCOPE = "splittermond";
const MIGRATION_FLAG_KEY = "bakedMultiplierV1MigrationDone";

const modifierTypeByItemType: Partial<Record<string, ModifierType>> = {
    weapon: "equipment",
    shield: "equipment",
    armor: "equipment",
    equipment: "equipment",
    strength: "innate",
    statuseffect: "innate",
    mastery: "innate",
    npcfeature: "innate",
    culturelore: "innate",
    spelleffect: "magic",
};

function modifierTypeFor(item: { type: string }): ModifierType | undefined {
    return modifierTypeByItemType[item.type];
}

function isWorldScopeItem(host: unknown): host is SplittermondItem {
    if (!(host instanceof Item)) return false;
    const pack = (host as { pack?: unknown }).pack;
    return !pack;
}

/**
 * One-shot migration: regenerate auto-generated ActiveEffects on every world-scope
 * item so their `serializedValue` no longer has the multiplier baked in. After S1–S5
 * the multiplier is applied at read time via `SplittermondActiveEffect.multiplier`.
 *
 * Idempotent: re-running on already-migrated effects produces the same un-baked form.
 * Guarded by a world-scope flag so it runs at most once per world.
 */
export async function regenerateBakedMultiplierEffects(): Promise<void> {
    if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) return;

    const addModifier = getAddModifier();
    if (!addModifier) return;

    if (foundryApi.settings.get(MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY) === true) return;

    const visited = new Set<string>();
    const itemsToRebuild: SplittermondItem[] = [];

    const collectFromHost = (host: { effects?: Iterable<FoundryActiveEffect> }) => {
        const effects = host.effects;
        if (!effects) return;
        for (const effect of effects) {
            if (!isGenerated(effect)) continue;
            const sourceItem = effect.item;
            if (!sourceItem || !isWorldScopeItem(sourceItem)) continue;
            const uuid = sourceItem.uuid;
            if (visited.has(uuid)) continue;
            if (modifierTypeFor(sourceItem) === undefined) continue;
            visited.add(uuid);
            itemsToRebuild.push(sourceItem);
        }
    };

    for (const actor of foundryApi.collections.actors) {
        collectFromHost(actor);
        for (const item of actor.items) {
            collectFromHost(item);
        }
    }
    for (const item of foundryApi.collections.items) {
        collectFromHost(item);
    }

    for (const item of itemsToRebuild) {
        const modifierType = modifierTypeFor(item)!;
        const modifierString = (item.system as { modifier?: string | null }).modifier ?? undefined;
        await rebuildModifierEffects(addModifier, item, modifierType, modifierString);
    }

    await foundryApi.settings.set(MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY, true);
}
