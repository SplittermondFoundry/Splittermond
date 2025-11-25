import sinon, { SinonSandbox } from "sinon";
import { beforeEach, describe } from "mocha";
import Attack from "module/actor/attack";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import SplittermondActor from "module/actor/actor";
import ModifierManager from "module/actor/modifiers/modifier-manager";
import { evaluate, of } from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import { foundryApi } from "module/api/foundryApi";
import { DamageRoll } from "module/util/damage/DamageRoll";
import { createTestRoll, stubRollApi } from "../../RollMock";
import { DamageModel } from "module/item/dataModel/propertyModels/DamageModel";
import Skill from "module/actor/skill";

describe("Attack", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        stubRollApi(sandbox);
    });

    afterEach(() => sandbox.restore());

    describe("damage calculation", () => {
        beforeEach(() => {
            sandbox.stub(DamageRoll, "fromExpression").callsFake((exp, features) => {
                const parsed = evaluate(exp);
                return new DamageRoll(createTestRoll("", [], parsed), features);
            });
        });

        it("should produce a damage roll", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({
                damage: DamageModel.from("1W6+2"),
                features: ItemFeaturesModel.from("Scharf 2"),
            });
            actor.modifier.add(
                "item.damage",
                {
                    type: "magic",
                    damageType: "light",
                    name: attackItem?.name,
                },
                of(3),
                null,
                false
            );
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.principalComponent.damageType).to.equal("physical");
            expect(damageItems.principalComponent.damageRoll.getDamageFormula()).to.equal("1W6 + 2");
            expect(damageItems.principalComponent.damageRoll.getFeatureString()).to.equal("Scharf 2");
        });

        it("should account for damage modifiers", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem();
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
                damageType: "light",
                item: attackItem?.name,
                feature: "Scharf 2",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(1);
            expect(damageItems.otherComponents[0].damageType).to.equal("light");
            expect(damageItems.otherComponents[0].damageRoll.getDamageFormula()).to.equal("3");
            expect(damageItems.otherComponents[0].damageRoll.getFeatureString()).to.equal("Scharf 2");
        });

        it("should account for global modifiers", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem();
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(1);
        });

        it("should account for type modifiers", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem();
            attackItem.name = "Langschwert";
            attackItem.type = "weapon";
            const modifierAttributes = {
                type: "magic" as const,
                itemType: "weapon",
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(1);
        });

        it("should account for skill modifiers", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({ skill: "blades" });
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                skill: "blades",
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(1);
        });

        it("should filter out type modifiers", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem();
            attackItem.name = "Langschwert";
            attackItem.type = "weapon";
            const modifierAttributes = {
                type: "magic" as const,
                itemType: "npcAttack",
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(0);
        });

        it("should ignore selectable modifiers", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem();
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, true);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(0);
        });

        it("should ignore modifiers for different items", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem();
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
                item: "Kurzschwert",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(0);
        });

        it("should ignore for modifiers for different skills", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({ skill: "blades" });
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                skill: "staffs",
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.be.empty;
        });

        it("should ignore modifiers if attack has no skill", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({ skill: undefined });
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                skill: "staffs",
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.be.empty;
        });

        it("should account for Improvisation feature", () => {
            const actor = setUpActor(sandbox);
            sandbox.stub(actor, "items").value([{ name: "Improvisation", type: "mastery" }]);
            const attackItem = setUpAttackItem({
                damage: DamageModel.from("1W6+2"),
                features: ItemFeaturesModel.from("Improvisiert"),
            });
            actor.modifier.add(
                "item.damage",
                {
                    type: "magic",
                    damageType: "light",
                    name: attackItem?.name,
                },
                of(3),
                null,
                false
            );
            const underTest = Attack.initialize(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(2);
            expect(damageItems.otherComponents[1].damageType).to.equal("physical");
            expect(damageItems.otherComponents[1].damageRoll.getDamageFormula()).to.equal("2");
        });

        it("should produce a readable damage string", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({ damage: DamageModel.from("1W6+2") });
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            expect(underTest.damage).to.equal("1W6 + 5");
        });

        it("zero damage should be rendered as empty string ", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({ damage: DamageModel.from("0") });
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
            };
            actor.modifier.add("item.damage", modifierAttributes, of(0), null, false);
            const underTest = Attack.initialize(actor, attackItem);

            expect(underTest.damage).to.equal("");
        });
    });

    it("should pass custom options to the roll method", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem();
        const underTest = Attack.initialize(actor, attackItem);

        const customOptions = {
            type: "spell",
            title: "foo",
            subtitle: "bar",
            difficulty: 20,
            preSelectedModifier: ["Custom Modifier"],
            modifier: 5,
            checkMessageData: { baz: 1 },
        };

        const rollSpy = sandbox.stub(Skill.prototype, "roll").callsFake((options) => Promise.resolve(options));
        underTest.roll(customOptions);

        expect(rollSpy.calledOnce).to.be.true;
        const passedOptions = rollSpy.firstCall.firstArg;
        expect(passedOptions).to.exist;
        expect(passedOptions?.type).to.equal(customOptions.type);
        expect(passedOptions?.title).to.equal(customOptions.title);
        expect(passedOptions?.subtitle).to.equal(customOptions.subtitle);
        expect(passedOptions?.difficulty).to.equal(customOptions.difficulty);
        expect(passedOptions?.preSelectedModifier).to.deep.equal(customOptions.preSelectedModifier);
        expect(passedOptions?.modifier).to.equal(customOptions.modifier);
        expect(passedOptions?.checkMessageData).to.deep.equal(customOptions.checkMessageData);
    });

    it("should merge default options with custom options in the roll method", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem();
        const underTest = Attack.initialize(actor, attackItem);

        const customOptions = {
            difficulty: 20,
            modifier: 5,
        };

        const rollSpy = sandbox.stub(Skill.prototype, "roll").callsFake((options) => Promise.resolve(options));
        underTest.roll(customOptions);

        expect(rollSpy.calledOnce).to.be.true;
        const passedOptions = rollSpy.firstCall.firstArg;
        expect(passedOptions).to.exist;
        expect(passedOptions?.type).to.equal("attack");
        expect(passedOptions?.title).to.equal(undefined);
        expect(passedOptions?.subtitle).to.equal(attackItem.name);
        expect(passedOptions?.difficulty).to.equal(customOptions.difficulty);
        expect(passedOptions?.preSelectedModifier).to.deep.equal([attackItem.name]);
        expect(passedOptions?.modifier).to.equal(customOptions.modifier);
        // checkMessageData contains a roll result, so a full deep equal comparison will fail most of the time
        expect(
            passedOptions?.checkMessageData ? Object.keys(passedOptions?.checkMessageData.weapon) : []
        ).to.deep.equal(
            Object.keys({
                ...underTest.toObjectData(),
                damageImplements: underTest.getForDamageRoll(),
            })
        );
    });

    it("should use default options when no custom options are provided", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem();
        const underTest = Attack.initialize(actor, attackItem);

        const rollSpy = sandbox.stub(Skill.prototype, "roll").callsFake((options) => Promise.resolve(options));
        underTest.roll();

        expect(rollSpy.calledOnce).to.be.true;
        const passedOptions = rollSpy.firstCall.firstArg;
        expect(passedOptions).to.exist;
        expect(passedOptions?.type).to.equal("attack");
        expect(passedOptions?.title).to.equal(undefined);
        expect(passedOptions?.subtitle).to.equal(attackItem.name);
        expect(passedOptions?.difficulty).to.equal("VTD");
        expect(passedOptions?.preSelectedModifier).to.deep.equal([attackItem.name]);
        expect(passedOptions?.modifier).to.equal(0);
        // checkMessageData contains a roll result, so a full deep equal comparison will fail most of the time
        expect(
            passedOptions?.checkMessageData ? Object.keys(passedOptions?.checkMessageData.weapon) : []
        ).to.deep.equal(
            Object.keys({
                ...underTest.toObjectData(),
                damageImplements: underTest.getForDamageRoll(),
            })
        );
    });

    it("should account for weapon speed modifiers", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({ weaponSpeed: 7 });
        actor.modifier.add("item.weaponspeed", { type: "magic", name: attackItem?.name }, of(3), null, false);
        const underTest = Attack.initialize(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(4);
    });

    it("should filter out weapon speed modifiers by itemType", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({ weaponSpeed: 7 });
        attackItem.type = "npcAttack";
        actor.modifier.add(
            "item.weaponspeed",
            { type: "magic", name: attackItem?.name, itemType: "weapon" },
            of(3),
            null,
            false
        );
        const underTest = Attack.initialize(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(7);
    });

    it("should filter out weapon speed modifiers by item skill", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({ weaponSpeed: 7, skill: "staffs" });
        actor.modifier.add(
            "item.weaponspeed",
            { type: "magic", name: attackItem?.name, skill: "blades" },
            of(3),
            null,
            false
        );
        const underTest = Attack.initialize(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(7);
    });

    it("should filter out weapon speed modifiers if attack has no skill", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({ weaponSpeed: 7, skill: undefined });
        actor.modifier.add(
            "item.weaponspeed",
            { type: "magic", name: attackItem?.name, skill: "blades" },
            of(3),
            null,
            false
        );
        const underTest = Attack.initialize(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(7);
    });
    it("should account for improvisation in weapon speed", () => {
        const actor = setUpActor(sandbox);
        sandbox.stub(actor, "items").value([{ name: "Improvisation", type: "mastery" }]);
        const attackItem = setUpAttackItem({ weaponSpeed: 7, features: ItemFeaturesModel.from("Improvisiert") });
        const underTest = Attack.initialize(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(5);
    });

    it("should report prepared if attack represents a melee attack", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({ skill: "blades" });

        const underTest = Attack.initialize(actor, attackItem);

        expect(underTest.isPrepared).to.be.true;
    });

    ["longrange", "throwing"].forEach((skill) => {
        it(`should not report prepared if attack represents a ${skill} attack`, () => {
            const actor = setUpActor(sandbox);
            actor.getFlag.withArgs("splittermond", "preparedAttack").returns(null);
            const attackItem = setUpAttackItem({ skill });

            const underTest = Attack.initialize(actor, attackItem);

            expect(underTest.isPrepared).to.be.false;
        });

        it(`should not report prepared if ${skill} attack is prepared`, () => {
            const id = "3122345234";
            const actor = setUpActor(sandbox);
            actor.getFlag.withArgs("splittermond", "preparedAttack").returns(id);
            const attackItem = setUpAttackItem({ skill });
            attackItem.id = id;

            const underTest = Attack.initialize(actor, attackItem);

            expect(underTest.isPrepared).to.be.true;
        });
    });
});

