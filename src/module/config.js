import SplittermondWeaponItem from "./item/weapon.js";
import SplittermondItem from "./item/item.js";
import SplittermondShieldItem from "./item/shield.js";
import SplittermondSpellItem from "./item/spell.js";
import SplittermondArmorItem from "./item/armor.js";
import SplittermondEquipmentItem from "./item/equipment.js";
import SplittermondNPCAttackItem from "./item/npcattack.js";
import SplittermondMastery from "./item/mastery.js";
import {rollType} from "./config/RollType";
import {splittermondSpellEnhancement} from "./config/SplittermondSpellEnhancements";
import {modifiers} from "./config/modifiers";

export const splittermond = {};

splittermond.heroLevel = [0, 100, 300, 600];

splittermond.attributes = ["charisma", "agility", "intuition",
    "constitution",
    "mystic",
    "strength",
    "mind",
    "willpower"];

splittermond.derivedAttributes = ["size", "speed", "initiative", "healthpoints", "focuspoints", "defense", "bodyresist", "mindresist"];
splittermond.derivedValues = splittermond.derivedAttributes;
splittermond.woundMalus = {
    "5": [
        {
            value: 0,
            label: "splittermond.woundMalusLevels.notinjured"
        },
        {
            value: -1,
            label: "splittermond.woundMalusLevels.battered"
        },
        {
            value: -2,
            label: "splittermond.woundMalusLevels.injured"
        },
        {
            value: -4,
            label: "splittermond.woundMalusLevels.badlyinjured"
        },
        {
            value: -8,
            label: "splittermond.woundMalusLevels.doomed"
        }
    ],
    "3": [
        {
            value: 0,
            label: "splittermond.woundMalusLevels.notinjured"
        },
        {
            value: -2,
            label: "splittermond.woundMalusLevels.injured"
        },
        {
            value: -8,
            label: "splittermond.woundMalusLevels.doomed"
        }
    ],
    "1": [
        {
            value: 0,
            label: "splittermond.woundMalusLevels.notinjured"
        }
    ],
};

splittermond.damageLevel = ["splittermond.damageLevels.undamaged", "splittermond.damageLevels.tarnished", "splittermond.damageLevels.demolished", "splittermond.damageLevels.destroyed"]

splittermond.skillGroups = {
    fighting: [
        "melee",
        "slashing",
        "chains",
        "blades",
        "longrange",
        "staffs",
        "throwing"],
    general: ["acrobatics",
        "alchemy",
        "leadership",
        "arcanelore",
        "athletics",
        "performance",
        "diplomacy",
        "clscraft",
        "empathy",
        "determination",
        "dexterity",
        "history",
        "craftmanship",
        "heal",
        "stealth",
        "hunting",
        "countrylore",
        "nature",
        "eloquence",
        "locksntraps",
        "swim",
        "seafaring",
        "streetlore",
        "animals",
        "survival",
        "perception",
        "endurance"],
    magic: ["antimagic",
        "controlmagic",
        "motionmagic",
        "insightmagic",
        "stonemagic",
        "firemagic",
        "healmagic",
        "illusionmagic",
        "combatmagic",
        "lightmagic",
        "naturemagic",
        "shadowmagic",
        "fatemagic",
        "protectionmagic",
        "enhancemagic",
        "deathmagic",
        "transformationmagic",
        "watermagic",
        "windmagic"]
};
splittermond.skillGroups.all = [...splittermond.skillGroups.general, ...splittermond.skillGroups.fighting, ...splittermond.skillGroups.magic];
splittermond.resources = {
    core: ["reputation",
        "contacts",
        "state",
        "wealth"],
    optional: ["following",
        "faith",
        "creature",
        "mentor",
        "relic",
        "hideaway",
        "rank"]
};

