
const fightingSkills = [
        "melee",
        "slashing",
        "chains",
        "blades",
        "longrange",
        "staffs",
        "throwing"] as const ;
const generalSkills = ["acrobatics",
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
    "endurance"] as const;
const magicSkills = ["antimagic",
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
        "windmagic"] as const;
export const skillGroups ={
    fighting : fightingSkills,
    general: generalSkills,
    magic: magicSkills,
    all: [...generalSkills, ...fightingSkills, ...magicSkills]
} as const;

export type SplittermondMagicSkill = typeof skillGroups["magic"][number];
export type SplittermondFightingSkill = typeof skillGroups["fighting"][number];
export type SplittermondGeneralSkill = typeof skillGroups["general"][number];
export type SplittermondSkill = SplittermondFightingSkill | SplittermondGeneralSkill | SplittermondMagicSkill;
