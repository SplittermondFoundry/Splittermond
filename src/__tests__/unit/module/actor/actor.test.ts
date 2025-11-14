import "../../foundryMocks.js";
import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import SplittermondActor from "../../../../module/actor/actor.js";
import SplittermondItem from "../../../../module/item/item.js";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import sinon from "sinon";
import { HealthDataModel } from "module/actor/dataModel/HealthDataModel";
import { FocusDataModel } from "module/actor/dataModel/FocusSchemaModel";
import { CharacterAttribute } from "module/actor/dataModel/CharacterAttribute";
import { foundryApi } from "module/api/foundryApi";
import { calculateHeroLevels } from "module/actor/actor";
import { asMock } from "../../settingsMock";
import { settings } from "module/settings";
import { JSDOM } from "jsdom";
import { StrengthDataModel } from "module/item/dataModel/StrengthDataModel";
import Modifier from "module/modifiers/impl/modifier";
import { of } from "module/modifiers/expressions/scalar";
import { actualAddModifierFunction } from "module/actor/addModifierAdapter";
import { initializeModifiers } from "module/modifiers";
import { createTestRoll, stubFoundryRoll } from "../../RollMock";
import type { User } from "module/api/foundryTypes";
import { createHtml } from "../../../handlebarHarness";

declare const global: any;

