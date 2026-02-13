import { produceAttackableItemTags } from "../../item/tags/attackableItemTags.js";
import { initializeMetadata } from "./metadataInitializer.js";

/**
 * @param {CompendiumMetadata} compendiumMetadata
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {ItemIndexEntity}
 */
export function prepareArmorItemIndex(compendiumMetadata, itemIndexEntity) {
    if (!isDisplayableArmor(itemIndexEntity)) {
        throw new Error(`Item '${itemIndexEntity.name}' is not an armor`);
    }
    initializeTagGenerator(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

/**
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {boolean}
 */
function isDisplayableArmor(itemIndexEntity) {
    return (
        itemIndexEntity.type === "armor" &&
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
