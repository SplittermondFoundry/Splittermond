import { expect } from "chai";
import SplittermondSpellItem from "../../../../module/item/spell.js";
import { getSpellAvailabilityParser } from "module/item/availabilityParser";
import { afterEach, beforeEach, describe, it } from "mocha";
import { initializeSpellCostManagement } from "module/util/costs/spellCostManagement";
import { Cost } from "module/util/costs/Cost";
import sinon, { SinonSandbox } from "sinon";
import { SpellDataModel } from "../../../../module/item/dataModel/SpellDataModel";
import SplittermondActor from "../../../../module/actor/actor";
import ModifierManager from "../../../../module/actor/modifier-manager";
import { createTestRoll, stubRollApi } from "../../RollMock";
import { evaluate, of } from "../../../../module/modifiers/expressions/scalar";
import { of as ofCost } from "../../../../module/modifiers/expressions/cost";
import { ItemFeaturesModel } from "../../../../module/item/dataModel/propertyModels/ItemFeaturesModel";
import { DamageRoll } from "../../../../module/util/damage/DamageRoll";
import { foundryApi } from "../../../../module/api/foundryApi";
import { DamageModel } from "../../../../module/item/dataModel/propertyModels/DamageModel";

describe("Spell item availability display", () => {
    const sampleSpell = new SplittermondSpellItem(
        {},
        { splittermond: { ready: true } },
        getSpellAvailabilityParser({ localize: (str) => str.split(".").pop() ?? str }, ["illusionmagic", "deathmagic"])
    );
    sampleSpell.system = { skill: "illusionmagic", skillLevel: 1, availableIn: "" } as SpellDataModel;

    it("Sources spell school and level from data when availability is not set", () => {
        const actual = sampleSpell.availableInList;

        expect(actual).to.deep.contain({ label: "illusionmagic 1" });
    });

    it("Transforms single skill availability", () => {
        sampleSpell.system.availableIn = "illusionmagic 1";
        const actual = sampleSpell.availableInList;
        expect(actual.length).to.eq(1);
        expect(actual[0]).to.deep.equal({ label: "illusionmagic 1" });
    });

    it("Transforms single skill availability formatted with colon", () => {
        sampleSpell.system.availableIn = "illusionmagic:1";
        const actual = sampleSpell.availableInList;
        expect(actual.length).to.eq(1);
        expect(actual[0]).to.deep.equal({ label: "illusionmagic 1" });
    });

    it("Transforms several skill availabilities", () => {
        sampleSpell.system.availableIn = "illusionmagic 1, deathmagic 2";
        const actual = sampleSpell.availableInList;
        expect(actual[0]).to.deep.equal({ label: "illusionmagic 1" });
        expect(actual[1]).to.deep.equal({ label: "deathmagic 2" });
    });

    it("Filters out invalid availability from list", () => {
        sampleSpell.system.availableIn = "illusionmagic 1, deathmagic2";
        const actual = sampleSpell.availableInList;
        expect(actual).to.deep.contain({ label: "illusionmagic 1" });
        expect(actual.length).to.equal(1);
    });

    it("Handles incorrectly formatted list", () => {
        sampleSpell.system.availableIn = "illusionmagic:1 deathmagic:2";
        const actual = sampleSpell.availableInList;
        expect(actual[0]).to.deep.contain({ label: "illusionmagic 1" });
    });

    it("Uses default for null availability", () => {
        testWithInvalidAvailibility(null);
    });

    it("Uses default for single word availability", () => {
        testWithInvalidAvailibility("not a valid spell availability");
    });

    it("Uses default for wrong type availability", () => {
        testWithInvalidAvailibility(123);
    });

    function testWithInvalidAvailibility(availabilityValue: any) {
        sampleSpell.system.availableIn = availabilityValue;

        const actual = sampleSpell.availableInList;

        expect(actual.length).to.eq(1);
        expect(typeof actual[0]).to.equal("object");
    }
});