splittermond.skillAttributes = {
    "acrobatics": ["agility", "strength"],
    "alchemy": ["mystic", "mind"],
    "leadership": ["charisma", "willpower"],
    "arcanelore": ["mystic", "mind"],
    "athletics": ["agility", "strength"],
    "performance": ["charisma", "willpower"],
    "diplomacy": ["charisma", "mind"],
    "clscraft": ["intuition", "mind"],
    "empathy": ["intuition", "mind"],
    "determination": ["charisma", "willpower"],
    "dexterity": ["charisma", "agility"],
    "history": ["mystic", "mind"],
    "craftmanship": ["constitution", "mind"],
    "heal": ["intuition", "mind"],
    "stealth": ["agility", "intuition"],
    "hunting": ["constitution", "mind"],
    "countrylore": ["intuition", "mind"],
    "nature": ["intuition", "mind"],
    "eloquence": ["charisma", "willpower"],
    "locksntraps": ["intuition", "agility"],
    "swim": ["strength", "constitution"],
    "seafaring": ["agility", "constitution"],
    "streetlore": ["charisma", "intuition"],
    "animals": ["charisma", "agility"],
    "survival": ["intuition", "constitution"],
    "perception": ["intuition", "willpower"],
    "endurance": ["constitution", "willpower"],
    "antimagic": ["mystic", "willpower"],
    "controlmagic": ["mystic", "willpower"],
    "motionmagic": ["mystic", "agility"],
    "insightmagic": ["mystic", "mind"],
    "stonemagic": ["mystic", "constitution"],
    "firemagic": ["mystic", "charisma"],
    "healmagic": ["mystic", "charisma"],
    "illusionmagic": ["mystic", "charisma"],
    "combatmagic": ["mystic", "strength"],
    "lightmagic": ["mystic", "charisma"],
    "naturemagic": ["mystic", "charisma"],
    "shadowmagic": ["mystic", "intuition"],
    "fatemagic": ["mystic", "charisma"],
    "protectionmagic": ["mystic", "charisma"],
    "enhancemagic": ["mystic", "strength"],
    "deathmagic": ["mystic", "mind"],
    "transformationmagic": ["mystic", "constitution"],
    "watermagic": ["mystic", "intuition"],
    "windmagic": ["mystic", "mind"]
};
splittermond.rollType = rollType;

splittermond.complexityOptions = {
    U: "splittermond.complexityOptions.untrained",
    G: "splittermond.complexityOptions.journeyman",
    F: "splittermond.complexityOptions.expert",
    M: "splittermond.complexityOptions.master",
    A: "splittermond.complexityOptions.instruction",
};

splittermond.availabilityOptions = {
    village: "splittermond.availabilityOptions.village",
    town: "splittermond.availabilityOptions.town",
    city: "splittermond.availabilityOptions.city",
    metropolis: "splittermond.availabilityOptions.metropolis",
};

splittermond.fightingSkillOptions = {
    melee: "splittermond.skillLabel.melee",
    slashing: "splittermond.skillLabel.slashing",
    chains: "splittermond.skillLabel.chains",
    blades: "splittermond.skillLabel.blades",
    longrange: "splittermond.skillLabel.longrange",
    staffs: "splittermond.skillLabel.staffs",
    throwing: "splittermond.skillLabel.throwing"
};

splittermond.meleeFightingSkillOptions = {
    melee: "splittermond.skillLabel.melee",
    slashing: "splittermond.skillLabel.slashing",
    chains: "splittermond.skillLabel.chains",
    blades: "splittermond.skillLabel.blades",
    staffs: "splittermond.skillLabel.staffs"
};

splittermond.attributeOptions = {
    charisma: "splittermond.attribute.charisma.long",
    agility: "splittermond.attribute.agility.long",
    intuition: "splittermond.attribute.intuition.long",
    constitution: "splittermond.attribute.constitution.long",
    mystic: "splittermond.attribute.mystic.long",
    strength: "splittermond.attribute.strength.long",
    mind: "splittermond.attribute.mind.long",
    willpower: "splittermond.attribute.willpower.long",
};

