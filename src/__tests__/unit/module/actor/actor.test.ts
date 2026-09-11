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
import { Modifier } from "module/activeEffect";
import { evaluate, of } from "module/modifiers/expressions/scalar";
import { evaluate as evaluateCost } from "module/modifiers/expressions/cost";
import { actualAddModifierFunction } from "module/actor/addModifierAdapter";
import { initializeModifiers } from "module/modifiers";
import { createTestRoll, stubFoundryRoll } from "../../RollMock";
import type { User } from "module/api/foundryTypes";
import { createHtml } from "../../../handlebarHarness";
import { registerActorModifiers } from "module/actor/modifiers/actorModifierRegistration";
import { CostModifierHandler } from "module/util/costs/CostModifierHandler";
import { parseCostString } from "module/util/costs/costParser";
import { Cost } from "module/util/costs/Cost";
import { initAddModifier } from "module/modifiers/modifierAddition";
import { Chat } from "module/util/chat";
import { Dice } from "module/check/dice";
declare const global: any;

describe("SplittermondActor", () => {
    const sandbox = sinon.createSandbox();
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
                transformationmagic: { points: 0, value: 0 },
                watermagic: { points: 0, value: 0 },
                windmagic: { points: 0, value: 0 },
            },
            health: new HealthDataModel({
                consumed: { value: 0 },
                exhausted: { value: 0 },
                channeled: { entries: [] },
                bonus: { entries: [] },
            }),
            focus: new FocusDataModel({
                consumed: { value: 0 },
                exhausted: { value: 0 },
                channeled: { entries: [] },
                bonus: { entries: [] },
            }),
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

        it("should spend a splinterpoint and return the correct bonus", async () => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            actor.prepareBaseData();
            asCharacter(actor).updateSource({ splinterpoints: { value: 1, max: 3 } });
            const result = actor.spendSplinterpoint();
            expect(result.pointSpent).to.be.true;
            expect(await result.getBonus("health")).to.equal(5);
            expect(asCharacter(actor).splinterpoints.value).to.equal(0);
        });

        it("should not spend a splinterpoint if none are available", () => {
            asCharacter(actor).updateSource({ splinterpoints: { value: 0, max: 3 } });
            const result = actor.spendSplinterpoint();
            expect(result.pointSpent).to.be.false;
            expect(asCharacter(actor).splinterpoints.value).to.equal(0);
        });
    });

    describe("useSplinterpointBonus (deprecated)", () => {
        it("should preserve the original degreeOfSuccess.modification when re-evaluating", async () => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            asCharacter(actor).updateSource({ splinterpoints: { value: 1, max: 3 } });

            const originalModification = 2;
            const message = {
                flags: {
                    splittermond: {
                        check: {
                            type: "defense",
                            defenseType: "defense",
                            baseDefense: 12,
                            skill: "melee",
                            skillPoints: 5,
                            skillAttributes: {},
                            difficulty: 15,
                            rollType: "standard",
                            modifierElements: [],
                            succeeded: false,
                            isFumble: false,
                            isCrit: false,
                            degreeOfSuccess: {
                                fromRoll: 0,
                                modification: originalModification,
                                limitedTo: 999,
                            },
                            availableSplinterpoints: 1,
                            itemData: {
                                id: "melee",
                                name: "Melee",
                                img: "",
                                itemType: "weapon",
                                itemFeatures: { internalFeatureList: [] },
                            },
                        },
                    },
                },
                rolls: [{ _total: 15 }],
                messageMode: "roll",
                update: sandbox.stub().resolves(),
            };

            sandbox.stub(Dice, "evaluateCheck").resolves({
                difficulty: 15,
                succeeded: true,
                isFumble: false,
                isCrit: false,
                degreeOfSuccess: { fromRoll: 1, modification: 0, limitedTo: 999 },
                degreeOfSuccessMessage: "splittermond.successMessage.1",
                roll: { total: 17, dice: [{ total: 17 }] },
            });

            const prepareStub = sandbox.stub(Chat, "prepareCheckMessageData").resolves({
                content: "rendered",
                flags: { splittermond: { check: {} } },
            });

            await actor.useSplinterpointBonus(message);

            expect(prepareStub.calledOnce).to.be.true;
            const passedCheckData = prepareStub.firstCall.args[3] as {
                degreeOfSuccess: { modification: number; fromRoll: number; limitedTo: number };
            };
            expect(passedCheckData.degreeOfSuccess.modification).to.equal(originalModification);
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
            actor.addModifier(item, "bonuscap +2", "innate");
            const modifiers = actor.modifier.getForId("bonuscap").getModifiers();
            expect(modifiers).to.not.be.empty;
        });

        it("should apply the multiplier to scalar modifiers at the addModifier call site (legacy path)", async () => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            sandbox.stub(foundryApi, "format").callsFake((key) => key);
            sandbox.stub(foundryApi, "reportError").callsFake(() => {});
            const item = sandbox.createStubInstance(SplittermondItem);
            actor.prepareBaseData();
            actor.addModifier(item, "bonuscap +3", "innate", 2);
            const modifiers = actor.modifier.getForId("bonuscap").getModifiers();
            expect(modifiers).to.have.length(1);
            expect(await evaluate(modifiers[0].value)).to.equal(6);
        });

        it("should apply the multiplier to cost modifiers at the addModifier call site (legacy path)", async () => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            sandbox.stub(foundryApi, "format").callsFake((key) => key);
            sandbox.stub(foundryApi, "reportError").callsFake(() => {});
            const modifiers = initializeModifiers();
            registerActorModifiers(modifiers.modifierRegistry);
            modifiers.costModifierRegistry.addHandler(CostModifierHandler.config.topLevelPath, CostModifierHandler);
            const previousSelf = actualAddModifierFunction.self;
            actualAddModifierFunction.self = initAddModifier(
                modifiers.modifierRegistry,
                modifiers.costModifierRegistry
            );
            try {
                const item = sandbox.createStubInstance(SplittermondItem);
                actor.prepareBaseData();
                const addCostModifierSpy = sandbox.spy(
                    (actor.system as unknown as { spellCostReduction: { addCostModifier: (m: unknown) => void } })
                        .spellCostReduction,
                    "addCostModifier"
                );
                actor.addModifier(item, "focus.reduction 3", "innate", 2);
                expect(addCostModifierSpy.calledOnce).to.be.true;
                const stored = addCostModifierSpy.firstCall.args[0] as {
                    value: import("module/modifiers/expressions/cost").CostExpression;
                };
                const evaluated = await evaluateCost(stored.value);
                expect(evaluated._exhausted).to.equal(6);
            } finally {
                actualAddModifierFunction.self = previousSelf;
            }
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

        it("should clear channeled focus and keep channeled health on long rest", async () => {
            autoApproveLongRest();
            actor.system.focus.updateSource({ channeled: { entries: [{ description: "Zauber", costs: 7 }] } });
            actor.system.health.updateSource({ channeled: { entries: [{ description: "Seuche", costs: 20 }] } });
            actor.prepareBaseData();

            await actor.longRest();

            expect(actor.system.health.channeled.entries).not.to.be.empty;
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
                    Modifier.create("actor.healthregeneration.multiplier", of(multiplier), {
                        name: "Test",
                        type: "innate",
                    })
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
                Modifier.create("actor.healthregeneration.bonus", of(2), {
                    name: "Test",
                    type: "innate",
                })
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
                Modifier.create("actor.focusregeneration.multiplier", of(3), {
                    name: "Test",
                    type: "innate",
                })
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
                Modifier.create("actor.focusregeneration.bonus", of(2), {
                    name: "Test",
                    type: "innate",
                })
            );

            await actor.longRest();

            expect(actor.system.focus.consumed.value).to.equal(2);
        });

        it("should not prompt for long rest when overridden", async () => {
            actor.system.focus.updateSource({ channeled: { entries: [{ description: "Zauber", costs: 7 }] } });
            actor.system.health.updateSource({ channeled: { entries: [{ description: "Seuche", costs: 20 }] } });
            actor.prepareBaseData();

            await actor.longRest(false, false);

            expect(actor.system.health.channeled.entries).not.to.be.empty;
            expect(actor.system.focus.channeled.entries).not.to.be.empty;
        });
    });

    describe("applyCost bonus pool absorption", () => {
        interface ResourcePayload {
            consumed: { value: number };
            exhausted: { value: number };
            bonus: { entries: { sourceId: string; value: number }[] };
            channeled: { entries: { description: unknown; costs: number }[] };
        }

        function grant(sourceId: string, value: number) {
            return { sourceId, value };
        }

        function applyCostString(type: "health" | "focus", cost: string, description: string) {
            return actor.applyCost(type, parseCostString(cost).asPrimaryCost(), description);
        }

        function applyDamage(type: "health" | "focus", counter: "consumed" | "exhausted", amount: number) {
            const cost = counter === "consumed" ? new Cost(0, amount, false) : new Cost(amount, 0, false);
            return actor.applyCost(type, cost.asPrimaryCost(), "");
        }

        function seedEntries(type: "health" | "focus", entries: { sourceId: string; value: number }[]) {
            (actor.system as CharacterDataModel)[type].updateSource({ bonus: { entries } });
        }

        function persistedResource(callIndex: number, type: "health" | "focus"): ResourcePayload {
            const updateData = (actor.update as sinon.SinonSpy).getCall(callIndex).args[0] as {
                system: Record<string, ResourcePayload>;
            };
            return updateData.system[type];
        }

        it("fully absorbs a mixed cost and leaves the counters unchanged", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 8)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 8)]);

            await applyCostString("health", "8V2", "Test");

            const payload = persistedResource(0, "health");
            expect(payload.consumed.value).to.equal(0);
            expect(payload.exhausted.value).to.equal(0);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
        });

        it("splits a cost that exceeds the pool between pool and counter", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 3)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 2)]);

            await applyCostString("health", "10V5", "Test");

            const payload = persistedResource(0, "health");
            expect(payload.consumed.value).to.equal(3);
            expect(payload.exhausted.value).to.equal(5);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
        });

        it("absorbs a plain exhaustion cost from the pool", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 4)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 4)]);

            await applyCostString("health", "3", "Test");

            const payload = persistedResource(0, "health");
            expect(payload.exhausted.value).to.equal(0);
            expect(payload.consumed.value).to.equal(0);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 1)]);
        });

        it("absorbs the consumed part before the exhausted part", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 1)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 1)]);

            await applyCostString("health", "2V1", "Test");

            const payload = persistedResource(0, "health");
            expect(payload.consumed.value).to.equal(0);
            expect(payload.exhausted.value).to.equal(1);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
        });

        it("continues spending from depleted entries without re-materializing them", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 5)]);

            await applyCostString("health", "3", "Test");
            await applyCostString("health", "3V3", "Test");

            const first = persistedResource(0, "health");
            expect(first.exhausted.value).to.equal(0);
            expect(first.bonus.entries).to.deep.equal([grant("effect-1", 2)]);

            const second = persistedResource(1, "health");
            expect(second.consumed.value).to.equal(1);
            expect(second.exhausted.value).to.equal(0);
            expect(second.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
        });

        it("does not touch the pool for channeled-only costs", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 5)]);

            await applyCostString("health", "K4", "Test");

            const payload = persistedResource(0, "health");
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 5)]);
            expect(payload.consumed.value).to.equal(0);
            expect(payload.exhausted.value).to.equal(0);
            expect(payload.channeled.entries).to.deep.equal([{ description: "Test", costs: 4 }]);
        });

        it("charges the full cost to the counters when no grants exist", async () => {
            actor.bonusGrants = { healthpoints: [], focuspoints: [] };
            seedEntries("health", []);

            await applyCostString("health", "4V2", "Test");

            const payload = persistedResource(0, "health");
            expect(payload.consumed.value).to.equal(2);
            expect(payload.exhausted.value).to.equal(2);
            expect(payload.bonus.entries).to.deep.equal([]);
        });

        it("absorbs focus costs from the focus pool", async () => {
            actor.bonusGrants = { healthpoints: [], focuspoints: [grant("effect-1", 3)] };
            seedEntries("focus", [grant("effect-1", 3)]);

            await applyCostString("focus", "3V3", "Test");

            const payload = persistedResource(0, "focus");
            expect(payload.consumed.value).to.equal(0);
            expect(payload.exhausted.value).to.equal(0);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
        });

        function seedChanneled(type: "health" | "focus", entries: { description: string; costs: number }[]) {
            (actor.system as CharacterDataModel)[type].updateSource({ channeled: { entries } });
        }

        function seedExhausted(type: "health" | "focus", value: number) {
            (actor.system as CharacterDataModel)[type].updateSource({ exhausted: { value } });
        }

        it("endChannel with full pool coverage decrements the entries and leaves exhausted unchanged", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 5)]);
            seedChanneled("health", [{ description: "Zauber", costs: 4 }]);

            await actor.endChannel("health", 0);

            const payload = persistedResource(0, "health");
            expect(payload.exhausted.value).to.equal(0);
            expect(payload.consumed.value).to.equal(0);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 1)]);
            expect(payload.channeled.entries).to.deep.equal([]);
        });

        it("endChannel with an empty pool adds the costs to exhausted and leaves entries alone", async () => {
            actor.bonusGrants = { healthpoints: [], focuspoints: [] };
            seedEntries("health", [grant("vanished-effect", 5)]);
            seedChanneled("health", [{ description: "Zauber", costs: 4 }]);

            await actor.endChannel("health", 0);

            const payload = persistedResource(0, "health");
            expect(payload.exhausted.value).to.equal(4);
            expect(payload.bonus.entries).to.deep.equal([grant("vanished-effect", 5)]);
            expect(payload.channeled.entries).to.deep.equal([]);
        });

        it("endChannel with partial coverage splits the costs between pool and exhausted", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 2)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 2)]);
            seedChanneled("health", [{ description: "Zauber", costs: 5 }]);

            await actor.endChannel("health", 0);

            const payload = persistedResource(0, "health");
            expect(payload.exhausted.value).to.equal(3);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
            expect(payload.channeled.entries).to.deep.equal([]);
        });

        it("endChannel removes exactly the indexed entry", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 10)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 10)]);
            seedChanneled("health", [
                { description: "Erster", costs: 4 },
                { description: "Zweiter", costs: 7 },
            ]);

            await actor.endChannel("health", 1);

            const payload = persistedResource(0, "health");
            expect(payload.channeled.entries).to.deep.equal([{ description: "Erster", costs: 4 }]);
            expect(payload.exhausted.value).to.equal(0);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 3)]);
        });

        it("endChannel absorbs focus channel costs from the focus pool", async () => {
            actor.bonusGrants = { healthpoints: [], focuspoints: [grant("effect-1", 6)] };
            seedEntries("focus", [grant("effect-1", 6)]);
            seedChanneled("focus", [{ description: "Zauber", costs: 6 }]);

            await actor.endChannel("focus", 0);

            const payload = persistedResource(0, "focus");
            expect(payload.exhausted.value).to.equal(0);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
            expect(payload.channeled.entries).to.deep.equal([]);
        });

        it("removeChannel changes neither counters nor entries and removes exactly the indexed entry", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 5)]);
            seedExhausted("health", 3);
            seedChanneled("health", [
                { description: "Erster", costs: 4 },
                { description: "Zweiter", costs: 7 },
            ]);

            await actor.removeChannel("health", 0);

            const payload = persistedResource(0, "health");
            expect(payload.exhausted.value).to.equal(3);
            expect(payload.consumed.value).to.equal(0);
            expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 5)]);
            expect(payload.channeled.entries).to.deep.equal([{ description: "Zweiter", costs: 7 }]);
        });

        it("endChannel with an out-of-range index never calls update", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 5)]);
            seedChanneled("health", [{ description: "Zauber", costs: 4 }]);

            await actor.endChannel("health", 5);

            expect((actor.update as sinon.SinonSpy).called).to.be.false;
        });

        it("removeChannel with an out-of-range index never calls update", async () => {
            actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
            seedEntries("health", [grant("effect-1", 5)]);
            seedChanneled("health", [{ description: "Zauber", costs: 4 }]);

            await actor.removeChannel("health", 5);

            expect((actor.update as sinon.SinonSpy).called).to.be.false;
        });

        describe("counter damage", () => {
            it("fully absorbs consumed damage from the pool", async () => {
                actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
                seedEntries("health", [grant("effect-1", 5)]);

                await applyDamage("health", "consumed", 3);

                const payload = persistedResource(0, "health");
                expect(payload.consumed.value).to.equal(0);
                expect(payload.exhausted.value).to.equal(0);
                expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 2)]);
            });

            it("absorbs exhaustion damage from the pool without touching the exhausted counter", async () => {
                actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
                seedEntries("health", [grant("effect-1", 5)]);

                await applyDamage("health", "exhausted", 3);

                const payload = persistedResource(0, "health");
                expect(payload.exhausted.value).to.equal(0);
                expect(payload.consumed.value).to.equal(0);
                expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 2)]);
            });

            it("splits damage that exceeds the pool between pool and counter", async () => {
                actor.bonusGrants = { healthpoints: [grant("effect-1", 3)], focuspoints: [] };
                seedEntries("health", [grant("effect-1", 2)]);

                await applyDamage("health", "consumed", 5);

                const payload = persistedResource(0, "health");
                expect(payload.consumed.value).to.equal(3);
                expect(payload.exhausted.value).to.equal(0);
                expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 0)]);
            });

            it("charges the full damage to the counter when no grants exist", async () => {
                actor.bonusGrants = { healthpoints: [], focuspoints: [] };
                seedEntries("health", []);

                await applyDamage("health", "consumed", 4);

                const payload = persistedResource(0, "health");
                expect(payload.consumed.value).to.equal(4);
                expect(payload.bonus.entries).to.deep.equal([]);
            });

            it("absorbs focus exhaustion damage from the focus pool", async () => {
                actor.bonusGrants = { healthpoints: [], focuspoints: [grant("effect-1", 5)] };
                seedEntries("focus", [grant("effect-1", 5)]);

                await applyDamage("focus", "exhausted", 3);

                const payload = persistedResource(0, "focus");
                expect(payload.exhausted.value).to.equal(0);
                expect(payload.bonus.entries).to.deep.equal([grant("effect-1", 2)]);
            });

            it("continues spending from depleted entries without re-materializing them", async () => {
                actor.bonusGrants = { healthpoints: [grant("effect-1", 5)], focuspoints: [] };
                seedEntries("health", [grant("effect-1", 5)]);

                await applyDamage("health", "exhausted", 3);
                await applyDamage("health", "consumed", 3);

                const first = persistedResource(0, "health");
                expect(first.exhausted.value).to.equal(0);
                expect(first.bonus.entries).to.deep.equal([grant("effect-1", 2)]);

                const second = persistedResource(1, "health");
                expect(second.consumed.value).to.equal(1);
                expect(second.exhausted.value).to.equal(0);
                expect(second.bonus.entries, "the depleted entry is not topped up to the grant value").to.deep.equal([
                    grant("effect-1", 0),
                ]);
            });
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

        it("returns 0 if no item protects damage reduction", async () => {
            actor.items = [
                {
                    system: {
                        features: { hasFeature: () => false },
                        equipped: true,
                        damageReduction: 2,
                    },
                },
            ] as any;
            expect(await actor.protectedDamageReduction.calculate()).to.equal(0);
        });

        it("returns damageReduction if item protects and getStableProtectsAllReduction is true", async () => {
            asMock(settings.registerBoolean).returnsSetting(true);
            // Stub damageReduction getter
            sandbox.stub(actor, "damageReduction").get(() => ({ display: "7", calculate: () => Promise.resolve(7) }));
            actor.items = [
                {
                    system: {
                        features: { hasFeature: (f: string) => f === "Stabil" },
                        equipped: true,
                        damageReduction: 2,
                    },
                },
            ] as any;
            expect(await actor.protectedDamageReduction.calculate()).to.equal(7);
        });

        it("returns sum of protected items' damageReduction if getStableProtectsAllReduction is false", async () => {
            asMock(settings.registerBoolean).returnsSetting(false);
            sandbox.stub(actor, "damageReduction").get(() => ({ display: "15", calculate: () => Promise.resolve(15) }));
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
            expect(await actor.protectedDamageReduction.calculate()).to.equal(5);
        });

        it("returns 0 if no equipped item has Stabil feature", async () => {
            actor.items = [
                {
                    system: {
                        features: { hasFeature: () => false },
                        equipped: false,
                        damageReduction: 2,
                    },
                },
            ] as any;
            expect(await actor.protectedDamageReduction.calculate()).to.equal(0);
        });
    });

    describe("Fumbles", () => {
        enableModifiers();
        beforeEach(() => {
            const speaker = { actor: actor.id, token: "dfad", scene: "dfad", alias: actor.name };
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
            sandbox.stub(foundryApi, "format").callsFake((key) => key);
            sandbox.stub(foundryApi, "reportError");
            sandbox.stub(foundryApi, "chatMessageStyles").get(() => ({ OTHER: 1 }));
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

    describe("Susceptibilities", () => {
        beforeEach(() => {
            sandbox.stub(foundryApi, "localize");
        });
        it("should return weaknesses", async () => {
            actor.prepareBaseData();
            actor.modifier.add("weakness.light", { name: "Vampirism", type: "innate" }, of(3));
            expect(await actor.weaknesses.calculate()).to.contain({ light: 3, shadow: 0 });
        });
        it("should return resistance", async () => {
            actor.prepareBaseData();
            actor.modifier.add("resistance.light", { name: "Dark skinned", type: "innate" }, of(3));
            expect(await actor.resistances.calculate()).to.contain({ light: 3, shadow: 0 });
        });
    });
});

function asCharacter(actor: SplittermondActor) {
    return actor.system as CharacterDataModel;
}

function enableModifiers() {
    before(() => {
        const modifiers = initializeModifiers();
        registerActorModifiers(modifiers.modifierRegistry);
        actualAddModifierFunction.self = modifiers.addModifier;
    });
    after(() => {
        actualAddModifierFunction.self = null;
    });
}