describe("Spell item cost calculation", () => {
    const sampleSpell = new SplittermondSpellItem(
        {},
        { splittermond: { ready: true } },
        getSpellAvailabilityParser({ localize: (str) => str.split(".").pop() ?? str }, ["illusionmagic", "deathmagic"])
    );
    sampleSpell.system = {
        skill: "illusionmagic",
        skillLevel: 1,
        availableIn: "",
        costs: "K2V2",
        enhancementCosts: "1EG/+K2V2",
    } as SpellDataModel;
    Object.defineProperty(sampleSpell, "actor", {
        value: { system: initializeSpellCostManagement({}) },
        enumerable: true,
        writable: false,
    });

    it("should return the base cost if no actor is associated to this spell", () => {
        const actual = sampleSpell.costs;
        expect(actual).to.equal("K2V2");
    });

    it("should return the base enhancement cost if no actor is associated to this spell", () => {
        const actual = sampleSpell.enhancementCosts;
        expect(actual).to.equal("1EG/+K2V2");
    });

    it("should reduce the cost of a spell if an actor is associated to this spell", () => {
        (sampleSpell.actor.system as any) /*member is initialized above*/.spellCostReduction.modifiers
            .put(ofCost(new Cost(1, 1, true).asModifier()), null, null);
        expect(sampleSpell.costs).to.equal("K1V1");
    });

    it("should reduce the enhancement cost of a spell if an actor is associated to this spell", () => {
        (sampleSpell.actor.system as any) /*member is initialized above*/.spellEnhancedCostReduction.modifiers
            .put(ofCost(new Cost(1, 1, true).asModifier()), null, null);
        expect(sampleSpell.enhancementCosts).to.equal("1EG/+K1V1");
    });
});

describe("Spell item roll costs", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => sandbox.restore());

    function createStub(focusCosts: string): SplittermondSpellItem {
        const stub = sandbox.createStubInstance(SplittermondSpellItem);
        stub.getCostsForFinishedRoll.callThrough();
        sandbox.stub(stub, "costs").get(() => focusCosts);
        return stub;
    }

    it("should return the costs if a roll is successful", () => {
        const stub = createStub("2V2");
        const actual = stub.getCostsForFinishedRoll(0, true);
        expect(actual).to.deep.equal(new Cost(0, 2, false).asPrimaryCost());
    });

    it("should return reduced costs for critical successes", () => {
        const stub = createStub("2V2");
        const actual = stub.getCostsForFinishedRoll(5, true);
        expect(actual).to.deep.equal(new Cost(0, 1, false).asPrimaryCost());
    });

    it("should not return reduced costs for critical successes when costing channeled focus", () => {
        const stub = createStub("K2");
        const actual = stub.getCostsForFinishedRoll(5, true);
        expect(actual).to.deep.equal(new Cost(2, 0, true).asPrimaryCost());
    });

    it("should return reduced costs for critical successes when costing channeled focus", () => {
        const stub = createStub("K4V2");
        const actual = stub.getCostsForFinishedRoll(5, true);
        expect(actual).to.deep.equal(new Cost(2, 1, true).asPrimaryCost());
    });

    it("should return reduced costs for critical successes when costing exhausted focus", () => {
        const stub = createStub("2");
        const actual = stub.getCostsForFinishedRoll(5, true);
        expect(actual).to.deep.equal(new Cost(1, 0, false).asPrimaryCost());
    });

    it("should return degrees of success as costs if a roll is not successful", () => {
        const stub = createStub("2V2");
        const actual = stub.getCostsForFinishedRoll(-2, false);
        expect(actual).to.deep.equal(new Cost(2, 0, false).asPrimaryCost());
    });
});