splittermond.spellSkillsOption = {
    "arcanelore": "splittermond.skillLabel.arcanelore",
    "antimagic": "splittermond.skillLabel.antimagic",
    "controlmagic": "splittermond.skillLabel.controlmagic",
    "motionmagic": "splittermond.skillLabel.motionmagic",
    "insightmagic": "splittermond.skillLabel.insightmagic",
    "stonemagic": "splittermond.skillLabel.stonemagic",
    "firemagic": "splittermond.skillLabel.firemagic",
    "healmagic": "splittermond.skillLabel.healmagic",
    "illusionmagic": "splittermond.skillLabel.illusionmagic",
    "combatmagic": "splittermond.skillLabel.combatmagic",
    "lightmagic": "splittermond.skillLabel.lightmagic",
    "naturemagic": "splittermond.skillLabel.naturemagic",
    "shadowmagic": "splittermond.skillLabel.shadowmagic",
    "fatemagic": "splittermond.skillLabel.fatemagic",
    "protectionmagic": "splittermond.skillLabel.protectionmagic",
    "enhancemagic": "splittermond.skillLabel.enhancemagic",
    "deathmagic": "splittermond.skillLabel.deathmagic",
    "transformationmagic": "splittermond.skillLabel.transformationmagic",
    "watermagic": "splittermond.skillLabel.watermagic",
    "windmagic": "splittermond.skillLabel.windmagic"
};

splittermond.masterySkillsOption = {
    "melee": "splittermond.skillLabel.melee",
    "slashing": "splittermond.skillLabel.slashing",
    "chains": "splittermond.skillLabel.chains",
    "blades": "splittermond.skillLabel.blades",
    "longrange": "splittermond.skillLabel.longrange",
    "staffs": "splittermond.skillLabel.staffs",
    "throwing": "splittermond.skillLabel.throwing",
    "acrobatics": "splittermond.skillLabel.acrobatics",
    "alchemy": "splittermond.skillLabel.alchemy",
    "leadership": "splittermond.skillLabel.leadership",
    "arcanelore": "splittermond.skillLabel.arcanelore",
    "athletics": "splittermond.skillLabel.athletics",
    "performance": "splittermond.skillLabel.performance",
    "diplomacy": "splittermond.skillLabel.diplomacy",
    "clscraft": "splittermond.skillLabel.clscraft",
    "empathy": "splittermond.skillLabel.empathy",
    "determination": "splittermond.skillLabel.determination",
    "dexterity": "splittermond.skillLabel.dexterity",
    "history": "splittermond.skillLabel.history",
    "craftmanship": "splittermond.skillLabel.craftmanship",
    "heal": "splittermond.skillLabel.heal",
    "stealth": "splittermond.skillLabel.stealth",
    "hunting": "splittermond.skillLabel.hunting",
    "countrylore": "splittermond.skillLabel.countrylore",
    "nature": "splittermond.skillLabel.nature",
    "eloquence": "splittermond.skillLabel.eloquence",
    "locksntraps": "splittermond.skillLabel.locksntraps",
    "swim": "splittermond.skillLabel.swim",
    "seafaring": "splittermond.skillLabel.seafaring",
    "streetlore": "splittermond.skillLabel.streetlore",
    "animals": "splittermond.skillLabel.animals",
    "survival": "splittermond.skillLabel.survival",
    "perception": "splittermond.skillLabel.perception",
    "endurance": "splittermond.skillLabel.endurance",
    "antimagic": "splittermond.skillLabel.antimagic",
    "controlmagic": "splittermond.skillLabel.controlmagic",
    "motionmagic": "splittermond.skillLabel.motionmagic",
    "insightmagic": "splittermond.skillLabel.insightmagic",
    "stonemagic": "splittermond.skillLabel.stonemagic",
    "firemagic": "splittermond.skillLabel.firemagic",
    "healmagic": "splittermond.skillLabel.healmagic",
    "illusionmagic": "splittermond.skillLabel.illusionmagic",
    "combatmagic": "splittermond.skillLabel.combatmagic",
    "lightmagic": "splittermond.skillLabel.lightmagic",
    "naturemagic": "splittermond.skillLabel.naturemagic",
    "shadowmagic": "splittermond.skillLabel.shadowmagic",
    "fatemagic": "splittermond.skillLabel.fatemagic",
    "protectionmagic": "splittermond.skillLabel.protectionmagic",
    "enhancemagic": "splittermond.skillLabel.enhancemagic",
    "deathmagic": "splittermond.skillLabel.deathmagic",
    "transformationmagic": "splittermond.skillLabel.transformationmagic",
    "watermagic": "splittermond.skillLabel.watermagic",
    "windmagic": "splittermond.skillLabel.windmagic",
    "none": "splittermond.skillLabel.none"
};

