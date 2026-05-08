export const MODIFIER_TYPES = ["modifier", "inverseModifier", "multiplicativeModifier"] as const;
export const COST_MODIFIER_TYPES = ["costModifier"] as const;

export type EffectType = (typeof MODIFIER_TYPES)[number] | (typeof COST_MODIFIER_TYPES)[number];
