export const testname = "Regenbogenschwinge";
export const input = `Regenbogenschwinge (groß)
 AUS 
4,
 GK
 8
 BEW INT KON MYS STÄ VER WIL 
5
 GSW 
6
 LP
 4
 FO
 6
 VTD
 7
 SR
 3
 5
 KW GW
 8/12
 13
 22
 Waffen Wert Schaden WGS
 Biss
 24
 2W6+2
 30
 7 Ticks
 Klauen
 24
 2W10+2 9 Ticks
 2
 INI
 28
 27
 Merkmale
 4-1W6
 4-1W6
 Schattenjäger (S. 46) werden zu Hundertflatterern, eine 
bunte Wolke von Schmetterlingen, die als Schwarmintel
ligenz agieren und unter den Pfoten eines Helden zu 
einem schwimmendem, fliegenden „Teppich“ verschmelzen. 
Ein Hundertflatterer kann Lebewesen bis zu einer Gesamt
GK von 6 tragen (also zwei Knilche, aber nur einen Men
schen oder Vürg).
 Scharf 2
 Scharf 2, 
Durchdrin
gung 2
 Typus: Feenwesen, Lichtwesen, Reittier
 Monstergrad: 3 / 3
 Fertigkeiten: Akrobatik 21, Athletik 16, Entschlossenheit 20, 
Heimlichkeit 10, Wahrnehmung 18, Zähigkeit 20, Lichtmagie 20
 Zauber: Licht I: Lichtkugel; II: Gleißender Schild; III: Lichtblitz
 Meisterschaften: Handgemenge (I: Abdrängen, Vorstürmen; II: 
Rundumschlag)
 Merkmale: Feenblut, Fliegend, Koloss 2 (Biss, Klauen)
 Beute: Regenbogenleder (25 Lunare; Jagdkunst gg. 25)`;

export const expected = {
    system: {
        attributes: {
            agility: {
                value: 5,
            },
            charisma: {
                value: 4,
            },
            constitution: {
                value: 4,
            },
            intuition: {
                value: 6,
            },
            mind: {
                value: 3,
            },
            mystic: {
                value: 6,
            },
            strength: {
                value: 7,
            },
            willpower: {
                value: 5,
            },
        },
        biography: "<p></p><h2>Besonderheiten</h2><p>Regenbogenleder (25 Lunare; Jagdkunst gg. 25)</p>",
        currency: {
            L: 0,
            S: 0,
            T: 0,
        },
        damageReduction: {
            value: 7,
        },
        derivedAttributes: {
            bodyresist: {
                value: 28,
            },
            defense: {
                value: 30,
            },
            focuspoints: {
                value: 22,
            },
            healthpoints: {
                value: 13,
            },
            initiative: {
                value: 4,
            },
            mindresist: {
                value: 27,
            },
            size: {
                value: 8,
            },
            speed: {
                value: 12,
            },
        },
        level: "3 / 3",
        skills: {
            acrobatics: {
                points: 9,
                value: 21,
            },
            athletics: {
                points: 4,
                value: 16,
            },
            determination: {
                points: 7,
                value: 20,
            },
            endurance: {
                points: 11,
                value: 20,
            },
            lightmagic: {
                points: 6,
                value: 20,
            },
            perception: {
                points: 7,
                value: 18,
            },
            stealth: {
                points: 7,
                value: 10,
            },
        },
        type: "Feenwesen, Lichtwesen, Reittier",
    },
    items: [
        {
            name: "Lichtkugel",
            system: {
                skill: "lightmagic",
                skillLevel: 1,
            },
            type: "spell",
        },
        {
            name: "Gleißender Schild",
            system: {
                skill: "lightmagic",
                skillLevel: 2,
            },
            type: "spell",
        },
        {
            name: "Lichtblitz",
            system: {
                skill: "lightmagic",
                skillLevel: 3,
            },
            type: "spell",
        },
        {
            name: "Abdrängen",
            system: {
                level: 1,
                skill: "melee",
            },
            type: "mastery",
        },
        {
            name: "Vorstürmen",
            system: {
                level: 1,
                skill: "melee",
            },
            type: "mastery",
        },
        {
            name: "Rundumschlag",
            system: {
                level: 2,
                skill: "melee",
            },
            type: "mastery",
        },
        {
            name: "Feenblut",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Fliegend",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Koloss 2 (Biss, Klauen)",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Regenbogenleder",
            system: {
                description: "25 Lunare; Jagdkunst gg. 25",
                availability: null,
                complexity: "U",
                damageLevel: null,
                durability: null,
                hardness: null,
                price: "25 L",
                quality: 0,
                quantity: 1,
                sufferedDamage: null,
                weight: 0,
            },

            type: "equipment",
        },
    ],
};