import { initializeMetadata } from "./metadataInitializer.js";

/**
 * @param {CompendiumMetadata} compendiumMetadata
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {ItemIndexEntity}
 */
export function prepareNpcIndex(compendiumMetadata, itemIndexEntity) {
    if (!isDisplayableNpc(itemIndexEntity)) {
        throw new Error(`Actor '${itemIndexEntity.name}' is not an NPC`);
    }
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

/**
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {boolean}
 */
function isDisplayableNpc(itemIndexEntity) {
    return (
        itemIndexEntity.type === "npc" &&
        typeof itemIndexEntity.system === "object"
    );
}
