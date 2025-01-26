export const testname = "Baumwandler";

export const input = `
Baumwandler
Der Körper dieses fast drei Meter in die Höhe ragenden Feenwesens ist reichlich mit Verborkt, seine Füße ähneln festem Wurzelwerk und aus seinem Haupt sprießen mit dichtem Blätterwerk
bedeckte Äste. Rührt es sich nicht, könnte es für einen gewöhnlichen
Baum gehalten werden. Allerdings hat es seltsam menschenähnliche
Gesichtszüge. Besonders herausstechend sind die stets strafend
herabblickenden Augen, tritt der Baumwandler doch normalerweise als
Wächter der belebten Natur in Erscheinung. Er geht gegen alle
Eindringlinge vor, seien es unbedarfte Holzfäller, rücksichtslose
Jäger oder grauenhafte Monster.
AUS BEW INT KON MYS STÄ VER WIL
4 1 3 8 4 9 3 4
GK GSW LP FO VTD SR KW GW
7 8 15 16 29 4 33 27
 Waffen Wert Schaden WGS INI Merkmale
Körper 22 5W6+7 13 Ticks 7-1W6 Umklammern,
Wuchtig
Typus: Feenwesen, Magisches Wesen III, Naturwesen, Pflanze
Monstergrad: 4 / 2
Fertigkeiten: Akrobatik 12, Athletik 15, Entschlossenheit 16,
Heimlichkeit 7, Wahrnehmung 11, Zähigkeit 23, Naturmagie 13
Meisterschaften: Handgemenge (I: Umklammern, Vorstürmen;
III: Würgegriff), Naturmagie (I: Lied der Natur)
Zauber: Natur I: Rindenhaut, Wachstum; II: Ranken, Spurlos in
der Wildnis
Merkmale: Dämmersicht, Feenblut, Giftimmunität, Schmerzresistenz, Taktiker, Verwundbarkeit gegen Feuerschaden
`;
export const expected = {
    system:
        {
            "attributes": {
                "agility": {
                    value: 1,
                },
                "charisma": {
                    value:4
                },
                "constitution": {
                    value:8,
                },
                "intuition": {
                    value: 3,
                },
                "mind": {
                    value: 3,
                },
                "mystic": {
                    value: 4,
                },
                "strength": {
                    value: 9,
                },
                "willpower": {
                    value: 4,
                }
            },
            "biography": "<p>Der Körper dieses fast drei Meter in die Höhe ragenden Feenwesens ist reichlich mit Verborkt, seine Füße ähneln festem Wurzelwerk und aus seinem Haupt sprießen mit dichtem Blätterwerk bedeckte Äste. Rührt es sich nicht, könnte es für einen gewöhnlichen Baum gehalten werden. Allerdings hat es seltsam menschenähnliche Gesichtszüge. Besonders herausstechend sind die stets strafend herabblickenden Augen, tritt der Baumwandler doch normalerweise als Wächter der belebten Natur in Erscheinung. Er geht gegen alle Eindringlinge vor, seien es unbedarfte Holzfäller, rücksichtslose Jäger oder grauenhafte Monster.</p>",
            "currency": {
                "L": 0,
                "S": 0,
                "T": 0
            },
            "damageReduction": {
                "value": 4
            },
            "derivedAttributes": {
                "bodyresist": {
                    "value": 33
                },
                "defense": {
                    "value": 29
                },
                "focuspoints": {
                    "value": 16
                },
                "healthpoints": {
                    "value": 15
                },
                "initiative": {
                    "value": 0
                },
                "mindresist": {
                    "value": 27
                },
                "size": {
                    "value": 7
                },
                "speed": {
                    "value": 8
                }
            },
            "level": "4 / 2",
            "skills": {
                "acrobatics": {
                    "points": 2,
                    "value": 12
                },
                "athletics": {
                    "points": 5,
                    "value": 15
                },
                "determination": {
                    "points": 8,
                    "value": 16
                },
                "endurance": {
                    "points": 11,
                    "value": 23
                },
                "naturemagic": {
                    "points": 5,
                    "value": 13
                },
                "perception": {
                    "points": 4,
                    "value": 11
                },
                "stealth": {
                    "points": 5,
                    "value": 7
                }
            },
            "type": "Feenwesen, Magisches Wesen III, Naturwesen, Pflanze"
        }
,
};