describe("Spell item damage report", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
        sandbox.stub(DamageRoll, "fromExpression").callsFake((exp, features) => {
            const parsed = evaluate(exp);
            return new DamageRoll(createTestRoll("", [], parsed), features);
        });
    });
    afterEach(() => sandbox.restore());

    it("should return the damage report", () => {
        const underTest = setUpSpell(sandbox);
        defineValue(underTest.system, "damage", DamageModel.from("2W6"));
        defineValue(underTest.system, "damageType", "light");
        defineValue(underTest.system, "costType", "V");
        defineValue(underTest.system, "features", ItemFeaturesModel.emptyFeatures());

        const damages = underTest.getForDamageRoll();

        expect(damages.principalComponent.damageType).to.equal("light");
        expect(damages.principalComponent.damageRoll.getDamageFormula()).to.equal("2W6");
    });

    it("should fill in properties from the item", () => {
        const underTest = setUpSpell(sandbox);
        defineValue(underTest.system, "damage", DamageModel.from("2W6"));
        defineValue(underTest.system, "damageType", "physical");
        defineValue(underTest.system, "costType", "V");
        defineValue(underTest.system, "features", ItemFeaturesModel.from("Wuchtig"));
        const modifierProperties = {
            type: "magic" as const,
            name: "Klinge aus Licht",
            features: "Scharf 2",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(1), null, false);

        const damages = underTest.getForDamageRoll();

        expect(damages.otherComponents).to.have.lengthOf(1);
        expect(damages.otherComponents[0].damageRoll.getDamageFormula()).to.equal("1");
        expect(damages.otherComponents[0].damageType).to.equal("physical");
        expect(damages.otherComponents[0].damageRoll.getFeatureString()).to.equal("Scharf 2, Wuchtig");
    });

    it("should account for modifiers on actor", () => {
        const underTest = setUpSpell(sandbox);
        defineValue(underTest, "name", "Kettenblitz");
        const modifierProperties = {
            type: "magic" as const,
            name: "Klinge aus Licht",
            damageType: "light",
            features: "Scharf 2",
            item: "Kettenblitz",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(3), null, false);

        const damages = underTest.getForDamageRoll();

        expect(damages.otherComponents).to.have.lengthOf(1);
        expect(damages.otherComponents[0].damageRoll.getDamageFormula()).to.equal("3");
        expect(damages.otherComponents[0].damageType).to.equal("light");
        expect(damages.otherComponents[0].damageRoll.getFeatureString()).to.equal("Scharf 2");
    });

    it("should account for global modifiers", () => {
        const underTest = setUpSpell(sandbox);
        defineValue(underTest, "name", "Kettenblitz");
        const modifierProperties = {
            type: "magic" as const,
            name: "Klinge aus Licht",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(3), null, false);

        const damages = underTest.getForDamageRoll();

        expect(damages.otherComponents).to.have.lengthOf(1);
    });

    it("should account for type modifiers", () => {
        const underTest = setUpSpell(sandbox);
        defineValue(underTest, "name", "Kettenblitz");
        const modifierProperties = {
            type: "magic" as const,
            itemType: "spell",
            name: "Klinge aus Licht",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(3), null, false);

        const damages = underTest.getForDamageRoll();

        expect(damages.otherComponents).to.have.lengthOf(1);
    });

    it("should filter out type modifiers", () => {
        const underTest = setUpSpell(sandbox);
        defineValue(underTest, "name", "Kettenblitz");
        const modifierProperties = {
            type: "magic" as const,
            itemType: "weapon",
            name: "Klinge aus Licht",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(3), null, false);

        const damages = underTest.getForDamageRoll();

        expect(damages.otherComponents).to.have.lengthOf(0);
    });

    it("should ignore selectable modifiers", () => {
        const underTest = setUpSpell(sandbox);
        const modifierProperties = {
            type: "magic" as const,
            name: "Klinge aus Licht",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(3), null, true);

        const damages = underTest.getForDamageRoll();

        expect(damages.otherComponents).to.have.lengthOf(0);
    });

    it("should ignore modifiers for other items", () => {
        const underTest = setUpSpell(sandbox);
        defineValue(underTest, "name", "Kettenblitz");
        const modifierProperties = {
            type: "magic" as const,
            name: "Klinge aus Licht",
            item: "Regentanz",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(3), null, false);

        const damages = underTest.getForDamageRoll();

        expect(damages.otherComponents).to.have.lengthOf(0);
    });

    it("should produce a printable damage report via a getter", () => {
        sandbox.stub(foundryApi.utils, "mergeObject").returns({});
        const parser = getSpellAvailabilityParser({ localize: (str) => str.split(".").pop() ?? str }, []);
        const underTest = new SplittermondSpellItem({}, { splittermond: { ready: true } }, parser);
        defineValue(underTest, "actor", setUpActor(sandbox));
        defineValue(underTest, "system", sandbox.createStubInstance(SpellDataModel));
        defineValue(underTest.system, "damage", DamageModel.from("1W6 +2"));
        const modifierProperties = {
            type: "magic" as const,
            name: "Klinge aus Licht",
        };
        underTest.actor.modifier.add("item.damage", modifierProperties, of(3), null, false);

        const damageString = underTest.damage;

        expect(damageString).to.equal("1W6 + 5");
    });

    function defineValue(object: object, property: string, value: unknown) {
        Object.defineProperty(object, property, { value, enumerable: true, writable: true });
    }

    function setUpSpell(sandbox: SinonSandbox) {
        const stub = sinon.createStubInstance(SplittermondSpellItem);
        stub.type = "spell";
        const system = sandbox.createStubInstance(SpellDataModel);
        Object.defineProperty(stub, "system", { value: system, enumerable: true, writable: false });
        Object.defineProperty(stub, "actor", { value: setUpActor(sandbox), enumerable: true, writable: false });
        stub.getForDamageRoll.callThrough();
        defineValue(system, "damage", DamageModel.from("2W6"));
        defineValue(system, "damageType", "physical");
        defineValue(system, "costType", "V");
        defineValue(system, "features", ItemFeaturesModel.emptyFeatures());
        return stub;
    }

    function setUpActor(sandbox: SinonSandbox) {
        const actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor, "getFlag", { value: sandbox.stub(), enumerable: true, writable: false });
        Object.defineProperty(actor, "modifier", { value: new ModifierManager(), enumerable: true, writable: false });
        return actor;
    }
});