splittermond.displayOptions = {
    itemSheet: {
        default: {
            height: 800,
            width: 600
        },
        projectile: {
            height: 200,
            width: 600
        },
        strength: {
            height: 430,
            width: 600
        },
        mastery: {
            height: 430,
            width: 600
        },
        species: {
            height: 300,
            width: 600
        },
        statuseffect: {
            height: 500,
            width: 600
        },
        moonsign: {
            height: 300,
            width: 600
        }
    }
}

/**
 * @typedef SplittermondItemSheetProperties
 * @type {[{groupName: string, properties: [InputItemProperty|ItemSheetPropertyDisplayProperty]}]}
 */
/**
 * @typedef ItemSheetPropertyDisplayProperty
 * @type {{field: !string, template: "readonly"|"readonlyLocalize"|"input"|"select"|"bool"|"inputNumberWithSpinner", label: string, help: ?string}}
 */
/**
 * @typedef InputItemProperty
 * @type {ItemSheetPropertyDisplayProperty & {template: "input", placeholderText: label: string}}
*/

splittermond.itemSheetProperties = {
    species: [
        {
            groupName: "splittermond.general",
            /**
             * @type SplittermondItemSheetProperties
             */
            properties: [
                {
                    field: "system.size",
                    label: "splittermond.derivedAttribute.size.long",
                    template: "input"
                },
                {
                    field: "system.attributeMod",
                    label: "splittermond.attributeModifiers",
                    template: "input"
                },
                {
                    field: "system.strengths",
                    label: "splittermond.strengths",
                    template: "input"
                }
            ]
        }

    ],
    mastery: [
        {
            groupName: "splittermond.general",
            properties: [
                {
                    field: "availableIn",
                    placeholderText: "splittermond.masteryAvailableInPlaceholderText",
                    label: "splittermond.availableIn",
                    template: "input"
                },
                {
                    field: "system.skill",
                    label: "splittermond.skill",
                    template: "select",
                    choices: splittermond.masterySkillsOption
                },
                {
                    field: "system.level",
                    label: "splittermond.masteryItem.level",
                    template: "input"
                },
                {
                    field: "system.modifier",
                    label: "splittermond.modifier",
                    template: "input",
                    help: "splittermond.modificatorHelpText"
                },
                {
                    field: "system.isManeuver",
                    label: "splittermond.maneuver",
                    template: "bool",
                },
                {
                    field: "system.isGrandmaster",
                    label: "splittermond.grandmaster",
                    template: "bool",
                }]
        }
    ],
    strength: [
        {
            groupName: "splittermond.general",
            properties: [
                {
                    field: "system.quantity",
                    label: "splittermond.quantity",
                    template: "input"
                },
                {
                    field: "system.level",
                    label: "splittermond.strengthItem.level",
                    template: "input"
                },
                {
                    field: "system.modifier",
                    label: "splittermond.modifier",
                    template: "input",
                    help: "splittermond.modificatorHelpText"
                },
                {
                    field: "system.multiSelectable",
                    label: "splittermond.multiSelectable",
                    template: "bool"
                },
                {
                    field: "system.onCreationOnly",
                    label: "splittermond.onCreationOnly",
                    template: "bool"
                }
            ]
        }
    ],
    statuseffect: [
        {
            groupName: "splittermond.general",
            properties: [
                {
                    field: "system.level",
                    label: "splittermond.level",
                    template: "input"
                },
                {
                    field: "system.startTick",
                    label: "splittermond.combatEffect.statusEffect.startTick",
                    template: "input"
                },
                {
                    field: "system.interval",
                    label: "splittermond.combatEffect.statusEffect.interval",
                    template: "input"
                },
                {
                    field: "system.times",
                    label: "splittermond.combatEffect.statusEffect.times",
                    template: "input"
                },
                {
                    field: "system.modifier",
                    label: "splittermond.modifier",
                    template: "input",
                    help: "splittermond.modificatorHelpText"
                }
            ]
        }

    ],
    spelleffect: [
        {
            groupName: "splittermond.general",
            properties: [
                {
                    field: "system.active",
                    label: "splittermond.active",
                    template: "bool"
                },
                {
                    field: "system.modifier",
                    label: "splittermond.modifier",
                    template: "input",
                    help: "splittermond.modificatorHelpText"
                }
            ]
        }

    ],
    equipment: [
        {
            groupName: "splittermond.physicalProperties",
            properties: [
                {
                    field: "system.quantity",
                    label: "splittermond.quantity",
                    template: "inputNumberWithSpinner"
                },
                {
                    field: "system.price",
                    label: "splittermond.price",
                    template: "input"
                },
                {
                    field: "system.weight",
                    label: "splittermond.load",
                    template: "inputNumberWithSpinner"
                },
                {
                    field: "system.hardness",
                    label: "splittermond.hardness",
                    template: "inputNumberWithSpinner"
                },
                {
                    field: "system.durability",
                    label: "splittermond.durability",
                    template: "readonly"
                },
                {
                    field: "system.sufferedDamage",
                    label: "splittermond.sufferedDamage",
                    template: "inputNumberWithSpinner"
                },
                {
                    field: "system.damageLevelText",
                    label: "splittermond.damageLevel",
                    template: "readonlyLocalize"
                },
                {
                    field: "system.complexity",
                    label: "splittermond.complexity",
                    template: "select",
                    choices: splittermond.complexityOptions
                },
                {
                    field: "system.availability",
                    label: "splittermond.availability",
                    template: "select",
                    choices: splittermond.availabilityOptions
                },
                {
                    field: "system.quality",
                    label: "splittermond.quality",
                    template: "input"
                },
                {
                    field: "system.modifier",
                    label: "splittermond.modifier",
                    template: "input",
                    help: "splittermond.modificatorHelpText"
                }
            ]
        }
    ],
    culturelore: [
        {
            groupName: "splittermond.general",
            properties: [
                {
                    field: "system.modifier",
                    label: "splittermond.modifier",
                    template: "input",
                    help: "splittermond.modificatorHelpText"
                }
            ]
        }
    ]
};

