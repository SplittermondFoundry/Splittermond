import sinon, {SinonSandbox} from "sinon";
import {beforeEach, describe} from "mocha";
import Attack from "module/actor/attack";
import {ItemFeaturesModel} from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import SplittermondActor from "module/actor/actor";
import ModifierManager from "module/actor/modifier-manager";
import {evaluate, of} from "module/modifiers/expressions/scalar";
import {expect} from "chai";
import {CharacterDataModel} from "module/actor/dataModel/CharacterDataModel";
import {foundryApi} from "module/api/foundryApi";
import {DamageRoll} from "../../../../module/util/damage/DamageRoll";
import {createTestRoll, stubRollApi} from "../../RollMock";
import {DamageModel} from "../../../../module/item/dataModel/propertyModels/DamageModel";

describe("Attack", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox()
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
            const attackItem = setUpAttackItem({damage: DamageModel.from("1W6+2"), features: ItemFeaturesModel.from("Scharf 2")});
            actor.modifier.add("item.damage", {
                type: "magic",
                damageType: "light",
                name: attackItem?.name
            }, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

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
                feature: "Scharf 2"
            }
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

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
            }
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

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
            }
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

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
            }
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

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
            }
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, true)
            const underTest = new Attack(actor, attackItem);

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
                item: "Kurzschwert"
            }
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(0);

        });

        it("should account for Improvisation feature", () => {
            const actor = setUpActor(sandbox);
            sandbox.stub(actor, "items").value([({name: "Improvisation", type: "mastery"})]);
            const attackItem = setUpAttackItem({damage: DamageModel.from("1W6+2"), features: ItemFeaturesModel.from("Improvisiert")});
            actor.modifier.add("item.damage", {
                type: "magic",
                damageType: "light",
                name: attackItem?.name
            }, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

            const damageItems = underTest.getForDamageRoll();

            expect(damageItems.otherComponents).to.have.length(2);
            expect(damageItems.otherComponents[1].damageType).to.equal("physical");
            expect(damageItems.otherComponents[1].damageRoll.getDamageFormula()).to.equal("2");
        });

        it("should produce a readable damage string", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({damage: DamageModel.from("1W6+2")});
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
            }
            actor.modifier.add("item.damage", modifierAttributes, of(3), null, false)
            const underTest = new Attack(actor, attackItem);

            expect(underTest.damage).to.equal("1W6 + 5");
        });

        it("zero damage should be rendered as empty string ", () => {
            const actor = setUpActor(sandbox);
            const attackItem = setUpAttackItem({damage: DamageModel.from("0")});
            attackItem.name = "Langschwert";
            const modifierAttributes = {
                type: "magic" as const,
                name: "Klinge des Lichts",
            }
            actor.modifier.add("item.damage", modifierAttributes, of(0), null, false)
            const underTest = new Attack(actor, attackItem);

            expect(underTest.damage).to.equal("");
        });
    });

    it("should account for weapon speed modifiers", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({weaponSpeed: 7});
        actor.modifier.add("item.weaponspeed", {type: "magic", name: attackItem?.name}, of(3), null, false)
        const underTest = new Attack(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(4);
    });

    it("should filter weapon speed modifiers by itemType", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({weaponSpeed: 7});
        attackItem.type="npcAttack"
        actor.modifier.add("item.weaponspeed", {type: "magic", name: attackItem?.name, itemType:"npcAttack"}, of(3), null, false)
        const underTest = new Attack(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(4);
    });

    it("should filter out weapon speed modifiers by itemType", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({weaponSpeed: 7});
        attackItem.type="npcAttack"
        actor.modifier.add("item.weaponspeed", {type: "magic", name: attackItem?.name, itemType:"weapon"}, of(3), null, false)
        const underTest = new Attack(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(7);
    });

    it("should account for improvisation in weapon speed", () => {
        const actor = setUpActor(sandbox);
        sandbox.stub(actor, "items").value([({name: "Improvisation", type: "mastery"})]);
        const attackItem = setUpAttackItem({weaponSpeed: 7, features: ItemFeaturesModel.from("Improvisiert")});
        const underTest = new Attack(actor, attackItem);

        expect(underTest.weaponSpeed).to.equal(5);
    });

    it("should report prepared if attack represents a melee attack", () => {
        const actor = setUpActor(sandbox);
        const attackItem = setUpAttackItem({skill: "blades"});

        const underTest = new Attack(actor, attackItem);

        expect(underTest.isPrepared).to.be.true;
    });

    ["longrange", "throwing"].forEach((skill) => {
        it(`should not report prepared if attack represents a ${skill} attack`, () => {
            const actor = setUpActor(sandbox);
            actor.getFlag.withArgs("splittermond", "preparedAttack").returns(null);
            const attackItem = setUpAttackItem({skill});

            const underTest = new Attack(actor, attackItem);

            expect(underTest.isPrepared).to.be.false;
        });

        it(`should not report prepared if ${skill} attack is prepared`, () => {
            const id = "3122345234"
            const actor = setUpActor(sandbox);
            actor.getFlag.withArgs("splittermond", "preparedAttack").returns(id);
            const attackItem = setUpAttackItem({skill});
            attackItem.id = id;

            const underTest = new Attack(actor, attackItem);

            expect(underTest.isPrepared).to.be.true;
        });
    });
});

function setUpActor(sandbox: SinonSandbox) {
    const actor = sandbox.createStubInstance(SplittermondActor);
    const dataModel = sandbox.createStubInstance(CharacterDataModel);
    Object.defineProperty(actor, "getFlag", {value: sandbox.stub(), enumerable: true, writable: false});
    Object.defineProperty(actor, "modifier", {value: new ModifierManager(), enumerable: true, writable: false});
    Object.defineProperty(actor, "system", {value: dataModel, enumerable: true, writable: false});
    Object.defineProperty(actor.system, "skills", {value: {}, enumerable: true, writable: false});
    Object.defineProperty(actor, "items", {value: [], enumerable: true, writable: true});
    actor.findItem.callThrough()
    return actor;
}

type AttackItemData = ConstructorParameters<typeof Attack>[1]["system"];

function setUpAttackItem(props: AttackItemData = {}): ConstructorParameters<typeof Attack>[1] {
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
            damage: new DamageModel({stringInput: "1W6+2"}),
            weaponSpeed: 7,
            damageType: "physical",
            costType: "V",
            ...props
        }
    }
}