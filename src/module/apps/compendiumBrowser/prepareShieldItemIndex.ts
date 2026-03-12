import { produceAttackableItemTags } from "../../item/tags/attackableItemTags.js";
import { initializeMetadata } from "./metadataInitializer.js";
import { type ItemIndexEntity, type CompendiumMetadata } from "./compendium-browser";

export function prepareShieldItemIndex(
    compendiumMetadata: CompendiumMetadata,
    itemIndexEntity: ItemIndexEntity
): ItemIndexEntity {
    if (!isDisplayableShield(itemIndexEntity)) {
        throw new Error(`Item '${itemIndexEntity.name}' is not a shield`);
    }
    initializeTagGenerator(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

function isDisplayableShield(itemIndexEntity: ItemIndexEntity): boolean {
    return (
        itemIndexEntity.type === "shield" &&
        typeof itemIndexEntity.system === "object" &&
        itemIndexEntity.system.features !== undefined
    );
}

function initializeTagGenerator(item: ItemIndexEntity): void {
    const property = "featuresList";
    if (!(property in item)) {
        Object.defineProperty(item, property, {
            get: function () {
                return produceAttackableItemTags(this.system);
            },
        });
    }
}
