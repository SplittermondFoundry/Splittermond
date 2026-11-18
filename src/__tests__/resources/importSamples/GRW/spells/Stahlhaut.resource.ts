export const testname = "Stahlhaut";
export const input = `
Stahlhaut (Spruch)
Schulen: Fels 4, Schutz 4
Typus: Haut, Rüstung
Schwierigkeit: 27
Kosten: K16V4
Zauberdauer: 25 Ticks
Reichweite: Zauberer
Wirkung: Die Rüstung des Zauberers wird
hart wie Stahl und schimmert metallisch. Sie erhält einen Bonus in Höhe von
jeweils 4 Punkten auf seine Verteidigung
und seine Schadensreduktion. Dieser
Zauber ist nicht Rüstungen kombinierbar die
die, die Verteidigung ebenfalls erhöhen oder den Typus
Haut besitzen.
Wirkungsdauer: kanalisiert
Erfolgsgrade:
• Auslösezeit, Kanalisierter Fokus, Verstärken (s. u.), Verzehrter Fokus
• 1 EG (Kosten +K4V4): Der Bonus auf die SR
erhöht sich auf 5 Punkte.
`;

export const expected = {
    img: "icons/svg/daze.svg",
    name: "Stahlhaut",
    system: {
        availableIn: "stonemagic 4, protectionmagic 4",
        castDuration: {
            value: 25,
            unit: "T",
            _document: null,
            triedToFindDocument: false,
        },
        costs: "K16V4",
        damage: { base: { stringInput: null }, enhanced: null },
        damageType: { base: "none", enhanced: null },
        costType: { base: "none", enhanced: null },
        effectArea: { base: null, enhanced: null },
        features: { base: { internalFeatureList: [] }, enhanced: null },
        skill: "arcanelore",
        skillLevel: null,
        source: null,
        degreeOfSuccessOptions: {
            castDuration: true,
            channelizedFocus: true,
            consumedFocus: true,
            damage: false,
            effectArea: false,
            effectDuration: false,
            exhaustedFocus: false,
            range: false,
        },
        description:
            "Die Rüstung des Zauberers wird hart wie Stahl und schimmert metallisch. Sie erhält einen Bonus in Höhe von jeweils 4 Punkten auf seine Verteidigung und seine Schadensreduktion. Dieser Zauber ist nicht Rüstungen kombinierbar die die, die Verteidigung ebenfalls erhöhen oder den Typus Haut besitzen.",
        difficulty: "27",
        effectDuration: { base: "kanalisiert", enhanced: null },
        enhancementCosts: "1 EG/+K4V4",
        enhancementDescription: "Der Bonus auf die SR erhöht sich auf 5 Punkte.",
        range: { base: "Zauberer", enhanced: null },
        spellType: "Haut, Rüstung",
    },
    type: "spell",
};
