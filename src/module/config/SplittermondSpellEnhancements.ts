export type SplittermondSpellEnhancements = typeof splittermondSpellEnhancement;
export const splittermondSpellEnhancement = {
    castDuration: {
        degreesOfSuccess: 3,
        textTemplate: "splittermond.degreeOfSuccessOptions.castDuration",
        focusCostReduction: "0",
        castDurationReduction: 1, //TODO: check
        damageIncrease: 0,
    },
    exhaustedFocus: {
        degreesOfSuccess: 1,
        textTemplate: "splittermond.degreeOfSuccessOptions.exhaustedFocus",
        focusCostReduction: "1",
        castDurationReduction: 0,
        damageIncrease: 0,
    },
    channelizedFocus: {
        degreesOfSuccess: 2,
        textTemplate: "splittermond.degreeOfSuccessOptions.channelizedFocus",
        focusCostReduction: "K1",
        castDurationReduction: 0,
        damageIncrease: 0,
    },
    consumedFocus: {
        degreesOfSuccess: 3,
        textTemplate: "splittermond.degreeOfSuccessOptions.consumedFocus",
        focusCostReduction: "1V1",
        castDurationReduction: 0,
        damageIncrease: 0,
    },
    range: {
        degreesOfSuccess: 1,
        textTemplate: "splittermond.degreeOfSuccessOptions.range",
        focusCostReduction: "0",
        castDurationReduction: 0,
        damageIncrease: 0,
    },
    damage: {
        degreesOfSuccess: 1,
        textTemplate: "splittermond.degreeOfSuccessOptions.damage",
        focusCostReduction: "0",
        castDurationReduction: 0,
        damageIncrease: 1,
    },
    effectArea: {
        degreesOfSuccess: 3,
        textTemplate: "splittermond.degreeOfSuccessOptions.effectArea",
        focusCostReduction: "0",
        castDurationReduction: 0,
        damageIncrease: 0,
    },
    effectDuration: {
        degreesOfSuccess: 2,
        textTemplate: "splittermond.degreeOfSuccessOptions.effectDuration",
        focusCostReduction: "0",
        castDurationReduction: 0,
        damageIncrease: 0,
    },
} as const;
