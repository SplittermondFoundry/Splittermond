export const testname = "Oger";

export const input = `Oger
Mit einer Größe von über drei Metern gehören Oger zu den größeren humanoiden Wesen in Lorakis. Unter ihrer dunkelgrauen,
stellenweise von schwarzen Schuppen bedeckten Haut zeichnen
sich kräftige Muskeln ab, was gemeinsam mit den ungeschickten,
vierfingrigen Händen und den unglaublich langen Armen
ihre Vorliebe für klobige Wuchtwaffen erklärt. Ihr Kopf und ihr
Körper sind kahl und haarlos, ihre Augen sind klein und verraten
ihre außerordentliche Dumm- und Blödheit. Rüstungen tragen Vertreter dieser Rasse kaum einmal, finden sie doch nur selten einen
Schmied, den sie zur Anfertigung von entsprechenden Stücken
in ihrer Größe zwingen können. Oger leben üblicherweise abseits von Siedlungsgebieten und lediglich in kleinen Gruppen,
schließen sich aber von Zeit zu Zeit zu kleinen Kriegszügen zusammen oder plündern eigenständig Dörfer. Manche Potentaten
werben sie als Söldner oder gar als Leibwache an, um potenzielle
Angreifer bereits im Vorfeld abzuschrecken. Im Gegensatz zu den
meisten anderen intelligenten Rassen des Kontinents scheinen
die Oger über keinerlei magische Begabung zu verfügen.
AUS BEW INT KON MYS STÄ VER WIL
1 3 1 8 0 7 1 4
GK GSW LP FO VTD SR KW GW
7 10 15 6 28 2 37 19
Waffen Wert Schaden WGS INI Merkmale
Körper 16 1W10+2 7 Ticks 9-1W6 Wuchtig
Kriegshammer 20 2W10+4 12 Ticks 9-1W6 Unhandlich*,
Wuchtig,
Zweihändig
Typus: Humanoider, Monster
Monstergrad: 3 / 2
Fertigkeiten: Akrobatik 10, Athletik 16, Entschlossenheit 8, Heimlichkeit 4, Wahrnehmung 6, Zähigkeit 25
Meisterschaften: Hiebwaffen (I: Umreißen [Schwierigkeit 20]; II:
Rundumschlag, Schmetterschlag), Zähigkeit (II: Schmerzwiderstand I)
Merkmale: Dämmersicht, Erschöpfungsresistenz 2, Schmerzresistenz
Beute: Kriegshammer (18 Lunare)`

export const expected = {
    system:{
        attributes: {
            agility: {
                value: 3,
            },
            charisma: {
                value: 1,
            },
            constitution: {
                value: 8,
            },
            intuition: {
                value: 1,
            },
            mind: {
                value: 1,
            },
            mystic: {
                value: 0,
            },
            strength: {
                value: 7,
            },
            willpower: {
                value: 4,
            },
        },
        biography: "<p>Mit einer Größe von über drei Metern gehören Oger zu den größeren humanoiden Wesen in Lorakis. Unter ihrer dunkelgrauen, stellenweise von schwarzen Schuppen bedeckten Haut zeichnen sich kräftige Muskeln ab, was gemeinsam mit den ungeschickten, vierfingrigen Händen und den unglaublich langen Armen ihre Vorliebe für klobige Wuchtwaffen erklärt. Ihr Kopf und ihr Körper sind kahl und haarlos, ihre Augen sind klein und verraten ihre außerordentliche Dumm- und Blödheit. Rüstungen tragen Vertreter dieser Rasse kaum einmal, finden sie doch nur selten einen Schmied, den sie zur Anfertigung von entsprechenden Stücken in ihrer Größe zwingen können. Oger leben üblicherweise abseits von Siedlungsgebieten und lediglich in kleinen Gruppen, schließen sich aber von Zeit zu Zeit zu kleinen Kriegszügen zusammen oder plündern eigenständig Dörfer. Manche Potentaten werben sie als Söldner oder gar als Leibwache an, um potenzielle Angreifer bereits im Vorfeld abzuschrecken. Im Gegensatz zu den meisten anderen intelligenten Rassen des Kontinents scheinen die Oger über keinerlei magische Begabung zu verfügen.</p><h2>Besonderheiten</h2><p>Kriegshammer (18 Lunare)</p>",
        currency: {
            L: 0,
            S: 0,
            T: 0,
        },
        damageReduction: {
            value: 2,
        },
        derivedAttributes: {
            bodyresist: {
                value: 37,
            },
            defense: {
                value: 28,
            },
            focuspoints: {
                value: 6,
            },
            healthpoints: {
                value: 15,
            },
            initiative: {
                value: 0,
            },
            mindresist: {
                value: 19,
            },
            size: {
                value: 7,
            },
            speed: {
                value: 10,
            },
        },
        level: "3 / 2",
        skills: {
            acrobatics: {
                points: 0,
                value: 10,
            },
            athletics: {
                points: 6,
                value: 16,
            },
            determination: {
                points: 3,
                value: 8,
            },
            endurance: {
                points: 13,
                value: 25,
            },
            perception: {
                points: 1,
                value: 6,
            },
            stealth: {
                points: 2,
                value: 4,
            },
        },
        type: "Humanoider, Monster",
    },
    items:[
        {
            name: "Umreißen",
            system: {
                level: 1,
                skill: "slashing",
            },
            type: "mastery",
        },
        {
            name: "Rundumschlag",
            system: {
                level: 2,
                skill: "slashing",
            },
            type: "mastery",
        },
        {
            name: "Schmetterschlag",
            system: {
                level: 2,
                skill: "slashing",
            },
            type: "mastery",
        },
        {
            name: "Schmerzwiderstand I",
            system: {
                level: 2,
                skill: "endurance",
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
            name: "Schmerzresistenz",
            system: {},
            type: "npcfeature",
        },
        {
            name: "Kriegshammer",
            system: {
                description: "18 Lunare",
                availability: null,
                complexity: "U",
                damageLevel: null,
                durability: null,
                hardness: null,
                price: "18 L",
                quality: 0,
                quantity: 1,
                sufferedDamage: null,
                weight: 0,
                },
            type: "equipment",
        },
    ],
}