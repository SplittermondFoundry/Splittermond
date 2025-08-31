import {describe, it} from "mocha";
import {expect} from "chai";
import sinon, {SinonStub} from "sinon";
import {DamageRoll} from "module/util/damage/DamageRoll.js";
import {Die, FoundryRoll} from "module/api/Roll";
import {createTestRoll, MockRoll, stubFoundryRoll, stubRollApi} from "../../../RollMock";
import {ItemFeatureDataModel, ItemFeaturesModel} from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import {foundryApi} from "../../../../../module/api/foundryApi";


describe("DamageRoll input optimization", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
    });
    afterEach(() => sandbox.restore());

    it("should parse damage string with 'W' to 'd'", () => {
        const damageRoll = DamageRoll.parse("1W6+2", "Scharf 1");

        expect(damageRoll.getDamageFormula()).to.equal("1W6 + 2");
    });

    it("should condense numeric terms", () => {
        const mockRoll = createTestRoll("1d6", [1]);
        mockRoll.terms.push(
            foundryApi.rollInfra.plusTerm(),
            foundryApi.rollInfra.numericTerm(2),
            foundryApi.rollInfra.plusTerm(),
            foundryApi.rollInfra.numericTerm(4),
            foundryApi.rollInfra.minusTerm(),
            foundryApi.rollInfra.numericTerm(5),
        );
        stubFoundryRoll(mockRoll, sandbox);

        DamageRoll.parse("1d6+2+4-5", "");

        expect((foundryApi.roll as SinonStub).lastCall.args).to.have.members(["1d6 + 1"]);
    });
});


describe("DamageRoll feature string parsing and stringifying", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
    });
    afterEach(() => sandbox.restore());
    ([
        [{name: "Scharf", value: 1}, "Scharf"],
        [{name: "Kritisch", value: 2}, "Kritisch 2"],
        [{name: "Exakt", value: 3}, "Exakt 3"],
    ] as const).forEach(([input, expected]) => {
        it(`should stringify ${JSON.stringify(input)} to ${expected}`, () => {
            const features = ItemFeaturesModel.from([new ItemFeatureDataModel(input)]);
            expect(DamageRoll.from("0d0+0", features).getFeatureString()).to.equal(expected);
        });
    });

    it("should stringify all features", () => {
        const features = ([
            {name: "Scharf", value: 1}, {name: "Kritisch", value: 2}, {name: "Exakt", value: 3}
        ] as const).map(f => new ItemFeatureDataModel(f));
        const damageRoll = DamageRoll.from("0d0+0", ItemFeaturesModel.from(features))

        expect(damageRoll.getFeatureString()).to.equal("Scharf, Kritisch 2, Exakt 3");
    });

    it("should produce the correct formula for a damage roll", () => {
        const roll = new DamageRoll(createTestRoll("1d6", [1], 2), ItemFeaturesModel.emptyFeatures());
        expect(roll.getDamageFormula()).to.equal("1W6 + 2");
    });

    it("should add a numeric term is none present",() =>{
        const roll = new DamageRoll(createTestRoll("1d6", [1]), ItemFeaturesModel.emptyFeatures());
        roll.increaseDamage(2);
        expect(roll.getDamageFormula()).to.equal("1W6 + 2");
    });

    it("should not add a numeric term if no modification happened",() =>{
        const roll = new DamageRoll(createTestRoll("1d6", [1]), ItemFeaturesModel.emptyFeatures());
        expect(roll.getDamageFormula()).to.equal("1W6");
    });

    it("should reuse the last numeric term",() =>{
        const roll = new DamageRoll(createTestRoll("1d6", [1], 2), ItemFeaturesModel.emptyFeatures());
        roll.increaseDamage(2);
        expect(roll.getDamageFormula()).to.equal("1W6 + 4");
    });

    it("should switch operators if damage switches",() =>{
        const roll = new DamageRoll(createTestRoll("1d6", [1], 2), ItemFeaturesModel.emptyFeatures());
        roll.decreaseDamage(4);
        expect(roll.getDamageFormula()).to.equal("1W6 - 2");
    });

    it("should reuse the only numeric term",() =>{
        const roll = new DamageRoll(createTestRoll("", [], 2), ItemFeaturesModel.emptyFeatures());
        expect(roll.getDamageFormula()).to.equal("2");
    });

    it("should handle multiple dice",() =>{
        const mock = createTestRoll("1d6", [6], 2)
        mock.terms.push(
            foundryApi.rollInfra.plusTerm(),
            new MockRoll("1d10").terms[0]
        )
        mock.resetFormula();
        const roll = new DamageRoll(mock, ItemFeaturesModel.emptyFeatures());
        expect(roll.getDamageFormula()).to.equal("1W6 + 2 + 1W10");
    });
});

describe("Addition to Damage Roll", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
    });
    afterEach(() => sandbox.restore());
    it("should increase damage modifier by amount", () => {
        const damageRoll = DamageRoll.parse("1W6 + 1", "")

        damageRoll.increaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6 + 6");
    });

    it("should decrease damage modifier by amount", () => {
        const damageRoll = DamageRoll.parse("1W6 + 7", "")

        damageRoll.decreaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6 + 2");
    });

    it("should double damage modifier on addition if 'Wuchtig' feature exists", () => {
        const damageRoll = DamageRoll.parse("1W6+7", "Wuchtig")

        damageRoll.increaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6 + 17");
    });

    it("should double damage modifier on subtraction if 'Wuchtig' feature exists", () => {
        const damageRoll = DamageRoll.parse("1W6+7", "Wuchtig")

        damageRoll.decreaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6 - 3");
    });

})

