import {QuenchBatchContext} from "@ethaks/fvtt-quench";
import {actorCreator} from "module/data/EntityCreator"
import {foundryApi} from "../../module/api/foundryApi";
import {CharacterDataModel} from "module/actor/dataModel/CharacterDataModel";
import SplittermondActor from "module/actor/actor";
import {splittermond} from "module/config";
import {NpcDataModel} from "module/actor/dataModel/NpcDataModel";
import {
    abs, asString,
    dividedBy,
    evaluate,
    isGreaterZero,
    isLessThanZero, minus,
    of, plus, ref,
    roll,
    times, toRollFormula
} from "module/actor/modifiers/expressions/scalar";

export function modifierTest(context: QuenchBatchContext) {
    const {describe, it, expect, beforeEach, afterEach} = context;
    let actors: SplittermondActor[] = [];
    beforeEach(() => actors = []);

    afterEach(async () => await Actor.deleteDocuments(actors.map(a => a.id)));


    async function createActor(name: string) {
        const actor = await actorCreator.createCharacter({type: "character", name, system: {}})
        actors.push(actor)
        return actor;
    }

    async function createNpc(name: string) {
        const actor = await actorCreator.createNpc({type: "npc", name, system: {}},)
        actors.push(actor)
        return actor;
    }

    describe("Modifiers are taken up by actor", () => {

        it("should account for a stealth modifier", async () => {
            const subject = await createActor("StealthyGnome")
            subject.updateSource({system: {species: {size: 3}}})
            subject.updateSource({
                system: {
                    attributes: {
                        intuition: {initial: 2, advances: 0},
                        agility: {initial: 3, advances: 0}
                    }
                }
            });

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.stealth.value).to.equal(7);
        });

        [
            ["size", 6], ["speed", 8], ["initiative", 9], ["healthpoints", 8], ["focuspoints", 9], ["defense", 17],
            ["mindresist", 17], ["bodyresist", 17]
        ].forEach(([derivedValue, expected]) => {
            it(`should modify derived value '${derivedValue}' by 1`, async () => {
                const subject = await createActor(`CharacterWith${derivedValue}`);
                splittermond.attributes.forEach(attribute => {
                    (subject.system as CharacterDataModel).attributes[attribute].updateSource({
                        initial: 2,
                        advances: 0,
                        species: 0
                    });

                });

                const derivedValueKey = foundryApi.localize(`splittermond.derivedAttribute.${derivedValue}.short`);
                await subject.createEmbeddedDocuments("Item", [{
                    type: "strength",
                    name: "DerivedValueEnhancer",
                    system: {modifier: `${derivedValueKey} +1`}
                }]);

                subject.prepareBaseData();
                await subject.prepareEmbeddedDocuments();
                subject.prepareDerivedData();

                expect(subject.derivedValues[derivedValue].value).to.equal(expected);
            });
        });

        it("should account for modifications from shields", async () => {
            const subject = await createActor("ShieldedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).attributes.strength.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).updateSource({
                    skills: {
                        ...subject.system.skills,
                        acrobatics: {points: 2, value: 6}
                    }
                }
            );
            await subject.createEmbeddedDocuments("Item", [{
                type: "shield",
                name: "Fat Shield",
                system: {
                    skill: "blades",
                    tickMalus: 1,
                    defenseBonus: 1,
                    handicap: 1,
                    equipped: true,
                }
            }]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.acrobatics.value).to.equal(5);
            expect(subject.derivedValues.defense.value).to.equal(17);
            expect(subject.attacks.find(a => a.name === "waffenlos")?.weaponSpeed).to.equal(6);
        });

        it("should account for modifications from armor", async () => {
            const subject = await createActor("ArmoredCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).attributes.strength.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).updateSource({
                    skills: {
                        ...subject.system.skills,
                        acrobatics: {points: 2, value: 6}
                    }
                }
            );
            await subject.createEmbeddedDocuments("Item", [{
                type: "armor",
                name: "Fat Armor",
                system: {
                    tickMalus: 1,
                    defenseBonus: 1,
                    damageReduction: 1,
                    handicap: 1,
                    equipped: true,
                }
            }]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.acrobatics.value).to.equal(5);
            expect(subject.derivedValues.defense.value).to.equal(17);
            expect(subject.damageReduction).to.equal(1);
            expect(subject.attacks.find(a => a.name === "waffenlos")?.weaponSpeed).to.equal(6);
        });

        it("should account for modifications from npc features", async () => {
            const subject = await createNpc("NpcWithFeature");
            (subject.system as NpcDataModel).attributes.agility.updateSource({value: 3});
            (subject.system as NpcDataModel).attributes.strength.updateSource({value: 5});
            (subject.system as NpcDataModel).updateSource({damageReduction: {value: 2}});
            await subject.createEmbeddedDocuments("Item", [{
                type: "npcfeature",
                name: "Elefant Skin",
                system: {
                    modifier: "SR +2",
                }
            }]);


            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.damageReduction).to.equal(4);
        });

        it("should cap modifiers for skills", async () => {
            const subject = await createActor("Overmagiced")
            subject.updateSource({
                system: {
                    attributes: {
                        intuition: {initial: 2, advances: 0},
                        mind: {initial: 3, advances: 0}
                    }
                }
            });
            await subject.createEmbeddedDocuments("Item", [{
                type: "spelleffect",
                name: "Superempathy",
                system: {active: true, modifier: "empathy +1"}
            }]);
            await subject.createEmbeddedDocuments("Item", [{
                type: "spelleffect",
                name: "MegaEmpathy",
                system: {active: true, modifier: "empathy +3"}
            }]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.empathy.value).to.equal(8);
        })
    });

    describe("Modifiable splinterpoint bonus", () => {
        async function getActorWithMasteryModifying(modifier: string) {
            const subject = await createActor("SplinterpointBonusCharacter");
            (subject.system as CharacterDataModel).attributes.intuition.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).attributes.charisma.updateSource({initial: 6, advances: 0});
            (subject.system as CharacterDataModel).updateSource({splinterpoints: {value: 3, max: 3}});
            (subject.system as CharacterDataModel).updateSource({
                    skills: {
                        ...subject.system.skills,
                        eloquence: {points: 9, value: 17}
                    }
                }
            );
            await subject.createEmbeddedDocuments("Item", [{
                type: "mastery",
                name: "Begabter Lügner",
                system: {
                    skill: "eloquence",
                    level: 2,
                    modifier,
                }
            }]);
            return subject;
        }

        it("should process a splinterpoint modifier correctly", async () => {
            const subject = await getActorWithMasteryModifying("splinterpoints.bonus Fertigkeit='Redegewandtheit' +${AUS}");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            const splinterpointSpender = subject.spendSplinterpoint();
            expect(splinterpointSpender.pointSpent).to.be.true;
            expect(splinterpointSpender.getBonus("eloquence")).to.equal(subject.attributes.charisma.value)
        });

        it("should account for a global bonus modifier", async () => {
            const subject = await getActorWithMasteryModifying("splinterpoints.bonus 4");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            const splinterpointSpender = subject.spendSplinterpoint();
            expect(splinterpointSpender.pointSpent).to.be.true;
            expect(splinterpointSpender.getBonus("eloquence")).to.equal(4)
        });


        it("should only use the highest splinterpoint bonus", async () => {
            const subject = await getActorWithMasteryModifying("splinterpoints.bonus Fertigkeit='Redegewandtheit' ${AUS}");
            await subject.createEmbeddedDocuments("Item", [{
                type: "mastery",
                name: "Begabter Redner",
                system: {
                    skill: "eloquence",
                    level: 2,
                    modifier: "splinterpoints.bonus skill='eloquence' 7",
                }
            }]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            const splinterpointSpender = subject.spendSplinterpoint();
            expect(splinterpointSpender.pointSpent).to.be.true;
            expect(splinterpointSpender.getBonus("eloquence")).to.equal(7);
        });
    });

    describe("Wound malus", () => {
        async function setUpActor() {
            const actor = await createActor("WoundedCharacter");
            (actor.system as CharacterDataModel).attributes.agility.updateSource({initial: 2, advances: 0});
            (actor.system as CharacterDataModel).attributes.strength.updateSource({initial: 2, advances: 0});
            (actor.system as CharacterDataModel).updateSource({
                skills: {
                    ...actor.system.skills,
                    acrobatics: {points: 2, value: 6}
                }
            });
            return actor;
        }

        async function addWoundedEffect(actor: SplittermondActor, level: number) {
            return await actor.createEmbeddedDocuments("Item", [{
                type: "statuseffect",
                name: "Verwundung",
                system: {
                    modifier: "woundMalus.levelMod value='+1'",
                    level: level,
                }
            }]);
        }

        it("should apply wound malus effect with more than full bar missing", async () => {
            const subject = await setUpActor();
            await addWoundedEffect(subject, 1);
            await subject.consumeCost("health", `8V8`, "");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.acrobatics.value).to.equal(6 - 2);
        });

        it("should apply LP wound malus when more than full bar missing", async () => {
            const subject = await setUpActor();
            await subject.consumeCost("health", `8V8`, "");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.acrobatics.value).to.equal(6 - 1);
        });

        [[0, 0], [1, 1], [2, 2], [3, 4], [4, 8], [5, 8]].forEach(([level, reduction]) => {
            it(`should apply wound malus of ${level} at perfect health`, async () => {
                const subject = await setUpActor();
                await addWoundedEffect(subject, level);

                subject.prepareBaseData();
                await subject.prepareEmbeddedDocuments();
                subject.prepareDerivedData();

                expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
            });

            it(`should apply wound malus of ${level} with 1hp missing`, async () => {
                const subject = await setUpActor();
                await addWoundedEffect(subject, level);
                await subject.consumeCost("health", "1V1", "");

                subject.prepareBaseData();
                await subject.prepareEmbeddedDocuments();
                subject.prepareDerivedData();

                expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
            });

            it(`should apply wound malus of ${level} with full bar missing`, async () => {
                const subject = await setUpActor();
                await addWoundedEffect(subject, level);
                await subject.consumeCost("health", `7V7`, "");

                subject.prepareBaseData();
                await subject.prepareEmbeddedDocuments();
                subject.prepareDerivedData();

                expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
            });
        });
    });

    describe("Parsed Modifiers", () => {
        async function defaultActor(name: string, modifier: string) {
            const subject = await createActor(name)
            subject.updateSource({
                system: {
                    attributes: {
                        constitution: {initial: 2, advances: 0},
                        intuition: {initial: 2, advances: 0},
                        mind: {initial: 3, advances: 0}
                    }
                }
            });
            await subject.createEmbeddedDocuments("Item", [{
                type: "strength",
                name: "DerivedValueEnhancer",
                system: {modifier}
            }]);
            return subject;
        }

        it("should add a constant value to a skill", async () => {
            const subject = await defaultActor("Empath", "empathy +1");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.empathy.value).to.equal(6);
        });

        it("should add a roll to a skill", async () => {
            const subject = await defaultActor("Empath", "empathy 2W6");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.empathy.value).to.be.above(6).below(18);
        });

        it("should add a attribute value to a skill", async () => {
            const subject = await defaultActor("Empath", "empathy ${Intuition}");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.empathy.value).to.equal(7);
        });

        it("should add a skill value to a skill", async () => {
            const subject = await defaultActor("DoubleEmpath", "empathy ${Jagdkunst}");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.empathy.value).to.equal(10);
        });

        it("should add a random numeric attribute to", async () => {
            const subject = await defaultActor("WeirdEmpath", "empathy ${system.health.max}");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.empathy.value).to.equal(40);
        });

        it("should handle foreduction correctly for a reduction of 2V1", async () => {
            const subject = await defaultActor("SpellMaster", "");
            const spellDefinition = {
                type: "spell",
                name: "Pseudotodeszauber",
                system: {
                    skill: "deathmagic",
                    level: 1,
                    costs: "4V2",
                    difficulty: "18"
                }
            };
            await subject.createEmbeddedDocuments("Item", [{
                type: "mastery",
                name: "Sparsamer Zauberer",
                system: {
                    skill: "deathmagic",
                    level: 1,
                    modifier: "foreduction.deathmagic 2V1"
                }
            }]);
            await subject.createEmbeddedDocuments("Item", [spellDefinition]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.items.find(i => i.name == spellDefinition.name)?.costs)
                .to.equal("2V1")
        });

        it("should handle foreduction correctly for a reduction of 1", async () => {
            const subject = await defaultActor("SpellMaster", "");
            const spellDefinition = {
                type: "spell",
                name: "Pseudotodeszauber",
                system: {
                    skill: "deathmagic",
                    level: 1,
                    costs: "4V2",
                    difficulty: "18"
                }
            };
            await subject.createEmbeddedDocuments("Item", [{
                type: "mastery",
                name: "Sparsamer Zauberer",
                system: {
                    skill: "deathmagic",
                    level: 1,
                    modifier: "foreduction.deathmagic 1"
                }
            }]);
            await subject.createEmbeddedDocuments("Item", [spellDefinition]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.items.find(i => i.name == spellDefinition.name)?.costs)
                .to.equal("3V2")
        });

    });

    describe("Roll expressions", () => {

        it("should be able to predict parenthetical expressions correctly", async () => {
            expect(isLessThanZero(roll(foundryApi.roll("-2d6")))).to.be.true;
            expect(isGreaterZero(roll(foundryApi.roll("-2d6")))).to.be.false;
        })

        it("should be able to evaluate parenthetical expressions correctly", async () => {
            expect(evaluate(roll(foundryApi.roll("-2d6")))).to.be.above(-13).below(0);
        })

        it("should be able to predict nested expressions correctly ", async () => {
            expect(isLessThanZero(roll(foundryApi.roll("2 + -1 * 3d6")))).to.be.true;
            expect(isGreaterZero(roll(foundryApi.roll("-2d6")))).to.be.false;
        });

        it("should be able to produce valid a valid roll expression", async () => {
            //is (1*14 + |-4|/1) - (2*3 + 1)
            const expression = minus(
                plus(
                    times(roll(foundryApi.roll("1d1")), of(14)),
                    dividedBy(abs(of(-4)), roll(foundryApi.roll("1d1")))
                ),
                plus(
                    times(of(2), ref("value", {value:3}, "value")),
                    ref("value", {value: 1}, "value")
                )
            );

            const rollFormula = toRollFormula(expression)
            const rollObject = foundryApi.roll(...rollFormula);
            const evaluated = await rollObject.evaluate();

            expect(rollFormula[0]).to.equal("((1d1 * 14) + (abs(-4) / 1d1)) - ((2 * @value0) + @value1)")
            expect(evaluated.total, `${asString(expression)} should equal`).to.equal(11);
        });
    });

    describe("Item modifiers", () => {
        it("should account for modifications on weapons", async () => {
            const subject = await createActor("WeaponizedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).attributes.strength.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).updateSource({
                    skills: {
                        ...subject.system.skills,
                        blades: {points: 2, value: 6}
                    }
                }
            );
            await subject.createEmbeddedDocuments("Item", [{
                type: "weapon",
                name: "Lance of Longinus",
                system: {
                    skill: "blades",
                    damage: "3",
                    equipped: true,
                    attribute1: "strength",
                    attribute2: "agility",
                    weaponSpeed: 6
                }
            }]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();
            subject.modifier.add("damage", {
                item: "Lance of Longinus",
                name: "Mastery",
                type: "magic"
            }, of(1), null, false);
            subject.modifier.add("damage", {name: "Mystery", type: "magic"}, of(2), null, false);
            subject.modifier.add("weaponspeed", {name: "Mystery", type: "magic"}, of(2), null, false);

            expect(subject.attacks.find(a => a.name === "Lance of Longinus")?.damage).to.equal("3+3");
            expect(subject.attacks.find(a => a.name === "Lance of Longinus")?.weaponSpeed).to.equal(4);
        });

        it("should account for modifications on shields", async () => {
            const subject = await createActor("WeaponizedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).attributes.strength.updateSource({initial: 2, advances: 0});
            (subject.system as CharacterDataModel).updateSource({
                    skills: {
                        ...subject.system.skills,
                        blades: {points: 2, value: 6}
                    }
                }
            );
            await subject.createEmbeddedDocuments("Item", [{
                type: "weapon",
                name: "Lance of Longinus",
                system: {
                    skill: "blades",
                    damage: "3",
                    equipped: true,
                    attribute1: "strength",
                    attribute2: "agility",
                    features: "Scharf 1",
                    weaponSpeed: 6
                }
            }]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();
            subject.modifier.add("damage", {
                item: "Lance of Longinus",
                name: "Mastery",
                type: "magic"
            }, of(1), null, false);
            subject.modifier.add("item.addfeature", {
                name: "Mystery",
                feature: "Scharf",
                item: "Lance of Longinus",
                type: "magic"
            }, of(2), null, false);

            expect(subject.attacks.find(a => a.name === "Lance of Longinus")?.features).to.equal("Scharf 2");
        });
    });
}
