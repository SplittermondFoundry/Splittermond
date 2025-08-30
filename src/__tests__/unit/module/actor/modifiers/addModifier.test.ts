import {expect} from 'chai';
import sinon, {SinonSandbox, type SinonSpy, SinonStub, SinonStubbedInstance} from 'sinon';
import SplittermondActor from "module/actor/actor";
import SplittermondItem from "module/item/item";
import ModifierManager from "module/actor/modifier-manager";
import {foundryApi} from 'module/api/foundryApi';
import {SpellCostReductionManager} from "module/util/costs/spellCostManagement";
import {Cost} from 'module/util/costs/Cost';
import {addModifier} from "module/actor/modifiers/modifierAddition";
import {splittermond} from "module/config";
import {CharacterDataModel} from "module/actor/dataModel/CharacterDataModel";
import {CharacterAttribute} from "module/actor/dataModel/CharacterAttribute";
import Attribute from "module/actor/attribute";
import {clearMappers} from "module/actor/modifiers/parsing/normalizer";
import {evaluate, of} from "module/actor/modifiers/expressions/scalar";
import {stubRollApi} from "../../../RollMock";
import {InitiativeModifier} from "../../../../../module/actor/InitiativeModifier";

//Duplicated, because I don't want to export the original type definition
interface PreparedSystem {
    spellCostReduction: SpellCostReductionManager,
    spellEnhancedCostReduction: SpellCostReductionManager,
    healthRegeneration: unknown,
    focusRegeneration: unknown,
}

type SpiedAddMethod = SinonSpy<Parameters<ModifierManager['add']>, ReturnType<ModifierManager['add']>>;
type SpiedAddModifier = SinonSpy<Parameters<ModifierManager['addModifier']>, ReturnType<ModifierManager['addModifier']>>;