/**
 * @type SplittermondItemSheetProperties
 */
splittermond.itemSheetProperties.weapon = [
    ...splittermond.itemSheetProperties.equipment,
    {
        groupName: "splittermond.weaponProperties",
        properties: [
            {
                field: "system.skill",
                label: "splittermond.fightingSkill",
                template: "select",
                choices: splittermond.fightingSkillOptions
            },
            {
                field: "system.skillMod",
                label: "splittermond.skillMod",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.attribute1",
                label: "splittermond.attributes",
                template: "select",
                choices: splittermond.attributeOptions
            },
            {
                field: "system.attribute2",
                label: "",
                template: "select",
                choices: splittermond.attributeOptions
            },
            {
                field: "system.damage",
                label: "splittermond.damage",
                template: "input"
            },
            {
                field: "system.range",
                label: "splittermond.range",
                template: "input"
            },
            {
                field: "system.weaponSpeed",
                label: "splittermond.weaponSpeed",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.minAttributes",
                label: "splittermond.minAttributes",
                template: "input",
                help: "splittermond.minAttributesHelpText"
            },
            {
                field: "system.features",
                label: "splittermond.features",
                template: "input"
            }
        ]
    },
    {
        groupName: "splittermond.secondaryWeaponProperties",
        properties: [
            {
                field: "system.secondaryAttack.skill",
                label: "splittermond.fightingSkill",
                template: "select",
                choices: { none: "splittermond.skillLabel.none", ...splittermond.fightingSkillOptions }
            },
            {
                field: "system.secondaryAttack.skillMod",
                label: "splittermond.skillMod",
                template: "input"
            },
            {
                field: "system.secondaryAttack.attribute1",
                label: "splittermond.attributes",
                template: "select",
                choices: splittermond.attributeOptions
            },
            {
                field: "system.secondaryAttack.attribute2",
                label: "",
                template: "select",
                choices: splittermond.attributeOptions
            },
            {
                field: "system.secondaryAttack.damage",
                label: "splittermond.damage",
                template: "input"
            },
            {
                field: "system.secondaryAttack.range",
                label: "splittermond.range",
                template: "input"
            },
            {
                field: "system.secondaryAttack.weaponSpeed",
                label: "splittermond.weaponSpeed",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.secondaryAttack.minAttributes",
                label: "splittermond.minAttributes",
                template: "input"
            },
            {
                field: "system.secondaryAttack.features",
                label: "splittermond.features",
                template: "input"
            }
        ]
    }
]

