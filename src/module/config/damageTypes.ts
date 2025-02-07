export const damageTypes = [
    "physical",
    "mental",
    "electric",
    "acid",
    "rock",
    "fire",
    "heat",
    "cold",
    "poison",
    "bleeding",
    "disease"
] as const;
export type DamageTypes = typeof damageTypes[number];