describe("DamageRoll evaluation", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
    });
    afterEach(()=>sandbox.restore())

    it("Should add an optional die for exact feature", async () => {
        const damageString = "1d6"

        const damageRoll = DamageRoll.parse(damageString, "Exakt 1");
        const evaluatedRoll = await damageRoll.evaluate();

        expect(evaluatedRoll.roll.formula).to.equal("2d6kh1");
    });

    it("Should not keep more dice than the original", async () => {
        const damageString = "1d6"

        const damageRoll = DamageRoll.parse(damageString, "Exakt 3");
        const evaluatedRoll = await damageRoll.evaluate();

        expect(evaluatedRoll.roll.formula).to.equal("4d6kh1");
    });

    it("Should add an optional die for exact feature 2", async () => {
        const damageString = "2d6"

        const damageRoll = DamageRoll.parse(damageString, "Exakt 2");
        const evaluatedRoll = await damageRoll.evaluate();

        expect(evaluatedRoll.roll.formula).to.equal("4d6kh2");
    });

    ([
        ["2d6",6],
        ["2d10",10]
    ] as const).forEach(([damageString,result])=> {
        it(`Should cap the minimum roll result for scharf feature at half the die size for ${damageString}`, async () => {
            const rollMock: FoundryRoll = createTestRoll(damageString, [1, 1], 0);
            stubFoundryRoll(rollMock, sandbox);

            const damageRoll = DamageRoll.parse(damageString, "Scharf 7");
            const roll = await damageRoll.evaluate();

            expect(roll.roll._total).to.equal(result);
            expect(getFirstDie(roll.roll).results[0].result).to.equal(1);
            expect(getFirstDie(roll.roll).results[1].result).to.equal(1);
        });
    });



    it("Should not increase the lowest dice for scharf feature", async () => {
        const damageString = "2d6";
        const rollMock: FoundryRoll = createTestRoll("2d6", [1, 1], 0);
        stubFoundryRoll(rollMock, sandbox);

        const damageRoll = DamageRoll.parse(damageString, "Scharf 2");
        const roll = await damageRoll.evaluate();

        expect(roll.roll._total).to.equal(4);
        expect(getFirstDie(roll.roll).results[0].result).to.equal(1);
        expect(getFirstDie(roll.roll).results[1].result).to.equal(1);
    });

    it("Should not increase the highest dice for kritisch feature", async () => {
        const damageString = "2d6"
        const rollMock: FoundryRoll = createTestRoll("2d6", [6, 6], 0);
        stubFoundryRoll(rollMock, sandbox);

        const roll = await DamageRoll.parse(damageString, "Kritisch 2").evaluate();

        expect(roll.roll._total).to.equal(16);
        expect(getFirstDie(roll.roll).results[0].result).to.equal(6);
        expect(getFirstDie(roll.roll).results[1].result).to.equal(6);
    });

    it("should carry modification through evaluation", async() => {
        const damageString = "1d6"

        const damageRoll = DamageRoll.parse(damageString);
        damageRoll.increaseDamage(2)
        const evaluatedRoll = await damageRoll.evaluate();

        expect(evaluatedRoll.roll.formula).to.equal("1d6 + 2");

    })
});

describe("Feature activation", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
    });
    afterEach(()=>sandbox.restore());

    it("should activate the exakt feature", async () => {
        const damageString = "1d6"
        const rollMock: FoundryRoll = createTestRoll("1d6", [1], 0);
        stubFoundryRoll(rollMock, sandbox);
        const damageRoll = DamageRoll.parse(damageString, "Exakt 1");
        const evaluatedRoll = await damageRoll.evaluate();

        expect(evaluatedRoll.getActiveFeatures()).to.deep.equal([{name: "Exakt", value: 1, active: true}]);
    });

    it("should activate the scharf feature", async () => {
        const damageString = "1d6"
        const rollMock: FoundryRoll = createTestRoll("1d6", [1], 0);
        stubFoundryRoll(rollMock, sandbox);
        const damageRoll = DamageRoll.parse(damageString, "Scharf 2");
        const evaluatedRoll = await damageRoll.evaluate();

        expect(evaluatedRoll.getActiveFeatures()).to.deep.equal([{name: "Scharf", value: 2, active: true}]);
    });

    it("should activate the kritisch feature", async () => {
        const damageString = "1d6"
        const rollMock: FoundryRoll = createTestRoll("1d6", [6], 0);
        stubFoundryRoll(rollMock, sandbox);
        const damageRoll = DamageRoll.parse(damageString, "Kritisch 1");
        const evaluatedRoll = await damageRoll.evaluate();

        expect(evaluatedRoll.getActiveFeatures()).to.deep.equal([{name: "Kritisch", value: 1, active: true}]);
    });
});

function getFirstDie(roll: FoundryRoll) {
    return roll.terms.find(term => "results" in term && "faces" in term) as Die;
}
