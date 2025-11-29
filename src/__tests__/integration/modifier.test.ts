import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { actorCreator } from "module/data/EntityCreator";
import { foundryApi } from "module/api/foundryApi";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import SplittermondActor from "module/actor/actor";
import { splittermond } from "module/config";
import { NpcDataModel } from "module/actor/dataModel/NpcDataModel";
import {
    abs,
    asString,
    dividedBy,
    evaluate,
    isGreaterZero,
    isLessThanZero,
    mapRoll,
    minus,
    of,
    plus,
    ref,
    roll,
    times,
    toRollFormula,
} from "module/modifiers/expressions/scalar";
import { DamageModel } from "module/item/dataModel/propertyModels/DamageModel";
import type SplittermondSpellItem from "module/item/spell";
import { withActor } from "./fixtures";
import Attack from "module/actor/attack";
import { passesEventually } from "../util";
import type { FoundryChatMessage } from "module/api/ChatMessage";

export function modifierTest(context: QuenchBatchContext) {
    const { describe, it, expect, beforeEach, afterEach } = context;
    let actors: SplittermondActor[] = [];
    beforeEach(() => (actors = []));

    afterEach(async () => await Actor.deleteDocuments(actors.map((a) => a.id)));

    async function createActor(name: string) {
        const actor = await actorCreator.createCharacter({ type: "character", name, system: {} });
        actors.push(actor);
        return actor;
    }

    async function createNpc(name: string) {
        const actor = await actorCreator.createNpc({ type: "npc", name, system: {} });
        actors.push(actor);
        return actor;
    }

    describe("Modifiers are taken up by actor", () => {
        it("should account for a stealth modifier", async () => {
            const subject = await createActor("StealthyGnome");
            await subject.update({ system: { species: { size: 3 } } });
            await subject.update({
                system: {
                    attributes: {
                        intuition: { initial: 2, advances: 0 },
                        agility: { initial: 3, advances: 0 },
                    },
                },
            });

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.stealth.value).to.equal(7);
        });

        it("should set number of healthlevels", async () => {
            const subject = await createActor("Weakling");
            await subject.update({ system: { species: { size: 5 } } });
            await subject.update({
                system: {
                    attributes: {
                        constitution: { initial: 2, advances: 0 },
                        agility: { initial: 3, advances: 0 },
                    },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "strength",
                    name: "Tough as Fingernails",
                    system: { modifier: "actor.woundmalus.nbrLevels 3" },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.system.health.total.value).to.equal(21);
        });

        [
            ["size", 6],
            ["speed", 8],
            ["initiative", 9],
            ["healthpoints", 8],
            ["focuspoints", 9],
            ["defense", 17],
            ["mindresist", 17],
            ["bodyresist", 17],
        ].forEach(([derivedValue, expected]) => {
            it(`should modify derived value '${derivedValue}' by 1`, async () => {
                const subject = await createActor(`CharacterWith${derivedValue}`);
                splittermond.attributes.forEach((attribute) => {
                    (subject.system as CharacterDataModel).attributes[attribute].updateSource({
                        initial: 2,
                        advances: 0,
                        species: 0,
                    });
                });

                const derivedValueKey = foundryApi.localize(`splittermond.derivedAttribute.${derivedValue}.short`);
                await subject.createEmbeddedDocuments("Item", [
                    {
                        type: "strength",
                        name: "DerivedValueEnhancer",
                        system: { modifier: `${derivedValueKey} +1` },
                    },
                ]);

                subject.prepareBaseData();
                await subject.prepareEmbeddedDocuments();
                subject.prepareDerivedData();

                expect(subject.derivedValues[derivedValue].value).to.equal(expected);
            });
        });

        it("should account for modifications from shields", async () => {
            const subject = await createActor("ShieldedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).attributes.strength.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).updateSource({
                skills: {
                    ...subject.system.skills,
                    acrobatics: { points: 2, value: 6 },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "shield",
                    name: "Fat Shield",
                    system: {
                        skill: "blades",
                        tickMalus: 1,
                        defenseBonus: 1,
                        handicap: 1,
                        equipped: true,
                    },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.acrobatics.value).to.equal(5);
            expect(subject.derivedValues.defense.value).to.equal(17);
            expect(subject.attacks.find((a) => a.name === "waffenlos")?.weaponSpeed).to.equal(6);
        });

        it("should account for modifications from armor", async () => {
            const subject = await createActor("ArmoredCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).attributes.strength.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).updateSource({
                skills: {
                    ...subject.system.skills,
                    acrobatics: { points: 2, value: 6 },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "armor",
                    name: "Fat Armor",
                    system: {
                        tickMalus: 1,
                        defenseBonus: 1,
                        damageReduction: 1,
                        handicap: 1,
                        equipped: true,
                    },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.acrobatics.value).to.equal(5);
            expect(subject.derivedValues.defense.value).to.equal(17);
            expect(subject.damageReduction).to.equal(1);
            expect(subject.attacks.find((a) => a.name === "waffenlos")?.weaponSpeed).to.equal(6);
        });

        it(
            "should account for skill modifications to weapons",
            withActor(async (actor) => {
                actor.update({
                    system: {
                        attributes: {
                            strength: { initial: 2, advances: 0 },
                            agility: { initial: 2, advances: 0 },
                        },
                    },
                });
                const weapon = (
                    await actor.createEmbeddedDocuments("Item", [
                        {
                            type: "weapon",
                            name: "Skill Booster",
                            system: {
                                equipped: true,
                                skillMod: 2,
                                skill: "blades",
                                attribute1: "strength",
                                attribute2: "agility",
                            },
                        },
                    ])
                )[0];
                actor.prepareBaseData();
                await actor.prepareEmbeddedDocuments();
                actor.prepareDerivedData();

                expect(actor.attacks.find((a: Attack) => a.name === weapon.name)?.skill.value).to.equal(6);
            })
        );

        it("should account for modifications from npc features", async () => {
            const subject = await createNpc("NpcWithFeature");
            (subject.system as NpcDataModel).attributes.agility.updateSource({ value: 3 });
            (subject.system as NpcDataModel).attributes.strength.updateSource({ value: 5 });
            (subject.system as NpcDataModel).updateSource({ damageReduction: { value: 2 } });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "npcfeature",
                    name: "Elefant Skin",
                    system: {
                        modifier: "SR +2",
                    },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.damageReduction).to.equal(4);
        });

        it("should cap modifiers for skills", async () => {
            const subject = await createActor("Overmagiced");
            subject.updateSource({
                system: {
                    attributes: {
                        intuition: { initial: 2, advances: 0 },
                        mind: { initial: 3, advances: 0 },
                    },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "spelleffect",
                    name: "Superempathy",
                    system: { active: true, modifier: "empathy +1" },
                },
            ]);
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "spelleffect",
                    name: "MegaEmpathy",
                    system: { active: true, modifier: "empathy +3" },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.skills.empathy.value).to.equal(8);
        });
    });

    describe("Modifiable splinterpoint bonus", () => {
        async function getActorWithMasteryModifying(modifier: string) {
            const subject = await createActor("SplinterpointBonusCharacter");
            (subject.system as CharacterDataModel).attributes.intuition.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).attributes.charisma.updateSource({ initial: 6, advances: 0 });
            (subject.system as CharacterDataModel).updateSource({ splinterpoints: { value: 3, max: 3 } });
            (subject.system as CharacterDataModel).updateSource({
                skills: {
                    ...subject.system.skills,
                    eloquence: { points: 9, value: 17 },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "mastery",
                    name: "Begabter Lügner",
                    system: {
                        skill: "eloquence",
                        level: 2,
                        modifier,
                    },
                },
            ]);
            return subject;
        }

        it("should process a splinterpoint modifier correctly", async () => {
            const subject = await getActorWithMasteryModifying(
                "splinterpoints.bonus Fertigkeit='Redegewandtheit' +${AUS}"
            );

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            const splinterpointSpender = subject.spendSplinterpoint();
            expect(splinterpointSpender.pointSpent).to.be.true;
            expect(splinterpointSpender.getBonus("eloquence")).to.equal(subject.attributes.charisma.value);
        });

        it("should account for a global bonus modifier", async () => {
            const subject = await getActorWithMasteryModifying("splinterpoints.bonus 4");

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            const splinterpointSpender = subject.spendSplinterpoint();
            expect(splinterpointSpender.pointSpent).to.be.true;
            expect(splinterpointSpender.getBonus("eloquence")).to.equal(4);
        });

        it("should only use the highest splinterpoint bonus", async () => {
            const subject = await getActorWithMasteryModifying(
                "splinterpoints.bonus Fertigkeit='Redegewandtheit' ${AUS}"
            );
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "mastery",
                    name: "Begabter Redner",
                    system: {
                        skill: "eloquence",
                        level: 2,
                        modifier: "splinterpoints.bonus skill='eloquence' 7",
                    },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            const splinterpointSpender = subject.spendSplinterpoint();
            expect(splinterpointSpender.pointSpent).to.be.true;
            expect(splinterpointSpender.getBonus("eloquence")).to.equal(7);
        });
    });

    describe("Derived Value modifiers", () => {
        it(
            "should modify speed",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        size: 5,
                        attributes: {
                            agility: { initial: 3, advances: 0 },
                        },
                    },
                });
                actor.createEmbeddedDocuments("Item", [
                    {
                        type: "spelleffect",
                        name: "Haste",
                        //all three must take effect to achieve an overall modifier of 1.5
                        system: { modifier: "actor.speed.multiplier 1.25, gsw.mult 0.6, speed.multiplier: 2" },
                    },
                ]);
                actor.prepareBaseData();
                actor.prepareEmbeddedDocuments();
                actor.prepareDerivedData();
                actor.modifier.add("actor.speed.multiplier", { name: "Haste", type: "magic" }, of(1.5), null, false);

                expect(actor.derivedValues.speed.value).to.equal(12);
            })
        );
    });

    describe("Wound malus", () => {
        async function setUpActor() {
            const actor = await createActor("WoundedCharacter");
            (actor.system as CharacterDataModel).attributes.agility.updateSource({ initial: 2, advances: 0 });
            (actor.system as CharacterDataModel).attributes.strength.updateSource({ initial: 2, advances: 0 });
            (actor.system as CharacterDataModel).attributes.intuition.updateSource({ initial: 2, advances: 0 });
            (actor.system as CharacterDataModel).updateSource({
                skills: {
                    ...actor.system.skills,
                    acrobatics: { points: 2, value: 6 },
                },
            });
            return actor;
        }

        async function addWoundedEffect(actor: SplittermondActor, level: number) {
            return await actor.createEmbeddedDocuments("Item", [
                {
                    type: "statuseffect",
                    name: "Verwundung",
                    system: {
                        modifier: "woundMalus.levelMod value='+1'",
                        level: level,
                    },
                },
            ]);
        }

        async function makeWeak(actor: SplittermondActor) {
            return await actor.createEmbeddedDocuments("Item", [
                {
                    type: "strength",
                    name: "Schwächlich",
                    system: {
                        modifier: "actor.woundMalus.nbrLevels value='+3'",
                    },
                },
            ]);
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

        describe("With 3 levels of health", () => {
            [
                [0, 0],
                [1, 2],
                [2, 8],
                [3, 8],
            ].forEach(([level, reduction]) => {
                describe(`Wound malus level ${level}`, () => {
                    it(`should apply wound malus at perfect health`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);
                        await makeWeak(subject);

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
                    });
                    it(`should apply wound malus with 1hp missing`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);
                        await makeWeak(subject);
                        await subject.consumeCost("health", "1V1", "");

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
                    });

                    it(`should apply wound malus with full bar missing`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);
                        await makeWeak(subject);
                        await subject.consumeCost("health", `7V7`, "");

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
                    });
                });
            });
        });

        describe("With 5 levels of health", () => {
            [
                [0, 0],
                [1, 1],
                [2, 2],
                [3, 4],
                [4, 8],
                [5, 8],
            ].forEach(([level, reduction]) => {
                describe(`Wound malus level ${level}`, () => {
                    it(`should apply at perfect health`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
                    });

                    it(`should apply with 1hp missing`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);
                        await subject.consumeCost("health", "1V1", "");

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
                    });

                    it(`should apply with full bar missing`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);
                        await subject.consumeCost("health", `7V7`, "");

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.skills.acrobatics.value).to.equal(6 - reduction);
                    });

                    it(`should apply initiative penalty at perfect health`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.derivedValues.initiative.value).to.equal(8 + reduction);
                    });

                    it(`should apply initiative penalty with 1hp missing`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);
                        await subject.consumeCost("health", "1V1", "");

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.derivedValues.initiative.value).to.equal(8 + reduction);
                    });

                    it(`should apply initiative penalty with full bar missing`, async () => {
                        const subject = await setUpActor();
                        await addWoundedEffect(subject, level);
                        await subject.consumeCost("health", `7V7`, "");

                        subject.prepareBaseData();
                        await subject.prepareEmbeddedDocuments();
                        subject.prepareDerivedData();

                        expect(subject.derivedValues.initiative.value).to.equal(8 + reduction);
                    });
                });
            });
        });
    });

    describe("Parsed Modifiers", () => {
        async function defaultActor(name: string, modifier: string) {
            const subject = await createActor(name);
            subject.updateSource({
                system: {
                    attributes: {
                        constitution: { initial: 2, advances: 0 },
                        intuition: { initial: 2, advances: 0 },
                        mind: { initial: 3, advances: 0 },
                    },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "strength",
                    name: "DerivedValueEnhancer",
                    system: { modifier },
                },
            ]);
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
                    difficulty: "18",
                },
            };
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "mastery",
                    name: "Sparsamer Zauberer",
                    system: {
                        skill: "deathmagic",
                        level: 1,
                        modifier: "focus.reduction skill=deathmagic 2V1",
                    },
                },
            ]);
            await subject.createEmbeddedDocuments("Item", [spellDefinition]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.items.find((i) => i.name == spellDefinition.name)?.costs).to.equal("2V1");
        });
        it("should handle foreduction correctly for a type only modifier", async () => {
            const subject = await defaultActor("SpellMaster", "");
            const spellDefinition = {
                type: "spell",
                name: "Pseudotodeszauber",
                system: {
                    skill: "deathmagic",
                    spellType: "lässt Siechen",
                    level: 1,
                    costs: "4V2",
                    difficulty: "18",
                },
            };
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "mastery",
                    name: "Sparsamer Zauberer",
                    system: {
                        skill: "deathmagic",
                        level: 1,
                        modifier: "focus.reduction Typus='lässt Siechen' 2V1",
                    },
                },
            ]);
            await subject.createEmbeddedDocuments("Item", [spellDefinition]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.items.find((i) => i.name == spellDefinition.name)?.costs).to.equal("2V1");
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
                    difficulty: "18",
                },
            };
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "mastery",
                    name: "Sparsamer Zauberer",
                    system: {
                        skill: "deathmagic",
                        level: 1,
                        modifier: "focus.reduction Fertigkeit='Todesmagie' 1",
                    },
                },
            ]);
            await subject.createEmbeddedDocuments("Item", [spellDefinition]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.items.find((i) => i.name == spellDefinition.name)?.costs).to.equal("3V2");
        });

        it("should modify npc attack values", async () => {
            const subject = await defaultActor("Attacking NPC", "npcattacks -1");
            const npcAttackDefinition = {
                type: "npcattack",
                name: "Körper",
                system: {
                    skillValue: 7,
                },
            };
            const npcAttacks = await subject.createEmbeddedDocuments("Item", [npcAttackDefinition]);
            const npcAttack = npcAttacks[0];

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            expect(subject.attacks.find((a) => a.toObject().id === npcAttack.id)?.skill.value).to.equal(
                npcAttackDefinition.system.skillValue - 1
            );
        });

        it("should add item modifiers", async () => {
            const subject = await createActor("WeaponizedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).attributes.strength.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).updateSource({
                skills: {
                    ...subject.system.skills,
                    blades: { points: 2, value: 6 },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "weapon",
                    name: "Spear of Destiny",
                    system: {
                        skill: "staff",
                        damage: DamageModel.from("3"),
                        equipped: true,
                        attribute1: "strength",
                        attribute2: "agility",
                        weaponSpeed: 6,
                    },
                },
                {
                    type: "strength",
                    name: "Murderous Strength",
                    system: { modifier: "item.damage itemType='weapon' damageType='physical' +3" },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();
            expect(subject.attacks.find((a) => a.name === "Spear of Destiny")?.damage).to.equal("6");
        });

        it("should respond to cast duration modifiers", async () => {
            const subject = await createActor("WeaponizedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).attributes.strength.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).updateSource({
                skills: {
                    ...subject.system.skills,
                    blades: { points: 2, value: 6 },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "spell",
                    name: "Spear of Light",
                    system: {
                        skill: "lightmagic",
                        damageType: "light",
                        damage: DamageModel.from("8d6"),
                        castDuration: {
                            unit: "T",
                            value: 10,
                        },
                    },
                },
                {
                    type: "strength",
                    name: "Absurd Fastness",
                    system: {
                        modifier:
                            "item.castDuration unit='T' itemType='spell' -1, item.castDuration.multiplier itemType='spell' 0.5",
                    },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();

            const itemUnderTest = subject.items.find((i) => i.name === "Spear of Light") as SplittermondSpellItem;
            expect(itemUnderTest.system.castDuration.inTicks).to.equal(4);
        });
    });

    describe("Roll expressions", () => {
        it("should be able to predict parenthetical expressions correctly", async () => {
            expect(isLessThanZero(roll(foundryApi.roll("-2d6")))).to.be.true;
            expect(isGreaterZero(roll(foundryApi.roll("-2d6")))).to.be.false;
        });

        it("should be able to evaluate parenthetical expressions correctly", async () => {
            expect(evaluate(roll(foundryApi.roll("-2d6"))))
                .to.be.above(-13)
                .below(0);
        });

        it("should be able to predict nested expressions correctly ", async () => {
            expect(isLessThanZero(roll(foundryApi.roll("2 + -1 * 3d6")))).to.be.true;
            expect(isGreaterZero(roll(foundryApi.roll("-2d6")))).to.be.false;
        });

        it("should be able to produce a valid roll expression", async () => {
            //is (1*14 + |-4|/1) - (2*3 + 1)
            const expression = minus(
                plus(times(roll(foundryApi.roll("1d1")), of(14)), dividedBy(abs(of(-4)), roll(foundryApi.roll("1d1")))),
                plus(times(of(2), ref("value", { value: 3 }, "value")), ref("value", { value: 1 }, "value"))
            );

            const rollFormula = toRollFormula(expression);
            const rollObject = foundryApi.roll(...rollFormula);
            const evaluated = await rollObject.evaluate();

            expect(rollFormula[0]).to.equal("((1d1 * 14) + (abs(-4) / 1d1)) - ((2 * @value0) + @value1)");
            expect(evaluated.total, `${asString(expression)} should equal`).to.equal(11);
        });

        it("should be able to parse a valid roll expression", async () => {
            const roll = foundryApi.roll("((1d1 * 14) + (abs(-4) / 1d1)) - ((2 * @value0) + @value1)", {
                value0: "3",
                value1: "1",
            });

            const mapped = mapRoll(roll);
            const evaluated = evaluate(mapped);

            expect(evaluated).to.equal(11);
        });
    });

    describe("Skill modifiers", () => {
        describe("Skill group modifications", () => {
            (["magic", "general"] as const).forEach((skillGroup) => {
                it(
                    `should modify skill group ${skillGroup}`,
                    withActor(async (actor) => {
                        await actor.createEmbeddedDocuments("Item", [
                            {
                                type: "strength",
                                name: "Skill Booster",
                                system: { modifier: `skills.${skillGroup} +2` },
                            },
                        ]);
                        actor.prepareBaseData();
                        await actor.prepareEmbeddedDocuments();
                        actor.prepareDerivedData();

                        splittermond.skillGroups[skillGroup].forEach((skill) => {
                            expect(actor.skills[skill].value, `Modified ${skill}`).to.equal(6);
                        });
                    })
                );
            });

            it(
                `should modify skill group fighting`,
                withActor(async (actor) => {
                    const weapon = (
                        await actor.createEmbeddedDocuments("Item", [
                            {
                                type: "weapon",
                                name: "Skill Booster",
                                system: {
                                    equipped: true,
                                    modifier: `skills.fighting +2`,
                                    skill: "blades",
                                    attribute1: "strength",
                                    attribute2: "agility",
                                },
                            },
                        ])
                    )[0];
                    actor.prepareBaseData();
                    await actor.prepareEmbeddedDocuments();
                    actor.prepareDerivedData();

                    expect(actor.attacks.find((a: Attack) => a.name === weapon.name)?.skill.value).to.equal(6);
                })
            );
        });
        //sample some skills, we'don't want a hundred identical tests here.
        const nonFightingSkills = [
            ...splittermond.skillGroups.magic.slice(0, 5),
            ...splittermond.skillGroups.general.slice(0, 5),
        ];
        describe("Direct skill modifications", () => {
            nonFightingSkills.forEach((skill) => {
                it(
                    `should modify skill ${skill}`,
                    withActor(async (actor) => {
                        const originalValue = actor.skills[skill].value;
                        await actor.createEmbeddedDocuments("Item", [
                            {
                                type: "strength",
                                name: "Skill Booster",
                                system: { modifier: `${skill} +2` },
                            },
                        ]);
                        actor.prepareBaseData();
                        await actor.prepareEmbeddedDocuments();
                        actor.prepareDerivedData();

                        expect(actor.skills[skill].value).to.equal(originalValue + 2);
                    })
                );
            });
        });
        describe("Skill modification via attribute", () => {
            nonFightingSkills.forEach((skill) => {
                it(
                    `should modify skill ${skill}`,
                    withActor(async (actor) => {
                        const originalValue = actor.skills[skill].value;
                        const localizedSkill = foundryApi.localize(`splittermond.skillLabel.${skill}`);
                        await actor.createEmbeddedDocuments("Item", [
                            {
                                type: "strength",
                                name: "Skill Booster",
                                system: { modifier: `skills Fertigkeit="${localizedSkill}" +2` },
                            },
                        ]);
                        actor.prepareBaseData();
                        await actor.prepareEmbeddedDocuments();
                        actor.prepareDerivedData();

                        expect(actor.skills[skill].value).to.equal(originalValue + 2);
                    })
                );
            });
        });
        it(
            "should modify all skills with via Attribute1",
            withActor(async (actor) => {
                return attributeTest(actor, `skills Attribut1="Mystik" +2`);
            })
        );
        it(
            "should modify all skills via Attribute2",
            withActor(async (actor) => {
                return attributeTest(actor, 'skills Attribut2="Mystik" +2');
            })
        );
        async function attributeTest(actor: SplittermondActor, modifierInput: string) {
            await actor.createEmbeddedDocuments("Item", [
                {
                    type: "strength",
                    name: "Skill Booster",
                    system: { modifier: modifierInput },
                },
            ]);
            actor.prepareBaseData();
            await actor.prepareEmbeddedDocuments();
            actor.prepareDerivedData();

            Object.entries(splittermond.skillAttributes)
                .filter(([_, value]) => value.includes("mystic"))
                .map(([skill, _]) => skill)
                .forEach((skill) => {
                    expect(actor.skills[skill].value, `Skill ${skill} is modified`).to.be.at.least(6);
                });
        }
    });

    describe("Check modifiers", () => {
        it(
            "should modify check results",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        attributes: {
                            strength: { initial: 4, advances: 0 },
                            agility: { initial: 4, advances: 0 },
                        },
                        skills: { acrobatics: { points: 6 } },
                    },
                });
                await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "strength",
                        name: "Check Booster",
                        system: {
                            modifier: `check.result Kategorie='Gelungen' Fertigkeit='Akrobatik' Typus='Fertigkeit' +2`,
                        },
                    },
                ]);
                actor.prepareBaseData();
                await actor.prepareEmbeddedDocuments();
                actor.prepareDerivedData();

                await actor.skills.acrobatics.roll({ rollType: "safety", askUser: false });

                await passesEventually(() => {
                    const messages = foundryApi.messages as unknown as Collection<FoundryChatMessage>;
                    const lastMessage = Array.from(messages.contents)
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .find((m) => m.speaker?.actor === actor.id);
                    const messageContent = lastMessage?.content ?? "";
                    const total = messageContent.match(/(?<=<div class="roll-total">)\d+(?=<\/div>)/)?.[0];
                    const degreeOfSuccess = messageContent.match(/(?<=<strong>)\d+(?=\s+EG<\/strong>)/)?.[0];
                    const rollTotal = parseInt(total ?? "") - splittermond.check.defaultDifficulty;
                    const rollDegreeOfSuccess = Math.floor(rollTotal / 3);
                    expect(total, "total exists").to.not.be.undefined;
                    expect(degreeOfSuccess, "degrees of success exist").to.not.be.undefined;
                    expect(Number.isFinite(rollTotal), "roll total is a number").to.be.true;
                    expect(parseInt(degreeOfSuccess ?? "0")).to.equal(rollDegreeOfSuccess + 2);
                });
            })
        );
    });

    describe("Item modifiers", () => {
        it("should account for modifications to weapons", async () => {
            const subject = await createActor("WeaponizedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).attributes.strength.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).updateSource({
                skills: {
                    ...subject.system.skills,
                    blades: { points: 2, value: 6 },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "weapon",
                    name: "Lance of Longinus",
                    system: {
                        skill: "blades",
                        damage: DamageModel.from("3"),
                        equipped: true,
                        attribute1: "strength",
                        attribute2: "agility",
                        weaponSpeed: 6,
                    },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();
            subject.modifier.add(
                "item.damage",
                {
                    item: "Lance of Longinus",
                    name: "Mastery",
                    type: "magic",
                },
                of(1),
                null,
                false
            );
            subject.modifier.add("item.damage", { name: "Mystery", type: "magic" }, of(2), null, false);
            subject.modifier.add("item.weaponspeed", { name: "Mystery", type: "magic" }, of(2), null, false);

            expect(subject.attacks.find((a) => a.name === "Lance of Longinus")?.damage).to.equal("6");
            expect(subject.attacks.find((a) => a.name === "Lance of Longinus")?.weaponSpeed).to.equal(4);
        });

        it("should account for modifications to shields", async () => {
            const subject = await createActor("WeaponizedCharacter");
            (subject.system as CharacterDataModel).attributes.agility.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).attributes.strength.updateSource({ initial: 2, advances: 0 });
            (subject.system as CharacterDataModel).updateSource({
                skills: {
                    ...subject.system.skills,
                    blades: { points: 2, value: 6 },
                },
            });
            await subject.createEmbeddedDocuments("Item", [
                {
                    type: "weapon",
                    name: "Lance of Longinus",
                    system: {
                        skill: "blades",
                        damage: "3",
                        equipped: true,
                        attribute1: "strength",
                        attribute2: "agility",
                        features: "Scharf 1",
                        weaponSpeed: 6,
                    },
                },
            ]);

            subject.prepareBaseData();
            await subject.prepareEmbeddedDocuments();
            subject.prepareDerivedData();
            subject.modifier.add(
                "item.damage",
                {
                    item: "Lance of Longinus",
                    name: "Mastery",
                    type: "magic",
                },
                of(1),
                null,
                false
            );
            subject.modifier.add(
                "item.mergeFeature",
                {
                    name: "Mystery",
                    feature: "Scharf",
                    item: "Lance of Longinus",
                    type: "magic",
                },
                of(2),
                null,
                false
            );

            expect(subject.attacks.find((a) => a.name === "Lance of Longinus")?.getForDamageRoll().otherComponents).to
                .not.be.empty;
            expect(subject.attacks.find((a) => a.name === "Lance of Longinus")?.features).to.equal("Scharf 2");
        });
    });
}
