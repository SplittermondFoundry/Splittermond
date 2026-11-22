import { foundryApi } from "module/api/foundryApi";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import SplittermondItem, { getAddModifier } from "module/item/item";
import type { ModifierType } from "module/modifiers";
import { isFirstActiveGM } from "module/util/foundryUserUtils";
import { isGenerated, rebuildModifierEffects } from "../effectBuilder";
import { modifierTypeForItemType } from "../modifierTypeResolver";

const MIGRATION_FLAG_SCOPE = "splittermond";
const MIGRATION_FLAG_KEY = "bakedMultiplierV1MigrationDone";

interface MigrationCollections {
    actors: Iterable<Pick<Actor, "effects" | "items">>;
    items: Iterable<Pick<Item, "effects">>;
}

function modifierTypeFor(item: { type: string }): ModifierType | undefined {
    const itemType = item.type;
    if (
        itemType === "weapon" ||
        itemType === "shield" ||
        itemType === "armor" ||
        itemType === "equipment" ||
        itemType === "strength" ||
        itemType === "statuseffect" ||
        itemType === "mastery" ||
        itemType === "npcfeature" ||
        itemType === "culturelore" ||
        itemType === "spelleffect"
    ) {
        return modifierTypeForItemType(itemType);
    }
    return undefined;
}

function isWorldScopeItem(host: unknown): host is SplittermondItem {
    if (!(host instanceof SplittermondItem)) return false;
    const pack = (host as { pack?: unknown }).pack;
    return !pack;
}

/**
 * One-shot migration: regenerate auto-generated ActiveEffects on every world-scope
 * item so their `serializedValue` no longer has the multiplier baked in. After S1–S5
 * the multiplier is applied at read time via `SplittermondActiveEffect.multiplier`.
 *
 * Idempotent: re-running on already-migrated effects produces the same un-baked form.
 * The default world-wide run is guarded by a completion flag. Explicit collections
 * can be migrated independently without reading or updating that world-wide flag.
 */
export async function regenerateBakedMultiplierEffects(collections?: MigrationCollections): Promise<void> {
    if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) return;

    const addModifier = getAddModifier();
    if (!addModifier) return;

    if (!collections && foundryApi.settings.get(MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY) === true) return;

    const sources = collections ?? foundryApi.collections;

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

    for (const actor of sources.actors) {
        collectFromHost(actor);
        for (const item of actor.items) {
            collectFromHost(item);
        }
    }
    for (const item of sources.items) {
        collectFromHost(item);
    }

    for (const item of itemsToRebuild) {
        const modifierType = modifierTypeFor(item)!;
        const modifierString = (item.system as { modifier?: string | null }).modifier ?? undefined;
        await rebuildModifierEffects(addModifier, item, modifierType, modifierString);
    }

    if (!collections) await foundryApi.settings.set(MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY, true);
}
