/**
 * This module organizes the transformation of index data obtained by the compendium browser
 * into data that can be displayed in the compendium browser, by transforming system properties into legible labels and
 * sorting the items into categories.
 */
import {initializeSpellItemPreparation} from "./prepareSpellItemIndex.js";
import {initializeMasteryItemPreparation} from "./prepareMasteryItemIndex.js";
import {initializeMetadata} from "./metadataInitializer.js";
import {prepareWeaponItemIndex} from "./prepareWeaponsIndex.js";
import {getMasteryAvailabilityParser, getSpellAvailabilityParser} from "../../item/availabilityParser.ts";


/**
 * Initializes the module by providing the appropriate localization context.
 * @param {{localize: (x:string)=>string}} i18n
 * @param {string[]} magicSkills
 * @param {string[]} masterySkills
 */
export function initializeDisplayPreparation(i18n, magicSkills, masterySkills) {
    const prepareSpellItemIndex = initializeSpellItemPreparation(getSpellAvailabilityParser(i18n, magicSkills));
    const prepareMasteryItemIndex = initializeMasteryItemPreparation(getMasteryAvailabilityParser(i18n, masterySkills));

    return produceDisplayableItems;

    /**
     * @typedef {{id:string, label:string}} CompendiumMetadata
     * @typedef {{availableIn:string, skill:string, skillLevel:number, features:string, level:string, secondaryAttack:{skill:string}, spellTags:string, spellType:string}} ItemIndexSystem
     * @typedef {{type:string, folder:string, img:string, name:string, sort:number, uuid:string, _id:string, system: ItemIndexSystem}} ItemIndexEntity
     * @param {CompendiumMetadata} metadata
     * @param {Promise<ItemIndexEntity[]>} index
     * @param {object} data
     * @returns {Promise<void>}
     */
    function produceDisplayableItems(metadata, index, data) {
        return index.then(/**@param {ItemIndexEntity[]} itemIndexEntities*/(itemIndexEntities) => {
            for (const itemIndex of itemIndexEntities) {
                if (!["spell", "mastery", "weapon"].includes(itemIndex.type)) {
                    continue;
                }
                data = initializeItemType(itemIndex.type, data);
                data[itemIndex.type].push(getTransformer(itemIndex.type)(metadata, itemIndex));
            }
        });
    }

    /**
     * @template T
     * @param {string} itemType
     * @param {T} data
     * @returns {T & {[typeof itemType]:[]}}
     */
    function initializeItemType(itemType, data) {
        if (data[itemType] === undefined) {
            data[itemType] = [];
        }
        return data;
    }

    /**
     * @typedef {(metadata: CompendiumMetadata, item: ItemIndexEntity) => ItemIndexEntity & CompendiumMetadata & {[x:string]:string[]}} SplittermondItemTransformer
     * @param {"spell"|"itemType"} itemType
     * @returns {SplittermondItemTransformer}
     */
    function getTransformer(itemType) {
        switch (itemType) {
            case "spell":
                return prepareSpellItemIndex;
            case "mastery":
                return prepareMasteryItemIndex;
            case "weapon":
                return prepareWeaponItemIndex;
            default:
                return initializeMetadata;
        }
    }
}
