import "../../foundryMocks.js";
import {expect} from 'chai';
import SplittermondSpellItem from "../../../../module/item/spell.js";
import {getSpellAvailabilityParser} from "../../../../module/item/availabilityParser.ts";
import {describe} from "mocha";
import {initializeSpellCostManagement} from "../../../../module/util/costs/spellCostManagement.ts";
import {Cost} from "../../../../module/util/costs/Cost.ts";
import sinon from "sinon";

describe("Spell item availability display", () => {
    const sampleSpell = new SplittermondSpellItem({}, {splittermond: {ready: true}}, getSpellAvailabilityParser({localize: (str) => str.split(".").pop()}, ["illusionmagic", "deathmagic"]));
    sampleSpell.system = {skill: "illusionmagic", skillLevel: 1, availableIn: ""};

    it("Sources spell school and level from data when availaility is not set", () => {
        const actual = sampleSpell.availableInList;

        expect(actual).to.deep.contain({label: "illusionmagic 1"});
    });

    it("Transforms single skill availability", () => {
        sampleSpell.system.availableIn = "illusionmagic 1";
        const actual = sampleSpell.availableInList;
        expect(actual.length).to.eq(1);
        expect(actual[0]).to.deep.equal({label: "illusionmagic 1"});
    });

    it("Transforms single skill availability formatted with colon", () => {
        sampleSpell.system.availableIn = "illusionmagic:1";
        const actual = sampleSpell.availableInList;
        expect(actual.length).to.eq(1);
        expect(actual[0]).to.deep.equal({label: "illusionmagic 1"});
    });
    it("Transforms several skill availabilities", () => {
        sampleSpell.system.availableIn = "illusionmagic 1, deathmagic 2";
        const actual = sampleSpell.availableInList;
        expect(actual[0]).to.deep.equal({label: "illusionmagic 1"});
        expect(actual[1]).to.deep.equal({label: "deathmagic 2"});
    });

    it("Filters out invalid availability from list", () => {
        sampleSpell.system.availableIn = "illusionmagic 1, deathmagic2";
        const actual = sampleSpell.availableInList;
        expect(actual).to.deep.contain({label: "illusionmagic 1"});
        expect(actual.length).to.equal(1);
    });

    it("Handles incorrectly formatted list", () => {
        sampleSpell.system.availableIn = "illusionmagic:1 deathmagic:2";
        const actual = sampleSpell.availableInList;
        expect(actual[0]).to.deep.contain({label: "illusionmagic 1"});
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


    function testWithInvalidAvailibility(availabilityValue) {
        sampleSpell.system.availableIn = availabilityValue;

        const actual = sampleSpell.availableInList;

        expect(actual.length).to.eq(1);
        expect(typeof actual[0]).to.equal("object");

    }
});

describe("Spell item cost calculation", () => {
    const sampleSpell = new SplittermondSpellItem({}, {splittermond: {ready: true}}, getSpellAvailabilityParser({localize: (str) => str.split(".").pop()}, ["illusionmagic", "deathmagic"]));
    sampleSpell.system = {skill: "illusionmagic", skillLevel: 1, availableIn: "", costs: "K2V2", enhancementCosts: "1EG/+K2V2"};

    it("should return the base cost if no actor is associated to this spell", () => {
        const actual = sampleSpell.costs;
        expect(actual).to.equal("K2V2");
    });

    it("should return the base enhancement cost if no actor is associated to this spell", () => {
       const actual = sampleSpell.enhancementCosts;
       expect(actual).to.equal("1EG/+K2V2");
    });

    it("should reduce the cost of a spell if an actor is associated to this spell", () => {
       sampleSpell.actor = { system:initializeSpellCostManagement({}) }
       sampleSpell.actor.system.spellCostReduction.modifiers.put(new Cost(1, 1, true).asModifier(),null, null);
       expect(sampleSpell.costs).to.equal("K1V1");
    });
    it("should reduce the enhancement cost of a spell if an actor is associated to this spell", () => {
        sampleSpell.actor = { system:initializeSpellCostManagement({}) }
        sampleSpell.actor.system.spellEnhancedCostReduction.modifiers
            .put(new Cost(1, 1, true).asModifier(),null, null);
        expect(sampleSpell.enhancementCosts).to.equal("1EG/+K1V1");
    });
});

describe("Spell item roll costs", () =>{
    function createStub(){
        const stub = sinon.createStubInstance(SplittermondSpellItem);
        stub.getCostsForFinishedRoll.callThrough();
        sinon.stub(stub,"costs").get(()=>"2V2");
        return stub;
    }

    it("should return the costs if a roll is successful", () => {
        const stub = createStub();
        const actual = stub.getCostsForFinishedRoll(0, true);
        expect(actual).to.deep.equal(new Cost(0, 2, false).asPrimaryCost());
    })

    it("should return reduced costs for critical successes", () => {
        const stub = createStub();
        const actual = stub.getCostsForFinishedRoll(5, true);
        expect(actual).to.deep.equal(new Cost(0, 1, false).asPrimaryCost());
    });

    it("should return degrees of success as costs if a roll is not successful", () => {
        const stub = createStub();
        const actual = stub.getCostsForFinishedRoll(-2, false);
        expect(actual).to.deep.equal(new Cost(2, 0, false).asPrimaryCost());
    });
})