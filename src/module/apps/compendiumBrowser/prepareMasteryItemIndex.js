import {produceMasteryTags} from "../../item/tags/masteryTags.js";
import {initializeMetadata} from "./metadataInitializer.js";

/**
 *
 * @param {MasteryAvailabilityParser} masteryAvailabiltyParser
 * @returns {typeof prepareMasteryItemIndex}
 */
export function initializeMasteryItemPreparation(masteryAvailabiltyParser) {
    return prepareMasteryItemIndex;
    /**
     * @param {CompendiumMetadata} compendiumMetadata
     * @param {ItemIndexEntity} itemIndexEntity
     * @returns {ItemIndexEntity}
     */
    function prepareMasteryItemIndex(compendiumMetadata, itemIndexEntity) {
        if (!isDisplayableMastery(itemIndexEntity)) {
            throw new Error(`Item '${itemIndexEntity.name}' is not a mastery`);
        }
        initializeTagGenerator(itemIndexEntity);
        return initializeMetadata(compendiumMetadata, itemIndexEntity);
    }

    function isDisplayableMastery(itemIndexEntity) {
        return itemIndexEntity.type === "mastery" && typeof itemIndexEntity.system === "object" &&
            itemIndexEntity.system.level !== undefined &&
            itemIndexEntity.system.skill !== undefined &&
            itemIndexEntity.system.availableIn !== undefined;
    }

    /**
     * @param {ItemIndexEntity} item
     */
    function initializeTagGenerator(item) {
        const property = "availableInList";
        if (!(property in item)) {
            Object.defineProperty(item,
                property,
                {
                    get: function () {
                        return produceMasteryTags(this.system, masteryAvailabiltyParser);
                    }
                });
        }
    }
}