describe("SplittermondActor", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    let actor: SplittermondActor;

    beforeEach(() => {
        global.Actor.prototype.prepareBaseData = () => {};
        actor = new SplittermondActor({});
        actor.system = new CharacterDataModel({
            splinterpoints: { value: 3, max: 3 },
            experience: { heroLevel: 1, free: 0, spent: 0, nextLevelValue: 100 },
            species: { value: "Human", size: 5 },
            sex: "Male",
            ancestry: "Commoner",
            culture: "Urban",
            education: "Scholar",
            biography: "<p>Test biography</p>",
            attributes: {
                charisma: new CharacterAttribute({ initial: 2, species: 0, advances: 0 }),
                agility: new CharacterAttribute({ initial: 3, species: 0, advances: 0 }),
                intuition: new CharacterAttribute({ initial: 2, species: 0, advances: 0 }),
                constitution: new CharacterAttribute({ initial: 3, species: 0, advances: 0 }),
                mystic: new CharacterAttribute({ initial: 1, species: 0, advances: 0 }),
                strength: new CharacterAttribute({ initial: 4, species: 0, advances: 0 }),
                mind: new CharacterAttribute({ initial: 2, species: 0, advances: 0 }),
                willpower: new CharacterAttribute({ initial: 3, species: 0, advances: 0 }),
            },
            skills: {
                melee: { points: 0, value: 0 },
                slashing: { points: 0, value: 0 },
                chains: { points: 0, value: 0 },
                blades: { points: 0, value: 0 },
                longrange: { points: 0, value: 0 },
                staffs: { points: 0, value: 0 },
                throwing: { points: 0, value: 0 },
                acrobatics: { points: 0, value: 0 },
                alchemy: { points: 0, value: 0 },
                leadership: { points: 0, value: 0 },
                arcanelore: { points: 0, value: 0 },
                athletics: { points: 0, value: 0 },
                performance: { points: 0, value: 0 },
                diplomacy: { points: 0, value: 0 },
                clscraft: { points: 0, value: 0 },
                empathy: { points: 0, value: 0 },
                determination: { points: 0, value: 0 },
                dexterity: { points: 0, value: 0 },
                history: { points: 0, value: 0 },
                craftmanship: { points: 0, value: 0 },
                heal: { points: 0, value: 0 },
                stealth: { points: 0, value: 0 },
                hunting: { points: 0, value: 0 },
                countrylore: { points: 0, value: 0 },
                nature: { points: 0, value: 0 },
                eloquence: { points: 0, value: 0 },
                locksntraps: { points: 0, value: 0 },
                swim: { points: 0, value: 0 },
                seafaring: { points: 0, value: 0 },
                streetlore: { points: 0, value: 0 },
                animals: { points: 0, value: 0 },
                survival: { points: 0, value: 0 },
                perception: { points: 0, value: 0 },
                endurance: { points: 0, value: 0 },
                antimagic: { points: 0, value: 0 },
                controlmagic: { points: 0, value: 0 },
                motionmagic: { points: 0, value: 0 },
                insightmagic: { points: 0, value: 0 },
                stonemagic: { points: 0, value: 0 },
                firemagic: { points: 0, value: 0 },
                healmagic: { points: 0, value: 0 },
                illusionmagic: { points: 0, value: 0 },
                combatmagic: { points: 0, value: 0 },
                lightmagic: { points: 0, value: 0 },
                naturemagic: { points: 0, value: 0 },
                shadowmagic: { points: 0, value: 0 },
                fatemagic: { points: 0, value: 0 },
                protectionmagic: { points: 0, value: 0 },
                enhancemagic: { points: 0, value: 0 },
                deathmagic: { points: 0, value: 0 },
                transformationmagic: { points: 0 },
                watermagic: { points: 0 },
                windmagic: { points: 0 },
            },
            health: new HealthDataModel({
                consumed: { value: 0 },
                exhausted: { value: 0 },
                channeled: { entries: [] },
            }),
            focus: new FocusDataModel({ consumed: { value: 0 }, exhausted: { value: 0 }, channeled: { entries: [] } }),
            currency: { S: 0, L: 0, T: 0 },
        });
        Object.defineProperty(actor, "items", { value: [], writable: true, configurable: true });
        // Mock update to avoid side effects and allow assertions
        sandbox.spy(actor, "update");
    });

    describe("Spell Cost Reduction", () => {
        it("should initialize spell cost management", () => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            actor.prepareBaseData();

            expect("spellCostReduction" in actor.system, "Spell cost reduction is defined").to.be.true;
            expect("spellEnhancedCostReduction" in actor.system, "Spell enhanced cost reduction is defined").to.be.true;
        });
    });

    describe("Hero Level Calculation", () => {
        it("should calculate hero levels correctly", () => {
            asMock(settings.registerNumber).returnsSetting(1);
            const result = calculateHeroLevels();
            expect(result).to.deep.equal([0, 100, 300, 600]);
        });

        it("should apply hero level multiplier", () => {
            asMock(settings.registerNumber).returnsSetting(2);
            const result = calculateHeroLevels();
            expect(result).to.deep.equal([0, 200, 600, 1200]);
        });
    });

    describe("Splinterpoints", () => {
        it("should return splinterpoints with default values", () => {
            asCharacter(actor).updateSource({ splinterpoints: { value: 2, max: 3 } });
            const splinterpoints = actor.splinterpoints;
            expect(splinterpoints).to.deep.equal({ value: 2, max: 3 });
        });

        it("should spend a splinterpoint and return the correct bonus", () => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            actor.prepareBaseData();
            asCharacter(actor).updateSource({ splinterpoints: { value: 1, max: 3 } });
            const result = actor.spendSplinterpoint();
            expect(result.pointSpent).to.be.true;
            expect(result.getBonus("health")).to.equal(5);
            expect(asCharacter(actor).splinterpoints.value).to.equal(0);
        });

        it("should not spend a splinterpoint if none are available", () => {
            asCharacter(actor).updateSource({ splinterpoints: { value: 0, max: 3 } });
            const result = actor.spendSplinterpoint();
            expect(result.pointSpent).to.be.false;
            expect(asCharacter(actor).splinterpoints.value).to.equal(0);
        });
    });

    describe("Modifiers", () => {
        enableModifiers();
        it("should add a modifier to the actor", () => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            sandbox.stub(foundryApi, "format").callsFake((key) => key);
            sandbox.stub(foundryApi, "reportError").callsFake(() => {});
            const item = sandbox.createStubInstance(SplittermondItem);
            actor.prepareBaseData();
            actor.addModifier(item, "test-modifier +2", "innate");
            const modifiers = actor.modifier.getForId("test-modifier").getModifiers();
            expect(modifiers).to.not.be.empty;
        });
    });

    describe("Health and Focus Management", () => {
        beforeEach(() => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            global.duplicate = (a: object) => JSON.parse(JSON.stringify(a));
        });
        afterEach(() => {
            global.duplicate = undefined;
            global.foundry.applications.api.DialogV2.prototype.render = async function () {};
        });

        function autoApproveLongRest() {
            global.foundry.applications.api.DialogV2.prototype.render = async function () {
                await this.options.submit("yes", null);
            };
        }

        it("should initialize health and focus data", () => {
            actor.prepareBaseData();
            expect(actor.system.health).to.have.property("consumed");
            expect(actor.system.focus).to.have.property("consumed");
        });

        it("should handle short rest correctly", async () => {
            actor.system.focus.updateSource({ exhausted: { value: 5 } });
            actor.system.health.updateSource({ exhausted: { value: 3 } });
            actor.system.focus.updateSource({ consumed: { value: 5 } });
            actor.system.health.updateSource({ consumed: { value: 3 } });
            await actor.shortRest();
            expect(actor.system.focus.exhausted.value).to.equal(0);
            expect(actor.system.health.exhausted.value).to.equal(0);
            expect(actor.system.focus.consumed.value).to.equal(5);
            expect(actor.system.health.consumed.value).to.equal(3);
            // Ensure update was called
            expect((actor.update as sinon.SinonSpy).calledOnce).to.be.true;
        });

        it("should handle long rest correctly", async () => {
            autoApproveLongRest();
            actor.system.focus.updateSource({ exhausted: { value: 5 } });
            actor.system.health.updateSource({ exhausted: { value: 3 } });
            actor.system.focus.updateSource({ consumed: { value: 10 } });
            actor.system.health.updateSource({ consumed: { value: 8 } });
            actor.system.attributes.willpower.updateSource({ initial: 2, advances: 0 });
            actor.system.attributes.constitution.updateSource({ initial: 3, advances: 0 });
            actor.prepareBaseData();

            await actor.longRest();

            expect(actor.system.focus.consumed.value).to.equal(6);
            expect(actor.system.health.consumed.value).to.equal(2);
            // Ensure update was called
            expect((actor.update as sinon.SinonSpy).calledOnce).to.be.true;
        });

        it("should clear channeled health and focus on long rest", async () => {
            autoApproveLongRest();
            actor.system.focus.updateSource({ channeled: { entries: [{ description: "Zauber", costs: 7 }] } });
            actor.system.health.updateSource({ channeled: { entries: [{ description: "Seuche", costs: 20 }] } });
            actor.prepareBaseData();

            await actor.longRest();

            expect(actor.system.health.channeled.entries).to.be.empty;
            expect(actor.system.focus.channeled.entries).to.be.empty;
        });

        (
            [
                [-1, 13],
                [0, 10],
                [1, 7],
                [2, 4],
                [3, 1],
                [5, 0],
            ] as const
        ).forEach(([multiplier, expected]) => {
            it(`should use modified health regeneration multiplier of ${multiplier}`, async () => {
                autoApproveLongRest();
                actor.system.health.updateSource({ consumed: { value: 10 } });
                actor.system.attributes.constitution.updateSource({ initial: 3, advances: 0 });
                actor.prepareBaseData();
                actor.modifier.addModifier(
                    new Modifier(
                        "actor.healthregeneration.multiplier",
                        of(multiplier),
                        {
                            name: "Test",
                            type: "innate",
                        },
                        null
                    )
                );

                await actor.longRest();

                expect(actor.system.health.consumed.value).to.equal(expected);
            });
        });

        it("should have a modifiable health regeneration bonus", async () => {
            autoApproveLongRest();
            actor.system.health.updateSource({ consumed: { value: 10 } });
            actor.system.attributes.constitution.updateSource({ initial: 3, advances: 0 });
            actor.prepareBaseData();
            actor.modifier.addModifier(
                new Modifier(
                    "actor.healthregeneration.bonus",
                    of(2),
                    {
                        name: "Test",
                        type: "innate",
                    },
                    null
                )
            );

            await actor.longRest();

            expect(actor.system.health.consumed.value).to.equal(2);
        });

        it("should have a modifiable focus regeneration multiplier", async () => {
            autoApproveLongRest();
            actor.system.focus.updateSource({ consumed: { value: 10 } });
            actor.system.attributes.willpower.updateSource({ initial: 3, advances: 0 });
            actor.prepareBaseData();
            actor.modifier.addModifier(
                new Modifier(
                    "actor.focusregeneration.multiplier",
                    of(3),
                    {
                        name: "Test",
                        type: "innate",
                    },
                    null
                )
            );

            await actor.longRest();

            expect(actor.system.focus.consumed.value).to.equal(1);
        });

        it("should have a modifiable focus regeneration bonus", async () => {
            autoApproveLongRest();
            actor.system.focus.updateSource({ consumed: { value: 10 } });
            actor.system.attributes.constitution.updateSource({ initial: 3, advances: 0 });
            actor.prepareBaseData();
            actor.modifier.addModifier(
                new Modifier(
                    "actor.focusregeneration.bonus",
                    of(2),
                    {
                        name: "Test",
                        type: "innate",
                    },
                    null
                )
            );

            await actor.longRest();

            expect(actor.system.focus.consumed.value).to.equal(2);
        });

        it("should not prompt for long rest when overridden", async () => {
            actor.system.focus.updateSource({ channeled: { entries: [{ description: "Zauber", costs: 7 }] } });
            actor.system.health.updateSource({ channeled: { entries: [{ description: "Seuche", costs: 20 }] } });
            actor.prepareBaseData();

            await actor.longRest(false, false);

            expect(actor.system.health.channeled.entries).to.be.empty;
            expect(actor.system.focus.channeled.entries).not.to.be.empty;
        });
    });

    describe("Active Defense", () => {
        it("should roll active defense", async () => {
            const item = { roll: () => Promise.resolve("rolled") };
            const result = await actor.rollActiveDefense("defense", item);
            expect(result).to.equal("rolled");
        });
    });

    describe("protectedDamageReduction", () => {
        beforeEach(() => {
            // Default: stableProtectsAllReduction true
            asMock(settings.registerBoolean).returnsSetting(true);
        });

        it("returns 0 if no item protects damage reduction", () => {
            actor.items = [
                {
                    system: {
                        features: { hasFeature: () => false },
                        equipped: true,
                        damageReduction: 2,
                    },
                },
            ] as any;
            expect(actor.protectedDamageReduction).to.equal(0);
        });

        it("returns damageReduction if item protects and getStableProtectsAllReduction is true", () => {
            asMock(settings.registerBoolean).returnsSetting(true);
            // Stub damageReduction getter
            sandbox.stub(actor, "damageReduction").get(() => 7);
            actor.items = [
                {
                    system: {
                        features: { hasFeature: (f: string) => f === "Stabil" },
                        equipped: true,
                        damageReduction: 2,
                    },
                },
            ] as any;
            expect(actor.protectedDamageReduction).to.equal(7);
        });

        it("returns sum of protected items' damageReduction if getStableProtectsAllReduction is false", () => {
            asMock(settings.registerBoolean).returnsSetting(false);
            sandbox.stub(actor, "damageReduction").get(() => 15);
            actor.items = [
                {
                    system: {
                        features: { hasFeature: (f: string) => f === "Stabil" },
                        equipped: true,
                        damageReduction: 2,
                    },
                },
                {
                    system: {
                        features: { hasFeature: (f: string) => f === "Stabil" },
                        equipped: true,
                        damageReduction: 3,
                    },
                },
            ] as any;
            expect(actor.protectedDamageReduction).to.equal(5);
        });

        it("returns 0 if no equipped item has Stabil feature", () => {
            actor.items = [
                {
                    system: {
                        features: { hasFeature: () => false },
                        equipped: false,
                        damageReduction: 2,
                    },
                },
            ] as any;
            expect(actor.protectedDamageReduction).to.equal(0);
        });
    });

    describe("Fumbles", () => {
        enableModifiers();
        beforeEach(() => {
            const speaker = { actor: actor.id, token: "dfad", scene: "dfad", alias: actor.name };
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            sandbox.stub(foundryApi, "format").callsFake((key) => key);
            sandbox.stub(foundryApi, "reportError");
            sandbox.stub(foundryApi, "chatMessageTypes").get(() => ({ OTHER: 1 }));
            sandbox.stub(foundryApi, "currentUser").get(() => ({ id: "user1" }) as User);
            sandbox.stub(foundryApi, "getSpeaker").returns(speaker);
            sandbox.stub(foundryApi, "renderer").get(() => async (template: string, data: object) => {
                const fixedPath = template.replace("systems/splittermond/", "");
                return createHtml(fixedPath, data);
            });
            actor.prepareBaseData();
        });

        afterEach(() => {
            global.foundry.applications.api.DialogV2.prototype.render = function () {};
        });

        it("should take fumble lowering modifier into account", async () => {
            const testRoll = createTestRoll("2d10", [10, 10]); //Will set the fumble result to 20!
            stubFoundryRoll(testRoll, sandbox);
            const chatStub = sandbox.stub(foundryApi, "createChatMessage");

            const item = sandbox.createStubInstance(SplittermondItem);
            item.system = sandbox.createStubInstance(StrengthDataModel);
            actor.addModifier(item, "lowerFumbleResult +1", "innate");

            await actor.rollMagicFumble(3, "4V2", "firemagic", false);

            expect(chatStub.calledOnce).to.be.true;
            expect(chatStub.firstCall.firstArg.content).not.to.be.null;
            const chatContent = new JSDOM(chatStub.firstCall.firstArg.content).window.document.documentElement;
            const activeFumble = chatContent.querySelector(".fumble-table-result-item-active");
            //20 sets the fumble result to the second entry, lowered by 1 to the first entry
            expect(activeFumble?.textContent).to.contain("splittermond.fumbleTable.magic.sorcerer.result1_2");
        });

        it("should use priest table for priests", async () => {
            const testRoll = createTestRoll("2d10", [10, 10]); //Will set the fumble result to 20!
            stubFoundryRoll(testRoll, sandbox);
            const chatStub = sandbox.stub(foundryApi, "createChatMessage");

            const priestStrength = sandbox.createStubInstance(SplittermondItem);
            sandbox.stub(actor, "findItem").returns({
                withType: () => ({ withName: () => priestStrength }),
                withName: () => priestStrength,
            });

            await actor.rollMagicFumble(3, "4V2", "firemagic", false);

            expect(chatStub.calledOnce).to.be.true;
            expect(chatStub.firstCall.firstArg.content).not.to.be.null;
            const chatContent = new JSDOM(chatStub.firstCall.firstArg.content).window.document.documentElement;
            const activeFumble = chatContent.querySelector(".fumble-table-result-item-active");
            expect(activeFumble?.textContent).to.contain("splittermond.fumbleTable.magic.priest.result3_20");
        });

        it("should allow user to override settings", async () => {
            const rollStub = stubFoundryRoll(createTestRoll("2d10", [10, 10]), sandbox);
            sandbox.stub(foundryApi, "createChatMessage");

            global.foundry.applications.api.DialogV2.prototype.render = function () {
                this.element = new JSDOM(this.options.content).window.document.documentElement;
                this.element.querySelector("input[name='eg']")!.value = "4";
                if (this.options.buttons[2].callback) this.options.buttons[2].callback();
                return this.options.submit("sorcerer", this);
            };
            await actor.rollMagicFumble(3, "4V2", "firemagic", true);

            expect(rollStub.firstCall.lastArg).to.deep.contain({ eg: "4" });
        });
    });
});

function asCharacter(actor: SplittermondActor) {
    return actor.system as CharacterDataModel;
}

function enableModifiers() {
    before(() => {
        const modifiers = initializeModifiers();
        actualAddModifierFunction.self = modifiers.addModifier;
    });
    after(() => {
        actualAddModifierFunction.self = null;
    });
}
