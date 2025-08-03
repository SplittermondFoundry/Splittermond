import {expect} from 'chai';
import sinon, {SinonSandbox, SinonStub, SinonStubbedInstance} from 'sinon';
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

describe('addModifier', () => {
    let sandbox: SinonSandbox;
    let actor: SinonStubbedInstance<SplittermondActor>;
    let item: SinonStubbedInstance<SplittermondItem>;
    let modifierManager: SinonStubbedInstance<ModifierManager>;
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

        modifierManager = sandbox.createStubInstance(ModifierManager);

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
        expect(modifierManager.add.notCalled).to.be.true;
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
                { name: '', type: null},
                of(3),
                item,
                false
            ]);

        });
    });

    (["fighting", "magic", "general"]as const).forEach((skillGroup) => {
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
        it('should handle damage modifiers', () => {
            addModifier(actor, item, 'Damage', 'Damage/fire +5');
            expect(modifierManager.add.lastCall.args).to.have.deep.members([
                'damage',
                {name: 'Damage', type: null, emphasis: 'fire'},
                of(5),
                item,
                false
            ]);
        });

        it("should pass valid damage types on modifiers", () => {
            addModifier(actor, item,"", 'damage damageType="fire" +5');
            expect(modifierManager.add.lastCall.args).to.have.deep.members([
                'damage',
                {name: '', type: null, damageType: 'fire'},
                of(5),
                item,
                false
            ]);
        });

        it("should omit invalid damage types on modifiers", () => {
            addModifier(actor, item,"", 'damage damageType="frie" +5');
            expect(modifierManager.add.lastCall.args).to.have.deep.members([
                'damage',
                {name: '', type: null},
                of(5),
                item,
                false
            ]);
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