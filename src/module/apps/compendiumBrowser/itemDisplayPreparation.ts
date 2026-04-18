/**
 * This module organizes the transformation of index data obtained by the compendium browser
 * into data that can be displayed in the compendium browser, by transforming system properties into legible labels and
 * sorting the items into categories.
 */
import { initializeSpellItemPreparation } from "./prepareSpellItemIndex.js";
import { initializeMasteryItemPreparation } from "./prepareMasteryItemIndex.js";
import { initializeMetadata } from "./metadataInitializer.js";
import { prepareWeaponItemIndex } from "./prepareWeaponsIndex.js";
import { prepareArmorItemIndex } from "./prepareArmorItemIndex.js";
import { prepareShieldItemIndex } from "./prepareShieldItemIndex.js";
import { prepareNpcIndex } from "./prepareNpcIndex.js";
import { getMasteryAvailabilityParser, getSpellAvailabilityParser } from "../../item/availabilityParser.js";
import { CompendiumItemType, CompendiumMetadata, ItemIndexEntity } from "./compendium-browser.js";
import { SplittermondSkill } from "module/config/skillGroups.js";

type SplittermondItemTransformer = (metadata: CompendiumMetadata, item: ItemIndexEntity) => ItemIndexEntity; // & CompendiumMetadata & { [x: string]: string[] };

type DisplayItemData = Record<CompendiumItemType, ReturnType<SplittermondItemTransformer>[]>;

/**
 * Initializes the module by providing the appropriate localization context.
 */
export function initializeDisplayPreparation(
    i18n: { localize: (x: string) => string },
    magicSkills: SplittermondSkill[],
    masterySkills: SplittermondSkill[]
) {
    const prepareSpellItemIndex = initializeSpellItemPreparation(getSpellAvailabilityParser(i18n, magicSkills));
    const prepareMasteryItemIndex = initializeMasteryItemPreparation(getMasteryAvailabilityParser(i18n, masterySkills));

    return produceDisplayableItems;

    async function produceDisplayableItems(
        metadata: CompendiumMetadata,
        index: Promise<ItemIndexEntity[]>,
        data: DisplayItemData
    ): Promise<void> {
        const itemIndexEntities = await index;
        for (const itemIndex of itemIndexEntities) {
            if (!["spell", "mastery", "weapon", "armor", "shield", "npc"].includes(itemIndex.type)) {
                continue;
            }
            data[itemIndex.type] ??= [];
            data[itemIndex.type].push(getTransformer(itemIndex.type)(metadata, itemIndex));
        }
    }

    function getTransformer(itemType: CompendiumItemType): SplittermondItemTransformer {
        switch (itemType) {
            case "spell":
                return prepareSpellItemIndex;
            case "mastery":
                return prepareMasteryItemIndex;
            case "weapon":
                return prepareWeaponItemIndex;
            case "armor":
                return prepareArmorItemIndex;
            case "shield":
                return prepareShieldItemIndex;
            case "npc":
                return prepareNpcIndex;
            default:
                return initializeMetadata;
        }
    }
}
