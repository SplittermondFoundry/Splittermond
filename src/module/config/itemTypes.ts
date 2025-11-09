export type ItemType = (typeof itemTypes)[number];
export const itemTypes = [
    "weapon",
    "projectile",
    "equipment",
    "shield",
    "armor",
    "spell",
    "strength",
    "weakness",
    "mastery",
    "species",
    "culture",
    "ancestry",
    "education",
    "resource",
    "npcfeature",
    "moonsign",
    "language",
    "culturelore",
    "statuseffect",
    "spelleffect",
    "npcattack",
] as const;
const prohibitedForCharacter = [
    "projectile",
    "species",
    "culture",
    "ancestry",
    "education",
    "npcfeature",
    "moonsign",
    "language",
    "npcattack",
];
const allowedForNpc = [
    "mastery",
    "npcfeature",
    "spell",
    "weapon",
    "equipment",
    "shield",
    "armor",
    "statuseffect",
    "spelleffect",
    "npcattack",
];

export const droppableCharacterItemTypes = itemTypes.filter((i) => !prohibitedForCharacter.includes(i));
export const droppableNpcItemTypes = itemTypes.filter((i) => allowedForNpc.includes(i));
