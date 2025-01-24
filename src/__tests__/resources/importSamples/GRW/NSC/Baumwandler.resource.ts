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
            "activeDefense": {
                "bodyresist": [],
                "defense": [],
                "mindresist": []
            },
            "attacks": [],
            "attributes": {
                "agility": {
                    "advances": 0,
                    "initial": 0,
                    "species": 0
                },
                "charisma": {
                    "advances": 0,
                    "initial": 0,
                    "species": 0
                },
                "constitution": {
                    "advances": 0,
                    "initial": 0,
                    "species": 0
                },
                "intuition": {
                    "advances": 0,
                    "initial": 0,
                    "species": 0
                },
                "mind": {
                    "advances": 0,
                    "initial": 0,
                    "species": 0
                },
                "mystic": {
                    "advances":0,
                    "initial":0,
                    "species": 0
                },
                "strength": {
                    "advances": 0,
                    "initial": 0,
                    "species": 0
                },
                "willpower": {
                    "advances": 0,
                    "initial": 0,
                    "species": 0
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
            "focus": {
                "available": {
                    "percentage": 100,
                    "value": 16
                },
                "channeled": {
                    "entries": [],
                    "percentage": 0,
                    "value": 0
                },
                "consumed": {
                    "value": 0
                },
                "exhausted": {
                    "percentage": 0,
                    "value": 0
                },
                "max": 16,
                "total": {
                    "percentage": 100,
                    "value": 16
                }
            },
            "focusBar": {
                "max": 16,
                "value": 16
            },
            "health": {
                "available": {
                    "percentage": 100,
                    "value": 75
                },
                "channeled": {
                    "entries": [],
                    "percentage": 0,
                    "value": 0
                },
                "consumed": {
                    "value": 0
                },
                "exhausted": {
                    "percentage": 0,
                    "value": 0
                },
                "max": 75,
                "total": {
                    "percentage": 100,
                    "value": 75
                },
                "woundMalus": {
                    "level": 0,
                    "levelMod": 0,
                    "levels": [
                        {
                            "label": "splittermond.woundMalusLevels.notinjured",
                            "value": 0
                        },
                        {
                            "label": "splittermond.woundMalusLevels.battered",
                            "value": -1
                        },
                        {
                            "label": "splittermond.woundMalusLevels.injured",
                            "value": -2
                        },
                        {
                            "label": "splittermond.woundMalusLevels.badlyinjured",
                            "value": -4
                        },
                        {
                            "label": "splittermond.woundMalusLevels.doomed",
                            "value": -8
                        }
                    ],
                    "mod": 0,
                    "nbrLevels": 5,
                    "value": 0
                }
            },
            "healthBar": {
                "max": 75,
                "value": 75
            },
            "level": "4 / 2",
            "lowerFumbleResult": 0,
            "sex": "",
            "skills": {
                "acrobatics": {
                    "points": 2,
                    "value": 12
                },
                "alchemy": {
                    "points": 0,
                    "value": 0
                },
                "animals": {
                    "points": 0,
                    "value": 0
                },
                "antimagic": {
                    "points": 0,
                    "value": 0
                },
                "arcanelore": {
                    "points": 0,
                    "value": 0
                },
                "athletics": {
                    "points": 5,
                    "value": 15
                },
                "blades": {
                    "points": 0,
                    "value": 0
                },
                "chains": {
                    "points": 0,
                    "value": 0
                },
                "clscraft": {
                    "points": 0,
                    "value": 0
                },
                "combatmagic": {
                    "points": 0,
                    "value": 0
                },
                "controlmagic": {
                    "points": 0,
                    "value": 0
                },
                "countrylore": {
                    "points": 0,
                    "value": 0
                },
                "craftmanship": {
                    "points": 0,
                    "value": 0
                },
                "deathmagic": {
                    "points": 0,
                    "value": 0
                },
                "determination": {
                    "points": 8,
                    "value": 16
                },
                "dexterity": {
                    "points": 0,
                    "value": 0
                },
                "diplomacy": {
                    "points": 0,
                    "value": 0
                },
                "eloquence": {
                    "points": 0,
                    "value": 0
                },
                "empathy": {
                    "points": 0,
                    "value": 0
                },
                "endurance": {
                    "points": 11,
                    "value": 23
                },
                "enhancemagic": {
                    "points": 0,
                    "value": 0
                },
                "fatemagic": {
                    "points": 0,
                    "value": 0
                },
                "firemagic": {
                    "points": 0,
                    "value": 0
                },
                "heal": {
                    "points": 0,
                    "value": 0
                },
                "healmagic": {
                    "points": 0,
                    "value": 0
                },
                "history": {
                    "points": 0,
                    "value": 0
                },
                "hunting": {
                    "points": 0,
                    "value": 0
                },
                "illusionmagic": {
                    "points": 0,
                    "value": 0
                },
                "insightmagic": {
                    "points": 0,
                    "value": 0
                },
                "leadership": {
                    "points": 0,
                    "value": 0
                },
                "lightmagic": {
                    "points": 0,
                    "value": 0
                },
                "locksntraps": {
                    "points": 0,
                    "value": 0
                },
                "longrange": {
                    "points": 0,
                    "value": 0
                },
                "melee": {
                    "points": 0,
                    "value": 0
                },
                "motionmagic": {
                    "points": 0,
                    "value": 0
                },
                "nature": {
                    "points": 0,
                    "value": 0
                },
                "naturemagic": {
                    "points": 5,
                    "value": 13
                },
                "perception": {
                    "points": 4,
                    "value": 11
                },
                "performance": {
                    "points": 0,
                    "value": 0
                },
                "protectionmagic": {
                    "points": 0,
                    "value": 0
                },
                "seafaring": {
                    "points": 0,
                    "value": 0
                },
                "shadowmagic": {
                    "points": 0,
                    "value": 0
                },
                "slashing": {
                    "points": 0,
                    "value": 0
                },
                "staffs": {
                    "points": 0,
                    "value": 0
                },
                "stealth": {
                    "points": 5,
                    "value": 7
                },
                "stonemagic": {
                    "points": 0,
                    "value": 0
                },
                "streetlore": {
                    "points": 0,
                    "value": 0
                },
                "survival": {
                    "points": 0,
                    "value": 0
                },
                "swim": {
                    "points": 0,
                    "value": 0
                },
                "throwing": {
                    "points": 0,
                    "value": 0
                },
                "transformationmagic": {
                    "points": 0
                },
                "watermagic": {
                    "points": 0
                },
                "windmagic": {
                    "points": 0
                }
            },
            "type": "Feenwesen, Magisches Wesen III, Naturwesen, Pflanze"
        }
,
};