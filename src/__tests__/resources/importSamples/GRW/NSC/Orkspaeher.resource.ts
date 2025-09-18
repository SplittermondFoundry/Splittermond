export const testname = "Orkspäher";

export const input = `Orkspäher
Im Gegensatz zu den Kriegern der Orks sind ihre Späher von
kleinem Wuchs und überragen nicht einmal kleine Hobbitse, erst
recht, da sie zu kriecherischem Gehen neigen. Dafür sind sie
deutlich beweglicher als ihre größeren Artgenossen. Zudem verfügen sie über außerordentlich scharfe Zähne, weshalb sie sich besonders gut für
das Herstellen von Orkmessern eignen. Auch
im Kampf haben sie ihren Nutzen, sind sie doch verschlagen und
hinterhältig. Bevorzugt lauern sie Gegnern auf und greifen aus
der Ferne an, neigen aber zur Flucht, wenn sie in die Verteidigung gedrängt werden und nicht in der Überzahl sind. Ihr Aussehen gleicht dank gelber Augen und spitzer Ohren jenem anderer
Orks.
AUS BEW INT KON MYS STÄ VER WIL
1 4 3 2 1 3 3 2
GK GSW LP FO VTD SR KW GW
3 9 5 10 18 0 15 16
Waffen Wert Schaden WGS Reichw. INI Merkmale
Körper 8 1W6 5 Ticks – 7-1W6 –
Kurzbogen 11 1W10+1 5 Ticks 20 m 7-1W6
Durchdringung 1,
Scharf 2,
Zweihändig
Säbel 9 1W6+4 8 Ticks – 7-1W6 Scharf 2
Typus: Humanoider, Ork
Monstergrad: 1 / 0-
Fertigkeiten: Akrobatik 11, Athletik 12, Entschlossenheit 8, Heimlichkeit 16, Jagdkunst 12, Wahrnehmung 18, Zähigkeit 8, Stärkungsmagie 10
Zauber: Stärkung I: Sicht verbessern; II: Beschleunigen
Meisterschaften: Schusswaffen (I: Scharfschütze, Schnellschütze
I*), Athletik (II: Flinker Verfolger), Heimlichkeit (II: Hinterhalt),
Jagdkunst (I: Unermüdlicher Verfolger)
Merkmale: Dämmersicht, Erschöpfungsresistenz 2, Schwächlich,
Taktiker
Beute: Kurzbogen (8 Lunare), Säbel (7 Lunare)`;

export const expected = {
    system: {
        attributes: {
            agility: {
                value: 4,
            },
            charisma: {
                value: 1,
            },
            constitution: {
                value: 2,
            },
            intuition: {
                value: 3,
            },
            mind: {
                value: 3,
            },
            mystic: {
                value: 1,
            },
            strength: {
                value: 3,
            },
            willpower: {
                value: 2,
            },
        },
        biography:
            "<p>Im Gegensatz zu den Kriegern der Orks sind ihre Späher von kleinem Wuchs und überragen nicht einmal kleine Hobbitse, erst recht, da sie zu kriecherischem Gehen neigen. Dafür sind sie deutlich beweglicher als ihre größeren Artgenossen. Zudem verfügen sie über außerordentlich scharfe Zähne, weshalb sie sich besonders gut für das Herstellen von Orkmessern eignen. Auch im Kampf haben sie ihren Nutzen, sind sie doch verschlagen und hinterhältig. Bevorzugt lauern sie Gegnern auf und greifen aus der Ferne an, neigen aber zur Flucht, wenn sie in die Verteidigung gedrängt werden und nicht in der Überzahl sind. Ihr Aussehen gleicht dank gelber Augen und spitzer Ohren jenem anderer Orks.</p><h2>Besonderheiten</h2><p>Kurzbogen (8 Lunare), Säbel (7 Lunare)</p>",
        currency: {
            L: 0,
            S: 0,
            T: 0,
        },
        damageReduction: {
            value: 0,
        },
        derivedAttributes: {
            bodyresist: {
                value: 15,
            },
            defense: {
                value: 18,
            },
            focuspoints: {
                value: 10,
            },
            healthpoints: {
                value: 5,
            },
            initiative: {
                value: 0,
            },
            mindresist: {
                value: 16,
            },
            size: {
                value: 3,
            },
            speed: {
                value: 9,
            },
        },
        level: "1 / 0",
        skills: {
            acrobatics: {
                points: 4,
                value: 11,
            },
            athletics: {
                points: 5,
                value: 12,
            },
            determination: {
                points: 5,
                value: 8,
            },
            endurance: {
                points: 4,
                value: 8,
            },
            enhancemagic: {
                points: 6,
                value: 10,
            },
            hunting: {
                points: 7,
                value: 12,
            },
            melee: {
                points: 2,
                value: 9,
            },
            perception: {
                points: 13,
                value: 18,
            },
            stealth: {
                points: 7,
                value: 16,
            },
        },
        type: "Humanoider, Ork",
    },
    items: [
        {
            img: "icons/svg/sword.svg",
            name: "Körper",
            system: {
                damage: "1W6",
                features: "–",
                range: 0,
                skillValue: 8,
                weaponSpeed: 5,
            },
            type: "npcattack",
        },
        {
            _id: 1,
            name: "Kurzbogen",
            system: {
                attribute1: "agility",
                attribute2: "strength",
                damage: "1W10+1",
                features: "Durchdringung 1, Scharf 2, Zweihändig",
                range: 20,
                skill: "melee",
                weaponSpeed: 5,
            },
            type: "weapon",
        },
        {
            _id: 1,
            name: "Säbel",
            system: {
                attribute1: "agility",
                attribute2: "strength",
                damage: "1W6+4",
                features: "Scharf 2",
                range: 0,
                skill: "melee",
                weaponSpeed: 8,
            },
            type: "weapon",
        },
        {
            name: "Sicht verbessern",
            system: {
                skill: "enhancemagic",
                skillLevel: 1,
            },
            type: "spell",
        },
        {
            name: "Beschleunigen",
            system: {
                skill: "enhancemagic",
                skillLevel: 2,
            },
            type: "spell",
        },
        {
            name: "Scharfschütze",
            system: {
                level: 1,
                skill: "longrange",
            },
            type: "mastery",
        },
        {
            name: "Schnellschütze I*",
            system: {
                level: 1,
                skill: "longrange",
            },
            type: "mastery",
        },
        {
            name: "Flinker Verfolger",
            system: {
                level: 2,
                skill: "athletics",
            },
            type: "mastery",
        },
        {
            name: "Hinterhalt",
            system: {
                level: 2,
                skill: "stealth",
            },
            type: "mastery",
        },
        {
            name: "Unermüdlicher Verfolger",
            system: {
                level: 1,
                skill: "hunting",
            },
            type: "mastery",
        },
        {
            name: "Dämmersicht",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Erschöpfungsresistenz 2",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Schwächlich",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Taktiker",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Kurzbogen",
            system: {
                availability: null,
                complexity: "U",
                damageLevel: null,
                description: "8 Lunare",
                durability: null,
                hardness: null,
                price: "8 L",
                quality: 0,
                quantity: 1,
                sufferedDamage: null,
                weight: 0,
            },
            type: "equipment",
        },
        {
            name: "Säbel",
            system: {
                availability: null,
                complexity: "U",
                damageLevel: null,
                description: "7 Lunare",
                durability: null,
                hardness: null,
                price: "7 L",
                quality: 0,
                quantity: 1,
                sufferedDamage: null,
                weight: 0,
            },
            type: "equipment",
        },
    ],
};
