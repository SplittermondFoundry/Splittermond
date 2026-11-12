interface FeatureAdjustment {
    kind: "feature" | "sharpness" | "speed" | "handicap" | "skill" | "resistance" | "manual";
    hint?: string;
    target?: string;
    increment?: number;
    countMax?: number;
}

// MSK pp. 90-93. Quality improvements are labels, not consumers of their mechanical effects.
const adjustments: Readonly<Record<string, FeatureAdjustment>> = {
    "Verbesserte Defensive": { kind: "feature", target: "Defensiv", increment: 1, hint: "defensive" },
    "Verbesserte Exaktheit": { kind: "feature", target: "Exakt", increment: 1, hint: "exact" },
    "Verbesserte Schärfe": { kind: "sharpness", target: "Scharf" },
    "Verbesserter Entwaffnungsschutz": {
        kind: "feature",
        target: "Entwaffnungsschutz",
        increment: 1,
        countMax: 2,
    },
    "Verbesserter Kritischer Schaden": { kind: "feature", target: "Kritisch", increment: 2 },
    "Verbessertes Ablenken": { kind: "feature", target: "Ablenkend", increment: 1 },
    "Reduzierte Waffengeschwindigkeit": { kind: "speed" },
    Gehärtet: { kind: "manual", hint: "hardened" },
    Stabil: { kind: "manual", hint: "stable" },
    Standfestigkeit: { kind: "manual", hint: "steadfast" },
    Wattiert: { kind: "manual", hint: "padded" },
    Kälteschutz: { kind: "handicap", countMax: 2, hint: "cold" },
    Fertigkeitsbonus: { kind: "skill", countMax: 3 },
    "Schutz vor Schadensarten": { kind: "resistance", countMax: 3 },
};

export function featureAdjustment(feature: string | undefined): FeatureAdjustment | undefined {
    const name = Object.keys(adjustments).find((name) => name.toLowerCase() === feature?.trim().toLowerCase());
    return name ? adjustments[name] : undefined;
}

export function validFeatureCount(feature: string, value: string): boolean {
    const adjustment = featureAdjustment(feature);
    if (!adjustment?.countMax) return true;
    const count = Number(value);
    return Number.isInteger(count) && count >= 1 && count <= adjustment.countMax;
}