/**
 * @type SplittermondItemSheetProperties
 */
splittermond.itemSheetProperties.armor = [
    ...splittermond.itemSheetProperties.equipment,
    {
        groupName: "splittermond.armorProperties",
        properties: [
            {
                field: "system.tickMalus",
                label: "splittermond.tickMalus",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.defenseBonus",
                label: "splittermond.defenseBonus",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.handicap",
                label: "splittermond.handicap",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.damageReduction",
                label: "splittermond.damageReduction",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.minStr",
                label: "splittermond.minStrength",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.features",
                label: "splittermond.features",
                template: "input"
            }
        ]
    }
];

/**
 * @type SplittermondItemSheetProperties
 */
splittermond.itemSheetProperties.shield = [
    ...splittermond.itemSheetProperties.equipment,
    {
        groupName: "splittermond.shieldProperties",
        properties: [
            {
                field: "system.skill",
                label: "splittermond.fightingSkill",
                template: "select",
                choices: splittermond.meleeFightingSkillOptions
            },
            {
                field: "system.tickMalus",
                label: "splittermond.tickMalus",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.defenseBonus",
                label: "splittermond.defenseBonus",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.handicap",
                label: "splittermond.handicap",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.minAttributes",
                label: "splittermond.minAttributes",
                template: "input",
                help: "splittermond.minAttributesHelpText"
            },
            {
                field: "system.features",
                label: "splittermond.features",
                template: "input"
            }
        ]
    }
];
splittermond.itemSheetProperties.spell = [
    {
        groupName: "splittermond.generalProperties",
        properties: [
            {
                field: "availableIn",
                placeholderText: "splittermond.spellAvailableInPlaceholderText",
                label: "splittermond.availableIn",
                template: "input"
            },
            {
                field: "system.skill",
                label: "splittermond.skill",
                template: "select",
                choices: splittermond.spellSkillsOption
            },
            {
                field: "system.skillLevel",
                label: "splittermond.spellLevel",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.spellType",
                label: "splittermond.spellType",
                placeholderText: "splittermond.spellTypePlaceholderText",
                template: "input"
            },
            {
                field: "system.costs",
                label: "splittermond.focusCosts",
                placeholderText: "splittermond.focusCostsPlaceholderText",
                template: "input"
            },
            {
                field: "system.difficulty",
                label: "splittermond.difficulty",
                template: "input"
            },
            {
                field: "system.damage",
                label: "splittermond.damage",
                template: "input"
            },
            {
                field: "system.range",
                label: "splittermond.range",
                template: "input"
            },
            {
                field: "system.castDuration",
                label: "splittermond.castDuration",
                template: "input"
            },
            {
                field: "system.effectDuration",
                label: "splittermond.effectDuration",
                template: "input"
            },
            {
                field: "system.effectArea",
                label: "splittermond.effectArea",
                template: "input"
            },
            {
                field: "system.enhancementCosts",
                label: "splittermond.enhancementCosts",
                template: "input"
            },
            {
                field: "system.enhancementDescription",
                label: "splittermond.enhancementDescription",
                template: "input"
            },
            {
                field: "system.features",
                label: "splittermond.features",
                template: "input"
            }
        ]
    },
    {
        groupName: "splittermond.degreeOfSuccessOptionsHeader",
        properties: [
            {
                field: "system.degreeOfSuccessOptions.castDuration",
                label: "splittermond.degreeOfSuccessOptions.castDuration",
                template: "bool"
            },
            {
                field: "system.degreeOfSuccessOptions.consumedFocus",
                label: "splittermond.degreeOfSuccessOptions.consumedFocus",
                template: "bool"
            },
            {
                field: "system.degreeOfSuccessOptions.exhaustedFocus",
                label: "splittermond.degreeOfSuccessOptions.exhaustedFocus",
                template: "bool"
            },
            {
                field: "system.degreeOfSuccessOptions.channelizedFocus",
                label: "splittermond.degreeOfSuccessOptions.channelizedFocus",
                template: "bool"
            },
            {
                field: "system.degreeOfSuccessOptions.effectDuration",
                label: "splittermond.degreeOfSuccessOptions.effectDuration",
                template: "bool"
            },
            {
                field: "system.degreeOfSuccessOptions.damage",
                label: "splittermond.degreeOfSuccessOptions.damage",
                template: "bool"
            },
            {
                field: "system.degreeOfSuccessOptions.range",
                label: "splittermond.degreeOfSuccessOptions.range",
                template: "bool"
            },
            {
                field: "system.degreeOfSuccessOptions.effectArea",
                label: "splittermond.degreeOfSuccessOptions.effectArea",
                template: "bool"
            }
        ]
    }
];

