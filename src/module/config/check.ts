export const rollType = {
    standard: {
        label: "splittermond.rollType.standard",
        rollFormula: "2d10",
    },
    risk: {
        label: "splittermond.rollType.risk",
        rollFormula: "4d10ri",
    },
    safety: {
        label: "splittermond.rollType.safety",
        rollFormula: "2d10kh1",
    },
    standardGrandmaster: {
        label: "splittermond.rollType.standardGrandmaster",
        rollFormula: "3d10ri",
    },
    riskGrandmaster: {
        label: "splittermond.rollType.riskGrandmaster",
        rollFormula: "5d10ri",
    },
    safetyGrandmaster: {
        label: "splittermond.rollType.safetyGrandmaster",
        rollFormula: "3d10kh1",
    },
} as const;
export type RollType = keyof typeof rollType;

export const check = {
    rollType,
    defaultDifficulty: 15,
    activeDefenseDifficulty: 15,
    degreeOfSuccess: {
        triumphBonus: 3,
        fumblePenalty: -3,
        criticalSuccessThreshold: 5,
        criticalFailureThreshold: -5,
    },
} as const;
