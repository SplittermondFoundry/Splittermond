export const testname = "Vorarbeiter";

export const input = `Vorarbeiter
 AUS 
6
 GK
 5
 BEW INT KON MYS STÄ VER WIL 
5
 GSW 
5
 LP
 4
 5
 6
 FO
 10
 9
 32
 VTD
 27
 Waffen Wert Schaden WGS
 Klauen
 22
 2W6+2
 SR
 0
 INI
 4
 5
 KW GW
 25
 25
 Merkmale
 6 Ticks
 Typus: Feenwesen   
5-1W6 Entwaffnend 1, 
Umklammern
 Monstergrad: 3 / 1
 Fertigkeiten: Akrobatik 16, Anführen 18, Athletik 14, Entschlos
senheit 16, Heimlichkeit 16, Wahrnehmung 18, Zähigkeit 16, 
Beherrschungsmagie 19
 Zauber: Beherrschung I: Furcht, Verstummen; II: Magische Fes
sel, III: Lähmung
 Meisterschaften: Anführen (I: Sammeln; II: Schlachtplan (An
griff), Handgemenge (I: Umklammern), Beherrschungsmagie (I: 
Willensbrecher)
 Merkmale: Betäubungsimmunität, Feenblut, Taktiker, Verbün
dete rufen (60 Ticks / 1W6+1 Verblichene)
 Beute: Klauen aus Funkelhart (10 Lunare`

export const expected = {
    system: {

        attributes: {
            agility: {
                value: 6,
            },
            charisma: {
                value: 6,
            },
            constitution: {
                value: 4,
            },
            intuition: {
                value: 5,
            },
            mind: {
                value: 4,
            },
            mystic: {
                value: 5,
            },
            strength: {
                value: 6,
            },
            willpower: {
                value: 5,
            },
        },
        biography: "<p></p><h2>Besonderheiten</h2><p>Klauen aus Funkelhart (10 Lunare</p>",
        currency: {
            L: 0,
            S: 0,
            T: 0,
        },
        damageReduction: {
            value: 5,
        },
        derivedAttributes: {
            bodyresist: {
                value: 25,
            },
            defense: {
                value: 27,
            },
            focuspoints: {
                value: 32,
            },
            healthpoints: {
                value: 9,
            },
            initiative: {
                value: 5,
            },
            mindresist: {
                value: 25,
            },
            size: {
                value: 5,
            },
            speed: {
                value: 10,
            },
        },
        level: "3 / 1",
        skills: {
            acrobatics: {
                points: 5,
                value: 16,
            },
            athletics: {
                points: 3,
                value: 14,
            },
            controlmagic: {
                points: 10,
                value: 19,
            },
            endurance: {
                points: 8,
                value: 16,
            },
            leadership: {
                points: 8,
                value: 18,
            },
            perception: {
                points: 9,
                value: 18,
            },
            stealth: {
                points: 6,
                value: 16,
            },
        },
        type: "Feenwesen   \n5-1W6 Entwaffnend 1, \nUmklammern",
    },
    items: [
        {
            name: "Furcht",
            system: {
                skill: "controlmagic",
                skillLevel: 1,
            },
            type: "spell",
        },
        {
            name: "Verstummen",
            system: {
                skill: "controlmagic",
                skillLevel: 1,
            },
            type: "spell",
        },
        {
            name: "Magische Fes sel",
            system: {
                skill: "controlmagic",
                skillLevel: 2,
            },
            type: "spell",
        },
        {
            name: "Lähmung",
            system: {
                skill: "controlmagic",
                skillLevel: 3,
            },
            type: "spell",
        },
        {
            name: "Sammeln",
            system: {
                level: 1,
                skill: "leadership",
            },
            type: "mastery",
        },
        {
            name: "Schlachtplan",
            system: {
                level: 2,
                skill: "leadership",
            },
            type: "mastery",
        },
        {
            name: "Umklammern",
            system: {
                level: 1,
                skill: "melee",
            },
            type: "mastery",
        },
        {
            name: "Willensbrecher",
            system: {
                level: 1,
                skill: "controlmagic",
            },
            type: "mastery",
        },
        {
            name: "Betäubungsimmunität",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Feenblut",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Taktiker",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Verbün dete rufen (60 Ticks / 1W6+1 Verblichene)",
            system: {},
            type: "npcfeature",
        },
    ],
}    