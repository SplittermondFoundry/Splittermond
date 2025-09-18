export const attributes = [
    "charisma",
    "agility",
    "intuition",
    "constitution",
    "mystic",
    "strength",
    "mind",
    "willpower",
] as const;
export const derivedAttributes = [
    "size",
    "speed",
    "initiative",
    "healthpoints",
    "focuspoints",
    "defense",
    "bodyresist",
    "mindresist",
] as const;

export type SplittermondAttribute = (typeof attributes)[number];
export type SplittermondDerivedAttribute = (typeof derivedAttributes)[number];
