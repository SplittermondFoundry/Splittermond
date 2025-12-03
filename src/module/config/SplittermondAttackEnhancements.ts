export const splittermondAttackEnhancements = {
    interruptingAttack: {
        cost: 1,
        bonusOnInterruption: 3,
        textTemplate: "splittermond.chatCard.attackMessage.interruptingAttack",
    },
    range: {
        cost: 1,
        textTemplate: "splittermond.degreeOfSuccessOptions.range",
    },
    criticalSuccess: {
        weaponspeedReduction: 1,
    },
} as const;
