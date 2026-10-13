export interface FeatureTarget {
    name: string;
    type: "weapon" | "armor" | "shield";
}

const excludedFeatures = [
    "Behinderung",
    "Erhöhte Schadensreduktion",
    "Erhöhter Waffenschaden",
    "Reduzierte Behinderung",
    "Reduzierter Tick-Zuschlag",
    "Reduzierte Last",
    "Erhöhte Härte",
];

const featureTypes: Readonly<Record<string, readonly FeatureTarget["type"][]>> = {
    Gehärtet: ["armor", "shield"],
    Stabil: ["armor"],
    Wattiert: ["armor"],
    Bequem: ["armor"],
    Standfestigkeit: ["armor"],
    Halterung: ["shield"],
    Deckung: ["shield"],
    Dornen: ["shield"],
    Schildwall: ["shield"],
    "Verbesserter Entwaffnungsschutz": ["weapon"],
    "Reduzierte Waffengeschwindigkeit": ["weapon"],
    "Verbesserte Schärfe": ["weapon"],
    "Verbesserter Kritischer Schaden": ["weapon"],
    "Verbesserte Exaktheit": ["weapon"],
    Ferndistanz: ["weapon"],
    Paarwaffe: ["weapon"],
    Treffsicher: ["weapon"],
    "Verbessertes Ablenken": ["weapon"],
    "Verbesserte Defensive": ["weapon", "shield"],
};

export function isFeatureAvailable(feature: string, type?: FeatureTarget["type"]): boolean {
    return (
        !excludedFeatures.includes(feature) && (!type || !featureTypes[feature] || featureTypes[feature].includes(type))
    );
}