function setUpActor(sandbox: SinonSandbox) {
    const actor = sandbox.createStubInstance(SplittermondActor);
    const dataModel = sandbox.createStubInstance(CharacterDataModel);
    Object.defineProperty(dataModel, "experience", {
        value: { heroLevel: 1 },
        enumerable: true,
        writable: false,
    });
    Object.defineProperty(actor, "getFlag", { value: sandbox.stub(), enumerable: true, writable: false });
    Object.defineProperty(actor, "modifier", { value: new ModifierManager(), enumerable: true, writable: false });
    Object.defineProperty(actor, "system", { value: dataModel, enumerable: true, writable: false });
    Object.defineProperty(actor.system, "skills", { value: {}, enumerable: true, writable: false });
    Object.defineProperty(actor, "items", { value: [], enumerable: true, writable: true });
    actor.findItem.callThrough();
    return actor;
}

type AttackItemData = Parameters<typeof Attack.initialize>[1]["system"];

function setUpAttackItem(props: AttackItemData = {}): Parameters<typeof Attack.initialize>[1] {
    return {
        id: "",
        img: "",
        name: "",
        type: "weapon",
        system: {
            skill: "melee",
            attribute1: "STA",
            attribute2: "BEW",
            skillValue: 15,
            minAttributes: "BEW 1, STA 1",
            skillMod: 0,
            damageLevel: 0,
            range: 0,
            features: ItemFeaturesModel.from("Scharf 2"),
            damage: new DamageModel({ stringInput: "1W6+2" }),
            weaponSpeed: 7,
            damageType: "physical",
            costType: "V",
            ...props,
        },
    };
}
