export const ACTION_EFFECT_TYPES = ["modifier", "spellEffect", "spellEnhancedEffect", "attackEffect"] as const;
export type EffectType = (typeof ACTION_EFFECT_TYPES)[number];