describe('addModifier', () => {
    let sandbox: SinonSandbox;
    let actor: SinonStubbedInstance<SplittermondActor>;
    let item: SinonStubbedInstance<SplittermondItem>;
    let modifierManager: ModifierManager & { add: SpiedAddMethod, addModifier: SpiedAddModifier };
    let systemData: any;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        stubRollApi(sandbox);
        systemData = {
            healthRegeneration: {multiplier: 1, bonus: 0},
            focusRegeneration: {multiplier: 1, bonus: 0},
            spellCostReduction: {addCostModifier: sandbox.stub()},
            spellEnhancedCostReduction: {addCostModifier: sandbox.stub()},
            health: {woundMalus: {nbrLevels: 0, mod: 0, levelMod: 0}}
        };

        const protoManager = new ModifierManager();
        protoManager.add = sandbox.spy(protoManager, 'add');
        protoManager.addModifier = sandbox.spy(protoManager, 'addModifier');
        modifierManager = protoManager as ModifierManager & { add: SpiedAddMethod, addModifier: SpiedAddModifier };

        actor = sandbox.createStubInstance(SplittermondActor);
        actor.system = systemData;
        Object.defineProperty(actor, "modifier", {
            value: modifierManager,
            enumerable: true,
            writable: false,
            configurable: true
        });
        //@ts-expect-error
        actor.attributes = {
            charisma: {value: 2},
            agility: {value: 3},
            intuition: {value: 4},
            constitution: {value: 5},
            mystic: {value: 6},
            strength: {value: 7},
            mind: {value: 8},
            willpower: {value: 9}
        };
        //@ts-expect-error
        actor.derivedValues = {
            speed: {multiplier: 1}
        };
        item = {
            id: 'item1',
            name: 'Test Item',
            type: 'weapon',
            system: {}
        } as unknown as SinonStubbedInstance<SplittermondItem>;

        sandbox.stub(foundryApi, 'reportError');
        sandbox.stub(foundryApi, 'format').callsFake((key: string) => key);
        sandbox.stub(foundryApi, 'localize').callsFake((key: string) => {
            switch (key) {
                case 'splittermond.attribute.intuition.short':
                    return 'INT';
                case 'splittermond.derivedAttribute.initiative.short':
                    return 'INI';
                case 'splittermond.derivedAttribute.initiative.long':
                    return 'Initiative';
                case 'splittermond.damageTypes.physical':
                    return "physisch";
                default:
                    return key;
            }
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should add basic modifier', () => {
        addModifier(actor, item, 'Test', 'BonusCap +2');
        expect(modifierManager.add.lastCall.args).to.have.deep.members(['bonuscap', {
            name: 'Test',
            type: null
        }, of(2), item, false]);
    });

    it('should ignore 0 as value', () => {
        addModifier(actor, item, 'Test', 'BonusCap +0');
        expect(modifierManager.getForId("BonusCap").getModifiers()).to.be.empty
    });

    ([
        ['speed.multiplier 2', 4/*2 from bonus, 2 from multiplier*/],
        ['gsw.mult 0', 0]
    ] as const)
        .forEach(([modifier, expected]) => {
            it(`should handle multiplier modifier ${modifier}`, () => {
                addModifier(actor, item, '', modifier, 'innate', 2);
                expect(actor.derivedValues.speed.multiplier).to.equal(expected);
            });
        });

    it('should handle regeneration modifiers', () => {
        addModifier(actor, item, '', 'HealthRegeneration.multiplier 2');
        expect(systemData.healthRegeneration.multiplier).to.equal(2);

        addModifier(actor, item, '', 'HealthRegeneration.bonus 3');
        expect(systemData.healthRegeneration.bonus).to.equal(3);
    });

    it('should handle skill groups', () => {
        const mockSkills = ['skill1', 'skill2'];
        sandbox.stub(splittermond, 'skillGroups').value(
            {
                general: mockSkills,
                magic: [],
                fighting: []
            });

        addModifier(actor, item, 'Group', 'GeneralSkills/emphasis +2');

        mockSkills.forEach((skill, index) => {
            expect(modifierManager.add.getCalls()[index].args).to.have.deep.members([
                skill,
                {emphasis: 'emphasis', name: 'emphasis', type: null},
                of(2),
                item,
                true
            ]);
        });
    });

    it('should create a modifier for all npc attacks', () => {
        const npcAttack = sandbox.createStubInstance(SplittermondItem);
        npcAttack.type = 'npcattack';
        sandbox.stub(npcAttack, "id").get(() => 'npcAttack1');
        Object.defineProperty(actor, 'items', {value: [npcAttack]});

        addModifier(actor, item, 'NPC Attack', 'npcattacks +3');

        expect(modifierManager.add.lastCall.args).to.have.deep.members([`skill.npcAttack1`, {
            name: 'NPC Attack',
            type: null
        }, of(3), item, false]);
    });

    it('should report error for invalid syntax', () => {
        addModifier(actor, item, 'Invalid', 'InvalidString');
        expect((foundryApi.reportError as SinonStub).calledOnce).to.be.true;
    });

    it('should replace attribute placeholders', () => {
        addModifier(actor, item, '', 'AUS +1');
        expect(modifierManager.add.lastCall.args).to.have.deep.members(['AUS', {
            name: '',
            type: null
        }, of(1), item, false]);
    });

    it('should handle selectable modifiers with emphasis', () => {
        addModifier(actor, item, 'Selectable', 'resistance.fire/emphasis +3');
        expect(modifierManager.add.lastCall.args).to.have.deep.members([
            'resistance.fire',
            {emphasis: 'emphasis', name: 'emphasis', type: null},
            of(3),
            item,
            true
        ]);
    });

    ["lowerFumbleResult", "lowerfumbleresult"].forEach((fumbleResultPath) => {
        it(`should recognize fumble result modifier ${fumbleResultPath}`, () => {
            addModifier(actor, item, "", `${fumbleResultPath} +3`);
            expect(modifierManager.add.lastCall.args).to.have.deep.members([
                'lowerfumbleresult',
                {name: '', type: null},
                of(3),
                item,
                false
            ]);

        });
    });

    (["fighting", "magic", "general"] as const).forEach((skillGroup) => {
        it(`should retain emphasis for skill group ${skillGroup}`, () => {
            addModifier(actor, item, "", `${skillGroup}Skills emphasis="Schwerpunkt" 3`);

            expect(modifierManager.add.lastCall.args).to.have.deep.members([
                splittermond.skillGroups[skillGroup].slice(-1)[0],
                {emphasis: 'Schwerpunkt', name: 'Schwerpunkt', type: null},
                of(3),
                item,
                true
            ]);

        });

    });

    describe("damage modifiers", () => {

        it('should handle general damage modifiers (deprecated path)', () => {
            addModifier(actor, item, 'Damage', 'Damage/fire +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.damage',
                value: of(5),
                attributes: {name: 'Damage', type: null, emphasis: 'fire', damageType: undefined, itemType: undefined},
                origin: item
            });
        });

        it('should handle general damage modifiers with item attribute (deprecated path)', () => {
            addModifier(actor, item, 'Damage', 'Damage emphasis="fire" item="Schwert" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.damage',
                value: of(5),
                attributes: {
                    name: 'Damage',
                    type: null,
                    emphasis: 'fire',
                    item: "Schwert",
                    damageType: undefined,
                    itemType: undefined
                },
                origin: item
            });
        });

        it("should pass valid damage types on modifiers", () => {
            addModifier(actor, item, "", 'item.damage damageType="fire" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.damage',
                value: of(5),
                attributes: {name: '', type: null, damageType: 'fire', itemType: undefined},
                origin: item
            });
        });

        it("should omit invalid damage types on modifiers", () => {
            addModifier(actor, item, "", 'item.damage damageType="frie" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.damage',
                value: of(5),
                attributes: {name: '', type: null, damageType: undefined, itemType: undefined},
                origin: item
            });
        });

        it("should pass valid item types on modifiers", () => {
            addModifier(actor, item, "", 'item.damage itemType="spell" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.damage',
                value: of(5),
                attributes: {name: '', type: null, damageType: undefined, itemType: "spell"},
                origin: item
            });
        });

        it("should keep invalid item types on modifiers", () => {
            addModifier(actor, item, "", 'item.damage itemType="blubb" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.damage',
                value: of(5),
                attributes: {name: '', type: null, damageType: undefined, itemType: "blubb"},
                origin: item
            });
        });

    });

    describe("weaponspeed modifiers", () => {
        it('should handle general weaponspeed modifiers (deprecated path)', () => {
            addModifier(actor, item, 'Superfast', 'weaponspeed +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.weaponspeed',
                value: of(5),
                attributes: {name: 'Superfast', type: null, itemType: undefined},
                origin: item
            });
        });

        it('should handle general weaponspeed modifiers', () => {
            addModifier(actor, item, 'Superfast', 'item.weaponspeed +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.weaponspeed',
                value: of(5),
                attributes: {name: 'Superfast', type: null, itemType: undefined},
                origin: item
            });
        });

        it('should handle weapon specific weaponspeed modifiers', () => {
            addModifier(actor, item, 'Superfast', 'item.weaponspeed item="Lanze" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.weaponspeed',
                value: of(5),
                attributes: {name: 'Superfast', type: null, itemType: undefined, item: "Lanze"},
                origin: item
            });
        });

        it('should pass item type weaponspeed modifiers', () => {
            addModifier(actor, item, 'Superfast', 'item.weaponspeed itemType="weapon" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.weaponspeed',
                value: of(5),
                attributes: {name: 'Superfast', type: null, itemType: "weapon"},
                origin: item
            });
        });

        it('should keep invalid item type weaponspeed modifiers', () => {
            addModifier(actor, item, 'Superfast', 'item.weaponspeed itemType="fern" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.weaponspeed',
                value: of(5),
                attributes: {name: 'Superfast', type: null, itemType: "fern"},
                origin: item
            });
        });

    });

    describe("item feature modifiers", () => {
        it('should handle general item feature modifiers', () => {
            addModifier(actor, item, 'Feature', 'item.addfeature feature="robust" +2');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.addfeature',
                value: of(2),
                attributes: {name: 'Feature', type: null, feature: 'robust', itemType: undefined},
                origin: item
            });
        });

        it('should handle item feature modifiers with item attribute', () => {
            addModifier(actor, item, 'Feature', 'item.addfeature feature="sharp" item="Schwert" +1');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.addfeature',
                value: of(1),
                attributes: {name: 'Feature', type: null, feature: 'sharp', item: "Schwert", itemType: undefined},
                origin: item
            });
        });

        it("should pass valid item types on item feature modifiers", () => {
            addModifier(actor, item, "", 'item.addfeature feature="masterwork" itemType="weapon" +3');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.addfeature',
                value: of(3),
                attributes: {name: '', type: null, feature: 'masterwork', itemType: "weapon"},
                origin: item
            });
        });

        it("should keep invalid item types on item feature modifiers", () => {
            addModifier(actor, item, "", 'item.addfeature feature="enchanted" itemType="invalid" +1');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.addfeature',
                value: of(1),
                attributes: {name: '', type: null, feature: 'enchanted', itemType: "invalid"},
                origin: item
            });
        });

        it('should handle item feature modifiers with multiple attributes', () => {
            addModifier(actor, item, 'Complex Feature', 'item.addfeature feature="blessed" item="Holy Sword" itemType="weapon" +5');
            expect(modifierManager.addModifier.lastCall.args[0]).to.deep.include({
                path: 'item.addfeature',
                value: of(5),
                attributes: {
                    name: 'Complex Feature',
                    type: null,
                    feature: 'blessed',
                    item: "Holy Sword",
                    itemType: "weapon"
                },
                origin: item
            });
        });
    });

    ["Initiative", "INI"].forEach(iniRepresentation => {
        it(`should handle initiative modifier inversion for ${iniRepresentation}`, () => {
            addModifier(actor, item, '', `${iniRepresentation} +2`);

            const createdModifier = modifierManager.addModifier.lastCall.args[0]
            expect(createdModifier).to.be.instanceof(InitiativeModifier);
            expect(createdModifier.groupId).to.equal('initiative');
            expect(createdModifier.attributes.name).to.equal('');
            expect(createdModifier.attributes.type).to.be.null;
            expect(createdModifier.value).to.deep.equal(of(2));
            expect(createdModifier.origin).to.equal(item);
            expect(createdModifier.selectable).to.be.false;
        });
    });

    ([["+INT", 2], ["-INT", -3], ["INT", 4]] as const).forEach(([placeholder, expected]) => {
        it('should replace attribute placeholders with their values', () => {
            const system = sandbox.createStubInstance(CharacterDataModel);
            actor.attributes.intuition = new Attribute(actor, 'intuition');
            actor.system = system;
            const intuition = new CharacterAttribute({initial: 0, advances: Math.abs(expected), species: 0});
            system.updateSource.callThrough();
            system.updateSource({attributes: {intuition} as any})
            actor.system.updateSource({
                healthRegeneration: {multiplier: 1, bonus: 0},
                focusRegeneration: {multiplier: 1, bonus: 0},
                spellCostReduction: {addCostModifier: sandbox.stub()},
                spellEnhancedCostReduction: {addCostModifier: sandbox.stub()}
            } as any);

            addModifier(actor, item, '', `generalSkills.stealth ${placeholder}`);

            const callArgs = modifierManager.add.lastCall.args;
            expect(callArgs.slice(0, 2)).to.have.deep.members(['generalSkills.stealth', {name: '', type: null}]);
            expect(callArgs.slice(3, 5)).to.have.deep.members([item, false]);
            expect(evaluate(callArgs[2])).to.equal(expected);
        })
    });

    ([
        ['K5', new Cost(5, 0, true).asModifier()],
        ['-8', new Cost(-8, 0, false).asModifier()],
        ['K2V2', new Cost(0, 2, true).asModifier()],
        ['-K2V1', new Cost(-1, -1, true).asModifier()],
        ["4V2", new Cost(2, 2, false).asModifier()]
    ] as const).forEach(([cost, expected]) => {
        it(`should pass focus costs of ${cost} to spell manager`, () => {
            addModifier(actor, item, "", `foreduction.protectionmagic ${cost}`);

            const system = actor.system as CharacterDataModel & PreparedSystem
            const focusManager = system.spellCostReduction as SinonStubbedInstance<SpellCostReductionManager>;
            expect(focusManager.addCostModifier.lastCall.args[0]).to.equal("foreduction.protectionmagic");
            expect(focusManager.addCostModifier.lastCall.args[1]).to.deep.equal(expected);
            expect(focusManager.addCostModifier.lastCall.args[2]).to.be.undefined;
        });

        it(`should pass focus costs of ${cost} to spell enhancement manager`, () => {
            addModifier(actor, item, "", `foenhancedreduction.combatmagic ${cost}`);

            const system = actor.system as CharacterDataModel & PreparedSystem
            const focusManager = system.spellEnhancedCostReduction as SinonStubbedInstance<SpellCostReductionManager>;
            expect(focusManager.addCostModifier.lastCall.args[0]).to.equal("foenhancedreduction.combatmagic");
            expect(focusManager.addCostModifier.lastCall.args[1]).to.deep.equal(expected);
            expect(focusManager.addCostModifier.lastCall.args[2]).to.be.undefined;
        });
    });
});