splittermond.itemSheetProperties.npcfeature = [
    {
        groupName: "splittermond.generalProperties",
        properties: [
            {
                field: "system.modifier",
                label: "splittermond.modifier",
                template: "input",
                help: "splittermond.modificatorHelpText"
            }
        ]
    }
];

splittermond.itemSheetProperties.moonsign = [
    {
        groupName: "splittermond.generalProperties",
        properties: [
            {
                field: "system.enhancement",
                label: "splittermond.enhancementDescription",
                template: "input"
            },
            {
                field: "system.secretGift",
                label: "splittermond.secretGift",
                template: "input"
            }
        ]
    }
];

splittermond.itemSheetProperties.npcattack = [
    {
        groupName: "splittermond.weaponProperties",
        properties: [
            {
                field: "system.skillValue",
                label: "splittermond.skillValue",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.damage",
                label: "splittermond.damage",
                template: "input"
            },
            {
                field: "system.range",
                label: "splittermond.range",
                template: "input"
            },
            {
                field: "system.weaponSpeed",
                label: "splittermond.weaponSpeed",
                template: "inputNumberWithSpinner"
            },
            {
                field: "system.features",
                label: "splittermond.features",
                template: "input"
            }
        ]
    }
];

splittermond.icons = {
    equipment: {
        default: "icons/svg/chest.svg"
    },
    shield: {
        default: "icons/svg/shield.svg"
    },
    armor: {
        default: "icons/svg/statue.svg"
    },
    weapon: {
        default: "icons/svg/sword.svg"
    },
    spell: {
        default: "icons/svg/daze.svg"
    }
};

splittermond.modifier = modifiers;

