import { splittermond } from "../../config";
import { initMapper } from "../../util/LanguageMapper";
import type { itemCreator } from "../../data/EntityCreator";
import { DamageModel } from "../../item/dataModel/propertyModels/DamageModel";
import { foundryApi } from "../../api/foundryApi";
import { CastDurationModel } from "module/item/dataModel/propertyModels/CastDurationModel";
import type { SplittermondSkill } from "module/config/skillGroups";

const skillMapper = initMapper(splittermond.skillGroups.magic)
    .withTranslator((t) => `splittermond.skillLabel.${t}`)
    .andOtherMappers((t) => `splittermond.skillAbbreviation.${t}`)
    .build();

/**
 * ONLY USE FOR TESTING PURPOSES!
 */
export function clearSkillMapper() {
    (skillMapper as any).clear();
}

export interface GenesisSpell {
    longDescription: string;
    name: string;
    id: string;
    school: string;
    schoolGrade: number;
    focus: string;
    difficulty: string;
    castRange: string;
    castDuration: string;
    spellDuration: string;
    enhancement: string;
    enhancementDescription: string;
    enhancementOptions?: string;
}

export function genesisSpellImport(genesisSpell: GenesisSpell) {
    const damage: string | null = findDamageInDescription(genesisSpell.longDescription);
    const skill: SplittermondSkill = findSkill(genesisSpell) ?? "arcanelore";
    const mappedSkill = {
        type: "spell" as const,
        name: genesisSpell.name,
        img: (splittermond.icons.spell as any)[genesisSpell.id] || splittermond.icons.spell.default,
        system: {
            description: genesisSpell.longDescription,
            skill,
            skillLevel: genesisSpell.schoolGrade,
            costs: genesisSpell.focus,
            difficulty: genesisSpell.difficulty,
            damage: { stringInput: damage },
            range: genesisSpell.castRange,
            castDuration: CastDurationModel.from(genesisSpell.castDuration).toObject(),
            effectDuration: genesisSpell.spellDuration,
            features: { internalFeatureList: [] },
            enhancementCosts: genesisSpell.enhancement,
            enhancementDescription: genesisSpell.enhancementDescription,
            degreeOfSuccessOptions: {
                castDuration: isPresentIn(genesisSpell.enhancementOptions, "Auslösezeit"),
                consumedFocus: isPresentIn(genesisSpell.enhancementOptions, "Verzehrter Fokus"),
                exhaustedFocus: isPresentIn(genesisSpell.enhancementOptions, "Erschöpfter Fokus"),
                channelizedFocus: isPresentIn(genesisSpell.enhancementOptions, "Kanalisierter Fokus"),
                effectDuration: isPresentIn(genesisSpell.enhancementOptions, "Wirkungsdauer"),
                damage: isPresentIn(genesisSpell.enhancementOptions, "Schaden"),
                range: isPresentIn(genesisSpell.enhancementOptions, "Reichweite"),
                effectArea: isPresentIn(genesisSpell.enhancementOptions, "Wirkungsbereich"),
            },
        },
    };
    const validationErrors = validateSpell(mappedSkill);
    if (validationErrors.length > 0) {
        validationErrors.forEach((error) => {
            console.error(`Splittermond | ${error}`);
        });
        return null;
    } else {
        return mappedSkill;
    }
}

function findDamageInDescription(description: string) {
    const regularDamage = /([1-9]+[wWdD][0-9]{1,2}[ \-+0-9]*)/.exec(description)?.[0];
    if (!regularDamage) {
        console.debug(
            "Splittermond | No regular damage found in spell description, searching for damage values without leading number"
        );
    }
    const damage = regularDamage ?? findDamageWithOmittedLeadingNumber(description);
    return damage?.trim() ?? null;
}

function findDamageWithOmittedLeadingNumber(description: string) {
    const damage = /([0-9]*[wWdD][0-9]{1,2}[ \-+0-9]*\s*?)/.exec(description)?.[0];
    if (!damage) {
        return null;
    } else if (/^[0-9]/.test(damage)) {
        //has leading number
        return damage;
    } else {
        return `1${damage}`;
    }
}

function findSkill(genesisSpell: GenesisSpell) {
    if (genesisSpell.school === "Arkane Kunde") {
        return "arcanelore";
    } else {
        return skillMapper().toCode(genesisSpell.school);
    }
}

function isPresentIn(enhancementOptions: string | undefined, option: string): boolean {
    const foundOption = enhancementOptions?.search(option) ?? -1; //assume no string means not present
    return foundOption >= 0;
}

type ProtoSpell = Parameters<(typeof itemCreator)["createSpell"]>[0];
function validateSpell(protoSpell: ProtoSpell) {
    const skillLevel = protoSpell.system.skillLevel;
    const spellName =
        protoSpell.name ?? foundryApi.localize("splittermond.genesisImport.spellValidation.unknownSpellName");
    const errors = [];
    if (skillLevel === null || skillLevel === undefined || skillLevel > 5 || skillLevel < 0) {
        errors.push(foundryApi.format("splittermond.genesisImport.spellValidation.invalidSkillLevel", { spellName }));
    }
    if (!protoSpell.system.costs) {
        errors.push(foundryApi.format("splittermond.genesisImport.spellValidation.invalidFokusCosts", { spellName }));
    }
    if (!validateDifficulty(protoSpell)) {
        errors.push(foundryApi.format("splittermond.genesisImport.spellValidation.invalidDifficulty", { spellName }));
    }
    try {
        new DamageModel(protoSpell.system.damage ?? { stringInput: null });
    } catch (e) {
        errors.push(foundryApi.format("splittermond.genesisImport.spellValidation.invalidDamage", { spellName }));
    }
    return errors;
}

function validateDifficulty(protoSpell: ProtoSpell): boolean {
    const difficulty = protoSpell.system.difficulty?.toLowerCase();
    const isNumber = !isNaN(Number(difficulty));
    if (difficulty && isNumber) {
        return parseInt(difficulty) >= 0;
    }
    return !difficulty || ["gw", "vtd", "kw"].includes(difficulty);
}
