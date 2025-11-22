import { expect } from "chai";
import sinon, { SinonSandbox, SinonStub, SinonStubbedInstance } from "sinon";
import SplittermondActor from "module/actor/actor";
import SplittermondItem from "module/item/item";
import { foundryApi } from "module/api/foundryApi";
import { Cost } from "module/util/costs/Cost";
import { initAddModifier } from "module/modifiers/modifierAddition";
import { splittermond } from "module/config";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import { CharacterAttribute } from "module/actor/dataModel/CharacterAttribute";
import Attribute from "module/actor/attribute";
import { clearMappers } from "module/modifiers/parsing/normalizer";
import { evaluate, of, pow } from "module/modifiers/expressions/scalar";
import { of as ofCost, times } from "module/modifiers/expressions/cost";
import { stubRollApi } from "../../RollMock";
import { InverseModifier } from "module/modifiers/impl/InverseModifier";
import { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import { ItemModifierHandler } from "module/item/ItemModifierHandler";
import { CostModifierHandler } from "module/util/costs/CostModifierHandler";
import { registerActorModifiers } from "module/actor/modifiers/actorModifierRegistration";

function setupAddModifierFunction() {
    const modifierRegistry = new ModifierRegistry();
    const costModifierRegistry = new ModifierRegistry();
    costModifierRegistry.addHandler(CostModifierHandler.config.topLevelPath, CostModifierHandler);
    modifierRegistry.addHandler(ItemModifierHandler.config.topLevelPath, ItemModifierHandler);
    registerActorModifiers(modifierRegistry);
    return initAddModifier(modifierRegistry, costModifierRegistry);
}

describe("addModifier", () => {
    let sandbox: SinonSandbox;
    let actor: SinonStubbedInstance<SplittermondActor>;
    let item: SinonStubbedInstance<SplittermondItem>;
    let systemData: any;
    const addModifier = setupAddModifierFunction();

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        stubRollApi(sandbox);
        systemData = {
            healthRegeneration: { multiplier: 1, bonus: 0 },
            focusRegeneration: { multiplier: 1, bonus: 0 },
            spellCostReduction: { addCostModifier: sandbox.stub() },
            spellEnhancedCostReduction: { addCostModifier: sandbox.stub() },
            health: { woundMalus: { nbrLevels: 0, mod: 0, levelMod: 0 } },
        };

        actor = sandbox.createStubInstance(SplittermondActor);
        actor.system = systemData;

        //@ts-expect-error
        actor.attributes = {
            charisma: { value: 2 },
            agility: { value: 3 },
            intuition: { value: 4 },
            constitution: { value: 5 },
            mystic: { value: 6 },
            strength: { value: 7 },
            mind: { value: 8 },
            willpower: { value: 9 },
        };
        //@ts-expect-error
        actor.derivedValues = {
            speed: { multiplier: 1 },
        };
        item = {
            id: "item1",
            name: "Test Item",
            type: "weapon",
            actor: actor,
            system: {},
        } as unknown as SinonStubbedInstance<SplittermondItem>;

        sandbox.stub(foundryApi, "reportError");
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => {
            switch (key) {
                case "splittermond.attribute.intuition.short":
                    return "INT";
                case "splittermond.derivedAttribute.initiative.short":
                    return "INI";
                case "splittermond.derivedAttribute.initiative.long":
                    return "Initiative";
                case "splittermond.damageTypes.physical":
                    return "physisch";
                default:
                    return key;
            }
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should add basic modifier", () => {
        const result = addModifier(item, "BonusCap +2");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            path: "BonusCap",
            attributes: {
                name: "Test Item",
                type: null,
            },
        });
        expect(result.costModifiers).to.have.length(0);
    });

    (
        [
            ["speed.multiplier 2", pow(of(2), of(2))],
            ["gsw.mult 0", of(0)],
        ] as const
    ).forEach(([modifier, expected]) => {
        it(`should handle multiplier modifier ${modifier}`, () => {
            const result = addModifier(item, modifier, "innate", 2);
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.contain({
                groupId: "actor.speed.multiplier",
                attributes: { name: "Test Item", type: "innate" },
                value: expected,
                origin: item,
                selectable: false,
            });
        });
    });

    it("should handle health regeneration multiplier", () => {
        const result = addModifier(item, "HealthRegeneration.multiplier 3");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            groupId: "actor.healthregeneration.multiplier",
            attributes: { name: "Test Item", type: null },
            value: of(3),
            origin: item,
            selectable: false,
        });
    });
    it("should handle health regeneration bonus", () => {
        const result = addModifier(item, "HealthRegeneration.bonus 3");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            path: "actor.healthregeneration.bonus",
            attributes: { name: "Test Item", type: null },
            value: of(3),
            origin: item,
            selectable: false,
        });
    });
    it("should handle focus regeneration multiplier", () => {
        const result = addModifier(item, "FocusRegeneration.multiplier 3");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            groupId: "actor.focusregeneration.multiplier",
            attributes: { name: "Test Item", type: null },
            value: of(3),
            origin: item,
            selectable: false,
        });
    });
    it("should handle focus regeneration bonus", () => {
        const result = addModifier(item, "FocusRegeneration.bonus 3");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            path: "actor.focusregeneration.bonus",
            attributes: { name: "Test Item", type: null },
            value: of(3),
            origin: item,
            selectable: false,
        });
    });

    it("should handle skill groups", () => {
        const mockSkills = ["skill1", "skill2"];
        sandbox.stub(splittermond, "skillGroups").value({
            general: mockSkills,
            magic: [],
            fighting: [],
        });

        const result = addModifier(item, "skills.general/emphasis +2");
        expect(result.modifiers).to.have.length(mockSkills.length);

        mockSkills.forEach((skill, index) => {
            expect(result.modifiers[index]).to.deep.contain({
                path: skill,
                attributes: { emphasis: "emphasis", name: "emphasis", type: null },
                value: of(2),
                origin: item,
                selectable: true,
            });
        });
    });

    it("should create a modifier for all npc attacks", () => {
        const npcAttack = sandbox.createStubInstance(SplittermondItem);
        npcAttack.type = "npcattack";
        sandbox.stub(npcAttack, "id").get(() => "npcAttack1");
        Object.defineProperty(actor, "items", { value: [npcAttack] });

        const result = addModifier(item, "npcattacks +3");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            path: "skill.npcAttack1",
            attributes: { name: "Test Item", type: null },
            value: of(3),
            origin: item,
            selectable: false,
        });
    });

    it("should report error for invalid syntax", () => {
        addModifier(item, "InvalidString");
        expect((foundryApi.reportError as SinonStub).calledOnce).to.be.true;
    });

    it("should replace attribute placeholders", () => {
        const result = addModifier(item, "AUS +1");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            path: "AUS",
            attributes: { name: "Test Item", type: null },
            value: of(1),
            origin: item,
            selectable: false,
        });
    });

    it("should handle selectable modifiers with emphasis", () => {
        const result = addModifier(item, "resistance.fire/emphasis +3");
        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0]).to.deep.contain({
            path: "resistance.fire",
            attributes: { emphasis: "emphasis", name: "emphasis", type: null },
            value: of(3),
            origin: item,
            selectable: true,
        });
    });

    ["lowerFumbleResult", "lowerfumbleresult"].forEach((fumbleResultPath) => {
        it(`should recognize fumble result modifier ${fumbleResultPath}`, () => {
            const result = addModifier(item, `${fumbleResultPath} +3`);
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.contain({
                path: "lowerfumbleresult",
                attributes: { name: "Test Item", type: null },
                value: of(3),
                origin: item,
                selectable: false,
            });
        });
    });

    (["fighting", "magic", "general"] as const).forEach((skillGroup) => {
        it(`should retain emphasis for skill group ${skillGroup}`, () => {
            const result = addModifier(item, `skills.${skillGroup} emphasis="Schwerpunkt" 3`);
            expect(result.modifiers).to.have.length.greaterThan(0);

            // Check the last modifier (since we're testing the last skill in the group)
            const lastModifier = result.modifiers[result.modifiers.length - 1];
            expect(lastModifier).to.deep.contain({
                path: splittermond.skillGroups[skillGroup].slice(-1)[0],
                attributes: { emphasis: "Schwerpunkt", name: "Schwerpunkt", type: null },
                value: of(3),
                origin: item,
                selectable: true,
            });
        });
    });

    describe("damage modifiers", () => {
        it("should handle general damage modifiers (deprecated path)", () => {
            const result = addModifier(item, "Damage/fire +5");
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.Damage",
                value: of(5),
                attributes: {
                    name: "Test Item",
                    type: null,
                    emphasis: "fire",
                },
                origin: item,
            });
        });

        it("should handle general damage modifiers with item attribute (deprecated path)", () => {
            const result = addModifier(item, 'Damage emphasis="fire" item="Schwert" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.Damage",
                value: of(5),
                attributes: {
                    name: "Test Item",
                    type: null,
                    emphasis: "fire",
                    item: "Schwert",
                },
                origin: item,
            });
        });

        it("should pass valid damage types on modifiers", () => {
            const result = addModifier(item, 'item.damage damageType="fire" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.damage",
                value: of(5),
                attributes: { name: "Test Item", type: null, damageType: "fire" },
                origin: item,
            });
        });

        it("should omit invalid damage types on modifiers", () => {
            const result = addModifier(item, 'item.damage damageType="frie" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.damage",
                value: of(5),
                attributes: { name: "Test Item", type: null, damageType: undefined },
                origin: item,
            });
        });

        it("should pass valid item types on modifiers", () => {
            const result = addModifier(item, 'item.damage itemType="spell" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.damage",
                value: of(5),
                attributes: { name: "Test Item", type: null, itemType: "spell" },
                origin: item,
            });
        });

        it("should keep invalid item types on modifiers", () => {
            const result = addModifier(item, 'item.damage itemType="blubb" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.damage",
                value: of(5),
                attributes: { name: "Test Item", type: null, itemType: "blubb" },
                origin: item,
            });
        });

        it("should pass valid item skills on modifiers", () => {
            const result = addModifier(item, 'item.damage skill="arcanelore" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.damage",
                value: of(5),
                attributes: { name: "Test Item", type: null, skill: "arcanelore" },
                origin: item,
            });
        });

        it("should keep invalid item skills on modifiers", () => {
            const result = addModifier(item, 'item.damage skill="blubb" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.damage",
                value: of(5),
                attributes: { name: "Test Item", type: null, skill: "blubb" },
                origin: item,
            });
        });

        ["item='Schwert'", 'itemType="weapon"', "skill=blades"].forEach((attribute) => {
            it("should not warn for valid damage type attributes", () => {
                addModifier(item, `item.damage damageType="fire" ${attribute} features="Kritisch 2" +2`);
                expect((foundryApi.reportError as SinonStub).notCalled).to.be.true;
            });
        });
    });

    describe("weaponspeed modifiers", () => {
        it("should handle general weaponspeed modifiers (deprecated path)", () => {
            const result = addModifier(item, "weaponspeed +5");
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.weaponspeed",
                value: of(5),
                attributes: { name: "Test Item", type: null },
                origin: item,
            });
        });

        it("should handle general weaponspeed modifiers", () => {
            const result = addModifier(item, "item.weaponspeed +5");
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.weaponspeed",
                value: of(5),
                attributes: { name: "Test Item", type: null },
                origin: item,
            });
        });

        it("should handle weapon specific weaponspeed modifiers", () => {
            const result = addModifier(item, 'item.weaponspeed item="Lanze" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.weaponspeed",
                value: of(5),
                attributes: { name: "Test Item", type: null, item: "Lanze" },
                origin: item,
            });
        });

        it("should pass item type weaponspeed modifiers", () => {
            const result = addModifier(item, 'item.weaponspeed itemType="weapon" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.weaponspeed",
                value: of(5),
                attributes: { name: "Test Item", type: null, itemType: "weapon" },
                origin: item,
            });
        });

        it("should keep invalid item type weaponspeed modifiers", () => {
            const result = addModifier(item, 'item.weaponspeed itemType="fern" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.weaponspeed",
                value: of(5),
                attributes: { name: "Test Item", type: null, itemType: "fern" },
                origin: item,
            });
        });

        it("should pass skill weaponspeed modifiers", () => {
            const result = addModifier(item, 'item.weaponspeed skill="melee" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.weaponspeed",
                value: of(5),
                attributes: { name: "Test Item", type: null, skill: "melee" },
                origin: item,
            });
        });

        it("should keep invalid skill weaponspeed modifiers", () => {
            const result = addModifier(item, 'item.weaponspeed skill="fern" +5');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.weaponspeed",
                value: of(5),
                attributes: { name: "Test Item", type: null, skill: "fern" },
                origin: item,
            });
        });

        ["item='Schwert'", 'itemType="weapon"', "skill=blades"].forEach((attribute) => {
            it("should not warn for valid damage type attributes", () => {
                addModifier(item, `item.weaponspeed ${attribute} +2`);
                expect((foundryApi.reportError as SinonStub).notCalled).to.be.true;
            });
        });
    });

    describe("cast duration modifiers", () => {
        it("should handle cast duration modifiers", () => {
            const result = addModifier(item, 'item.castDuration unit="Ticks" +2');
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.castDuration",
                value: of(2),
                attributes: { name: "Test Item", type: null, unit: "T" },
                origin: item,
            });
        });

        it("should handle cast duration multiplier modifiers", () => {
            const result = addModifier(item, "item.castDuration.multiplier +2");
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.include({
                path: "item.castDuration.multiplier",
                value: of(2),
                attributes: { name: "Test Item", type: null },
                origin: item,
            });
        });
    });

    describe("item feature modifiers", () => {
        ["item.mergeFeature", "item.addFeature"].forEach((path) => {
            it(`should handle general item feature modifiers for ${path}`, () => {
                const result = addModifier(item, `${path} feature="robust" +2`);
                expect(result.modifiers).to.have.length(1);
                expect(result.modifiers[0]).to.deep.include({
                    path,
                    value: of(2),
                    attributes: { name: "Test Item", type: null, feature: "robust" },
                    origin: item,
                });
            });

            it(`should handle item feature modifiers with item attribute for ${path}`, () => {
                const result = addModifier(item, `${path} feature="sharp" item="Schwert" +1`);
                expect(result.modifiers).to.have.length(1);
                expect(result.modifiers[0]).to.deep.include({
                    path,
                    value: of(1),
                    attributes: { name: "Test Item", type: null, feature: "sharp", item: "Schwert" },
                    origin: item,
                });
            });

            it(`should pass valid item types on item feature modifiers for ${path}`, () => {
                const result = addModifier(item, `${path} feature="masterwork" itemType="weapon" +3`);
                expect(result.modifiers).to.have.length(1);
                expect(result.modifiers[0]).to.deep.include({
                    path,
                    value: of(3),
                    attributes: { name: "Test Item", type: null, feature: "masterwork", itemType: "weapon" },
                    origin: item,
                });
            });

            it(`should keep invalid item types on item feature modifiers for ${path}`, () => {
                const result = addModifier(item, `${path} feature="enchanted" itemType="invalid" +1`);
                expect(result.modifiers).to.have.length(1);
                expect(result.modifiers[0]).to.deep.include({
                    path,
                    value: of(1),
                    attributes: { name: "Test Item", type: null, feature: "enchanted", itemType: "invalid" },
                    origin: item,
                });
            });

            it(`should pass valid item types on item feature modifiers for ${path}`, () => {
                const result = addModifier(item, `${path} feature="masterwork" skill="blades" +3`);
                expect(result.modifiers).to.have.length(1);
                expect(result.modifiers[0]).to.deep.include({
                    path,
                    value: of(3),
                    attributes: { name: "Test Item", type: null, feature: "masterwork", skill: "blades" },
                    origin: item,
                });
            });

            it(`should keep invalid item types on item feature modifiers for ${path}`, () => {
                const result = addModifier(item, `${path} feature="enchanted" skill="invalid" +1`);
                expect(result.modifiers).to.have.length(1);
                expect(result.modifiers[0]).to.deep.include({
                    path,
                    value: of(1),
                    attributes: { name: "Test Item", type: null, feature: "enchanted", skill: "invalid" },
                    origin: item,
                });
            });

            it(`should handle item feature modifiers with multiple attributes for ${path}`, () => {
                const result = addModifier(item, `${path} feature="blessed" item="Holy Sword" itemType="weapon" +5`);
                expect(result.modifiers).to.have.length(1);
                expect(result.modifiers[0]).to.deep.include({
                    path,
                    value: of(5),
                    attributes: {
                        name: "Test Item",
                        type: null,
                        feature: "blessed",
                        item: "Holy Sword",
                        itemType: "weapon",
                    },
                    origin: item,
                });
            });
            [
                `${path} item="Sword" feature="Scharf" +2`,
                `${path} feature="Scharf" itemType="weapon" +2`,
                `${path} feature="Scharf" skill=blades +2`,
            ].forEach((input) => {
                it(`should not warn for valid feature attributes in ${input}`, () => {
                    addModifier(item, input);
                    expect((foundryApi.reportError as SinonStub).notCalled).to.be.true;
                });
            });
        });
    });

    ["Initiative", "INI"].forEach((iniRepresentation) => {
        it(`should handle initiative modifier inversion for ${iniRepresentation}`, () => {
            const result = addModifier(item, `${iniRepresentation} +2`);
            expect(result.modifiers).to.have.length(1);

            const createdModifier = result.modifiers[0];
            expect(createdModifier).to.be.instanceof(InverseModifier);
            expect(createdModifier.groupId).to.equal("initiative");
            expect(createdModifier.attributes.name).to.equal("Test Item");
            expect(createdModifier.attributes.type).to.be.null;
            expect(createdModifier.value).to.deep.equal(of(2));
            expect(createdModifier.origin).to.equal(item);
            expect(createdModifier.selectable).to.be.false;
        });
    });

    (
        [
            ["+INT", 2],
            ["-INT", -3],
            ["INT", 4],
        ] as const
    ).forEach(([placeholder, expected]) => {
        it("should replace attribute placeholders with their values", () => {
            const system = sandbox.createStubInstance(CharacterDataModel);
            actor.attributes.intuition = new Attribute(actor, "intuition");
            actor.system = system;
            const intuition = new CharacterAttribute({ initial: 0, advances: Math.abs(expected), species: 0 });
            system.updateSource.callThrough();
            system.updateSource({ attributes: { intuition } as any });
            actor.system.updateSource({
                healthRegeneration: { multiplier: 1, bonus: 0 },
                focusRegeneration: { multiplier: 1, bonus: 0 },
                spellCostReduction: { addCostModifier: sandbox.stub() },
                spellEnhancedCostReduction: { addCostModifier: sandbox.stub() },
            } as any);

            const result = addModifier(item, `generalSkills.stealth ${placeholder}`);
            expect(result.modifiers).to.have.length(1);
            expect(result.modifiers[0]).to.deep.contain({
                path: "generalSkills.stealth",
                attributes: { name: "Test Item", type: null },
                origin: item,
                selectable: false,
            });
            expect(evaluate(result.modifiers[0].value)).to.equal(expected);
        });
    });

    (
        [
            ["K5", new Cost(5, 0, true).asModifier()],
            ["-8", new Cost(-8, 0, false).asModifier()],
            ["K2V2", new Cost(0, 2, true).asModifier()],
            ["-K2V1", new Cost(-1, -1, true).asModifier()],
            ["4V2", new Cost(2, 2, false).asModifier()],
        ] as const
    ).forEach(([cost, expected]) => {
        it(`should return reduced focus costs of ${cost} for spell manager`, () => {
            const result = addModifier(item, `focus.reduction skill="protectionmagic" ${cost}`);
            expect(result.costModifiers).to.have.length(1);
            expect(result.costModifiers[0]).to.deep.equal({
                label: "focus.reduction",
                value: ofCost(expected),
                skill: null,
                attributes: { skill: "protectionmagic", type: undefined },
            });
        });
        it(`should return added focus costs of ${cost} for spell manager`, () => {
            const result = addModifier(item, `focus.addition skill="protectionmagic" ${cost}`);
            expect(result.costModifiers).to.have.length(1);
            expect(result.costModifiers[0]).to.deep.equal({
                label: "focus.reduction",
                value: times(of(-1), ofCost(expected)),
                skill: null,
                attributes: { skill: "protectionmagic", type: undefined },
            });
        });

        it(`should return focus costs of ${cost} for spell enhancement manager`, () => {
            const result = addModifier(item, `focus.enhancedreduction skill="combatmagic" ${cost}`);
            expect(result.costModifiers).to.have.length(1);
            expect(result.costModifiers[0]).to.deep.equal({
                label: "focus.enhancedreduction",
                value: ofCost(expected),
                skill: null,
                attributes: { skill: "combatmagic", type: undefined },
            });
        });
    });
});
