import { produceAttackableItemTags } from "../../item/tags/attackableItemTags.js";
import { initializeMetadata } from "./metadataInitializer.js";

/**
 * @param {CompendiumMetadata} compendiumMetadata
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {ItemIndexEntity}
 */
export function prepareShieldItemIndex(compendiumMetadata, itemIndexEntity) {
    if (!isDisplayableShield(itemIndexEntity)) {
        throw new Error(`Item '${itemIndexEntity.name}' is not a shield`);
    }
    initializeTagGenerator(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

/**
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {boolean}
 */
function isDisplayableShield(itemIndexEntity) {
    return (
        itemIndexEntity.type === "shield" &&
        typeof itemIndexEntity.system === "object" &&
        itemIndexEntity.system.features !== undefined
    );
}

/**
 * @param {ItemIndexEntity} item
 */
function initializeTagGenerator(item) {
    const property = "featuresList";
    if (!(property in item)) {
        Object.defineProperty(item, property, {
            get: function () {
                return produceAttackableItemTags(this.system);
            },
        });
    }
}
