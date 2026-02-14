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
    initializeTagGenerator(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

/**
 * @param {ItemIndexEntity} item
 */
function initializeTagGenerator(item) {
    const property = "typeList";
    if (!(property in item)) {
        Object.defineProperty(item, property, {
            get: function () {
                return produceNpcTypeTags(this.system);
            },
        });
    }
}

/**
 * @param {{type: string}} system
 * @returns {{label: string}[]}
 */
function produceNpcTypeTags(system) {
    if (!system.type || typeof system.type !== "string") return [];
    if (system.type.trim() === "" || system.type.trim() === "-") return [];
    return system.type.split(",").map((s) => ({ label: s.trim() }));
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
