import { produceSpellAvailabilityTags } from "../../item/tags/spellTags.js";
import { initializeMetadata } from "./metadataInitializer.js";

/**
 *
 * @param spellAvailabilityParser
 * @returns {typeof prepareSpellItemIndex}
 */
export function initializeSpellItemPreparation(spellAvailabilityParser) {
    return prepareSpellItemIndex;

    /**
     * @param {CompendiumMetadata} compendiumMetadata
     * @param {ItemIndexEntity} itemIndexEntity
     * @returns {ItemIndexEntity}
     */
    function prepareSpellItemIndex(compendiumMetadata, itemIndexEntity) {
        if (!isDisplayableSpell(itemIndexEntity)) {
            throw new Error(`Item '${itemIndexEntity.name}' is not a spell`);
        }
        initializeTagGenerators(itemIndexEntity);
        return initializeMetadata(compendiumMetadata, itemIndexEntity);
    }

    /**
     * @param {ItemIndexEntity} itemIndexEntity
     * @returns {boolean}
     */
    function isDisplayableSpell(itemIndexEntity) {
        return (
            itemIndexEntity.type === "spell" &&
            typeof itemIndexEntity.system === "object" &&
            itemIndexEntity.system.skill !== undefined &&
            itemIndexEntity.system.skillLevel !== undefined &&
            itemIndexEntity.system.spellType !== undefined &&
            itemIndexEntity.system.availableIn !== undefined
        );
    }

    /**
     * @param {ItemIndexEntity} item
     */
    function initializeTagGenerators(item) {
        const properties = {
            availableInList: {
                get: function () {
                    return produceSpellAvailabilityTags(this.system, spellAvailabilityParser);
                },
            },
            spellTypeList: { value: item.system.spellType?.split(",") },
        };
        for (const key in properties) {
            if (!(key in item)) {
                Object.defineProperty(item, key, properties[key]);
            }
        }
    }
}
