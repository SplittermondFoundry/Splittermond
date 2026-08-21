import { foundryApi } from "module/api/foundryApi";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import type SplittermondItem from "module/item/item";
import type { EffectDataObject, EffectSubstitutor, SplittermondEffectFlags } from "./types";

export async function copyCompendiumEffectToItem(
    item: SplittermondItem,
    uuid: string,
    substitutor: EffectSubstitutor = (e) => e
): Promise<void> {
    const resolved = await foundryApi.utils.fromUUID(uuid);
    if (!resolved) return;
    const compendiumEffect = resolved as FoundryActiveEffect;

    const data = compendiumEffect.toObject() as EffectDataObject;
    delete data._id;

    data.flags = foundryApi.utils.mergeObject(data.flags ?? {}, {
        core: { sourceId: compendiumEffect.uuid },
    }) as SplittermondEffectFlags;
    data.origin = item.uuid;
    data.transfer = true;
    if (data.type !== "modifier") data.type = "modifier";

    const substitutedData = substitutor(data);

    await item.createEmbeddedDocuments("ActiveEffect", [substitutedData]);
}
