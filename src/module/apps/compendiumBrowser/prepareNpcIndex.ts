import { initializeMetadata } from "./metadataInitializer.js";
import { type ItemIndexEntity, type CompendiumMetadata } from "./compendium-browser";

export function prepareNpcIndex(
    compendiumMetadata: CompendiumMetadata,
    itemIndexEntity: ItemIndexEntity
): ItemIndexEntity {
    if (!isDisplayableNpc(itemIndexEntity)) {
        throw new Error(`Actor '${itemIndexEntity.name}' is not an NPC`);
    }
    initializeTagGenerator(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

function initializeTagGenerator(item: ItemIndexEntity): void {
    const property = "typeList";
    if (!(property in item)) {
        Object.defineProperty(item, property, {
            get: function () {
                return produceNpcTypeTags(this.system);
            },
        });
    }
}

function produceNpcTypeTags(system: { type: string }): { label: string }[] {
    if (!system.type || typeof system.type !== "string") return [];
    if (system.type.trim() === "" || system.type.trim() === "-") return [];
    return system.type.split(",").map((s) => ({ label: s.trim() }));
}

function isDisplayableNpc(itemIndexEntity: ItemIndexEntity): boolean {
    return itemIndexEntity.type === "npc" && typeof itemIndexEntity.system === "object";
}
