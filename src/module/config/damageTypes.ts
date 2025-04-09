
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
    "light",
    "shadow",
    "bleeding",
    "disease",
    "wind",
    "water",
    "nature",
] as const;

export const damageTypeOptions:Record<DamageType, `splittermond.damageTypes.long.${DamageType}`> = {
    acid: "splittermond.damageTypes.long.acid",
    bleeding: "splittermond.damageTypes.long.bleeding",
    cold: "splittermond.damageTypes.long.cold",
    disease: "splittermond.damageTypes.long.disease",
    electric: "splittermond.damageTypes.long.electric",
    fire: "splittermond.damageTypes.long.fire",
    heat: "splittermond.damageTypes.long.heat",
    light: "splittermond.damageTypes.long.light",
    mental: "splittermond.damageTypes.long.mental",
    physical: "splittermond.damageTypes.long.physical",
    poison: "splittermond.damageTypes.long.poison",
    rock: "splittermond.damageTypes.long.rock",
    shadow: "splittermond.damageTypes.long.shadow",
    wind: "splittermond.damageTypes.long.wind",
    water: "splittermond.damageTypes.long.water",
    nature: "splittermond.damageTypes.long.nature",
}

export type DamageType = typeof damageTypes[number];