splittermond.fumbleTable = {
    fight: [
        {
            min: 1,
            max: 1,
            text: "splittermond.fumbleTable.fight.result1_1"
        },
        {
            min: 2,
            max: 3,
            text: "splittermond.fumbleTable.fight.result2_3"
        },
        {
            min: 4,
            max: 6,
            text: "splittermond.fumbleTable.fight.result4_6"
        },
        {
            min: 7,
            max: 9,
            text: "splittermond.fumbleTable.fight.result7_8"
        },
        {
            min: 10,
            max: 12,
            text: "splittermond.fumbleTable.fight.result10_12"
        },
        {
            min: 13,
            max: 15,
            text: "splittermond.fumbleTable.fight.result13_15"
        },
        {
            min: 16,
            max: 18,
            text: "splittermond.fumbleTable.fight.result16_18"
        },
        {
            min: 19,
            max: 20,
            text: "splittermond.fumbleTable.fight.result19_20"
        }
    ],
    magic: {
        sorcerer: [
            {
                min: 1,
                max: 2,
                text: "splittermond.fumbleTable.magic.sorcerer.result1_2"
            },
            {
                min: 3,
                max: 20,
                text: "splittermond.fumbleTable.magic.sorcerer.result3_20"
            },
            {
                min: 21,
                max: 35,
                text: "splittermond.fumbleTable.magic.sorcerer.result21_35"
            },
            {
                min: 36,
                max: 70,
                text: "splittermond.fumbleTable.magic.sorcerer.result36_70"
            },
            {
                min: 71,
                max: 100,
                text: "splittermond.fumbleTable.magic.sorcerer.result71_100"
            },
            {
                min: 101,
                max: 130,
                text: "splittermond.fumbleTable.magic.sorcerer.result101_130"
            },
            {
                min: 131,
                max: 175,
                text: "splittermond.fumbleTable.magic.sorcerer.result131_175"
            },
            {
                min: 176,
                max: 250,
                text: "splittermond.fumbleTable.magic.sorcerer.result176_250"
            },
            {
                min: 251,
                max: Infinity,
                text: "splittermond.fumbleTable.magic.sorcerer.result251"
            }
        ],
        priest: [
            {
                min: 1,
                max: 2,
                text: "splittermond.fumbleTable.magic.priest.result1_2"
            },
            {
                min: 3,
                max: 20,
                text: "splittermond.fumbleTable.magic.sorcerer.result3_20"
            },
            {
                min: 21,
                max: 35,
                text: "splittermond.fumbleTable.magic.priest.result21_35"
            },
            {
                min: 36,
                max: 70,
                text: "splittermond.fumbleTable.magic.priest.result36_70"
            },
            {
                min: 71,
                max: 100,
                text: "splittermond.fumbleTable.magic.priest.result71_100"
            },
            {
                min: 101,
                max: 130,
                text: "splittermond.fumbleTable.magic.priest.result101_130"
            },
            {
                min: 131,
                max: Infinity,
                text: "splittermond.fumbleTable.magic.priest.result131"
            }
        ]
    }
};

splittermond.weaponFeatures = [ "Ablenkend",
                                "Auslöser",
                                "Deckung",
                                "Defensiv",
                                "Detonation",
                                "Doppelwaffe",
                                "Dornen",
                                "Durchdringung",
                                "Entwaffnend",
                                "Entwaffnungsimmunität",
                                "Entwaffnungsschutz",
                                "Exakt",
                                "Ferndistanz",
                                "Freihändig",
                                "Gehärtet",
                                "Improvisiert",
                                "Kälteschutz",
                                "Kletterhilfe",
                                "Kritisch",
                                "Lange Waffe",
                                "Nahkampftauglich",
                                "Paarwaffe",
                                "Parierwaffe",
                                "Primitiv",
                                "Reiterrüstung",
                                "Reiterschild",
                                "Reiterwaffe",
                                "Rückkehrend",
                                "Rückstoß",
                                "Schadensschwund",
                                "Scharf",
                                "Schildwall",
                                "Stabil",
                                "Behinderung",
                                "Standfestigkeit",
                                "Stumpf",
                                "Teilbar",
                                "Treffsicher",
                                "Umklammern",
                                "Umwerfend",
                                "Unauffällig",
                                "Unhandlich",
                                "Vielseitig",
                                "Wattiert",
                                "Wuchtig",
                                "Wurffähig",
                                "Wurfkörper",
                                "Zerbrechlich",
                                "Zweihändig"
                            ];
splittermond.spellEnhancement = splittermondSpellEnhancement;
splittermond.degreeOfSuccessThresholds = {
    critical : 5
}
