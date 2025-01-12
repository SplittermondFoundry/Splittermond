import {describe, it} from "mocha";
import {expect} from "chai";
import sinon from "sinon";
import {DamageRoll} from "module/util/damage/DamageRoll.js";
import {foundryApi} from "module/api/foundryApi";
import {Die, Roll} from "../../../../module/api/foundryTypes";


describe("DamageRoll damage string parsing and stringifying", () => {
    ([
        ["0d0 +0", {nDice: 0, nFaces: 0, damageModifier: 0, otherDice: []}],
        ["0d6 +0", {nDice: 0, nFaces: 6, damageModifier: 0, otherDice: []}],
        ["0d6 +1", {nDice: 0, nFaces: 6, damageModifier: 1, otherDice: []}],
        ["garbage", {nDice: 0, nFaces: 0, damageModifier: 0, otherDice: []}],
        ["1d6 +1", {nDice: 1, nFaces: 6, damageModifier: 1, otherDice: []}],
        ["2d6", {nDice: 2, nFaces: 6, damageModifier: 0,otherDice: []}],
        ["2_d_6_+_1", {nDice: 2, nFaces: 6, damageModifier: 1, otherDice: []}],
        ["1d10 -1", {nDice: 1, nFaces: 10, damageModifier: -1, otherDice: []}],
        ["1W6 + 1", {nDice: 1, nFaces: 6, damageModifier: 1,otherDice: []}],
        ["1w6+ 1", {nDice: 1, nFaces: 6, damageModifier: 1,otherDice: []}],
        ["1W6- 1", {nDice: 1, nFaces: 6, damageModifier: -1,otherDice: []}],
        ["2d6- 1", {nDice: 2, nFaces: 6, damageModifier: -1,otherDice: []}],
        ["2d6+ 1 +1", {nDice: 2, nFaces: 6, damageModifier: +2, otherDice: []}],
        ["9d6+10", {nDice: 9, nFaces: 6, damageModifier: 10, otherDice: []}],
        ["9W10+20", {nDice: 9, nFaces: 10, damageModifier: 20, otherDice: []}],
        ["20W10+200", {nDice: 20, nFaces: 10, damageModifier: 200, otherDice: []}],
        ["20W12+200", {nDice: 0, nFaces: 0, damageModifier: 0, otherDice: []}],
        ["2d6+ 1 +1+1d6", {nDice: 2, nFaces: 6, damageModifier: +2, otherDice: [{nDice: 1, nFaces: 6, sign: 1}]}],
        ["2d6+ 2 +1+2d10", {nDice: 2, nFaces: 6, damageModifier: +3, otherDice: [{nDice: 2, nFaces: 10, sign: 1}]}],
        ["2d6+ 2 +1 - 2 d10", {nDice: 2, nFaces: 6, damageModifier: +3, otherDice: [{nDice: 2, nFaces: 10, sign: -1}]}],
    ] as const).forEach(([input, expected]) => {
        it(`should parse ${input} to ${JSON.stringify(expected)}`, () => {
            expect(DamageRoll.parse(input, "").toObject()).to.deep.equal({...expected, features: {}});
        });
    });

    ([
        [{nDice: 0, nFaces: 6, damageModifier: 1}, "0W6+1"],
        [{nDice: 1, nFaces: 6, damageModifier: 1}, "1W6+1"],
        [{nDice: 2, nFaces: 6, damageModifier: 0}, "2W6"],
        [{nDice: 1, nFaces: 10, damageModifier: -1}, "1W10-1"],
        [{nDice: 1, nFaces: 6, damageModifier: 1}, "1W6+1"],
        [{nDice: 1, nFaces: 6, damageModifier: -1}, "1W6-1"],
        [{nDice: 9, nFaces: 6, damageModifier: 10}, "9W6+10"],
        [{nDice: 20, nFaces: 10, damageModifier: 200}, "20W10+200"],
    ] as const).forEach(([input, expected]) => {
        it(`should stringify ${JSON.stringify(expected)} to ${input}`, () => {
            expect(new DamageRoll({...input, features: {}}).getDamageFormula()).to.equal(expected);
        });
    });

    it("should stringify extra dice as a question mark", () => {
        const input = {nDice:1, nFaces:6, damageModifier: 0, otherDice: [{nDice: 1, nFaces: 6}]};
        expect(new DamageRoll({...input, features: {}}).getDamageFormula()).to.equal("1W6+?");
    });
});

describe("DamageRoll feature string parsing and stringifying", () => {
    ([
        ["Scharf", {scharf: {name: "Scharf", value: 1, active: false}}],
        ["Scharf1", {scharf: {name: "Scharf", value: 1, active: false}}],
        ["Kritisch 2", {kritisch: {name: "Kritisch", value: 2, active: false}}],
        ["kritisch2", {kritisch: {name: "kritisch", value: 2, active: false}}],
        ["Exakt 3", {exakt: {name: "Exakt", value: 3, active: false}}],
        ["eXakT     25", {exakt: {name: "eXakT", value: 25, active: false}}]
    ] as const).forEach(([input, expected]) => {
        it(`should parse ${input} to ${JSON.stringify(expected)}`, () => {
            expect(DamageRoll.parse("", input).toObject().features).to.deep.equal(expected);
        });
    });

    it("should parse several features", () => {
        const damageRoll = DamageRoll.parse("", "Scharf 1, Kritisch 2, Exakt 3").toObject();
        expect(damageRoll.features).to.deep.equal({
            scharf: {name: "Scharf", value: 1, active: false},
            kritisch: {name: "Kritisch", value: 2, active: false},
            exakt: {name: "Exakt", value: 3, active: false}
        });
    });

    ([
        [{scharf: {name: "Scharf", value: 1, active: false}}, "Scharf 1"],
        [{kritisch: {name: "Kritisch", value: 2, active: false}}, "Kritisch 2"],
        [{exakt: {name: "Exakt", value: 3, active: false}}, "Exakt 3"],
    ] as const).forEach(([input, expected]) => {
        it(`should stringify ${JSON.stringify(input)} to ${expected}`, () => {
            expect(new DamageRoll({nDice: 0, nFaces: 0, damageModifier: 0, features: input})
                .getFeatureString()).to.equal(expected);
        });
    });

    it("should stringify all features", () => {
        const damageRoll = new DamageRoll({
            nDice: 0, nFaces: 0, damageModifier: 0, features: {
                scharf: {name: "Scharf", value: 1, active: false},
                kritisch: {name: "Kritisch", value: 2, active: false},
                exakt: {name: "Exakt", value: 3, active: false}
            }
        });
        expect(damageRoll.getFeatureString()).to.equal("Scharf 1, Kritisch 2, Exakt 3");
    });
});

describe("DamageRoll evaluation", () => {

    afterEach(() => sinon.restore());

    it("Should add an optional die for exact feature", async () => {
        const damageString = "1d6"
        const rollMock: Roll = {
            _total: 1, total: 1, terms: [], evaluate: () => Promise.resolve(rollMock),
            dice: [{faces: 6, results: [{active: true, result:1}]}]
        };
        const mock = sinon.stub(foundryApi, "roll").returns(rollMock);
        await DamageRoll.parse(damageString, "Exakt 1").evaluate();

        expect(mock.callCount).to.equal(1);
        expect(mock.firstCall.args[0]).to.equal("2d6kh1+0");
    });

    it("Should not increase the lowest dice for scharf feature", async () => {
        const damageString = "2d6";
        const terms = [
            {
                faces: 6,
                results: [
                    {active: true, result: 1},
                    {active: true, result: 1}],
            }
        ];
        const rollMock: Roll = {
            _total: 2, total: 2, terms, evaluate: () => Promise.resolve(rollMock),
            dice: [{faces: 6, results: [{active: true, result:1}]}]
        };
        sinon.stub(foundryApi, "roll").returns(rollMock);

        const roll = await DamageRoll.parse(damageString, "Scharf 2").evaluate();

        expect(roll._total).to.equal(4);
        expect(getDie(roll)[0].results[0].result).to.equal(1);
        expect(getDie(roll)[0].results[1].result).to.equal(1);
    });

    it("Should not increase the highest dice for kritisch feature", async () => {
        const damageString = "2d6"
        const terms = [
            {
                faces: 6,
                results: [
                    {active: true, result: 6},
                    {active: true, result: 6}],
            }
        ];
        const rollMock: Roll = {
            _total: 12, total: 12, terms, evaluate: () => Promise.resolve(rollMock),
            dice: [{faces: 6, results: [{active: true, result:6}]}]
        };
        sinon.stub(foundryApi, "roll").returns(rollMock);

        const roll = await DamageRoll.parse(damageString, "Kritisch 2").evaluate();

        expect(roll._total).to.equal(16);
        expect(getDie(roll)[0].results[0].result).to.equal(6);
        expect(getDie(roll)[0].results[1].result).to.equal(6);
    });

    it("Should add an optional die for all terms exact feature", async () => {
        const damageString = "1d6+1d6"
        const rollMock: Roll = {
            _total: 1, total: 1, terms: [], evaluate: () => Promise.resolve(rollMock),
            dice: [{faces: 6, results: [{active: true, result:1}]}]
        };
        const mock = sinon.stub(foundryApi, "roll").returns(rollMock);
        await DamageRoll.parse(damageString, "Exakt 1").evaluate();

        expect(mock.callCount).to.equal(1);
        expect(mock.firstCall.args[0]).to.equal("2d6kh1+2d6kh1+0");
    });

    it("Should apply Scharf feature to all dice", async () => {
        const damageString = "2d6+1d10"
        const terms = [
            {
                faces: 6,
                results: [
                    {active: true, result: 1},
                    {active: true, result: 1}],
            },
            {
                faces: 10,
                results: [{active: true, result: 1}]
            },
        ];
        const rollMock: Roll = {
            _total: 3, total: 3, terms, evaluate: () => Promise.resolve(rollMock),
            dice: [{faces: 6, results: [{active: true, result:2}]},{faces: 10, results: [{active: true, result:1}]}]
        };
        sinon.stub(foundryApi, "roll").returns(rollMock);

        const roll = await DamageRoll.parse(damageString, "Scharf 2").evaluate();

        expect(roll._total).to.equal(6);
        expect(getDie(roll)[0].results[0].result).to.equal(1);
        expect(getDie(roll)[0].results[1].result).to.equal(1);
        expect(getDie(roll)[1].results[0].result).to.equal(1);
    });

    it("Should apply Kritisch feature to all dice", async () => {
        const damageString = "1d6+1d10"
        const terms = [
            {
                faces: 6,
                results: [
                    {active: true, result: 6},
                    {active: true, result: 6}],
            },
            {
                faces: 10,
                results: [{active: true, result: 10}]
            },
        ];
        const rollMock: Roll = {
            _total: 22, total: 22, terms, evaluate: () => Promise.resolve(rollMock),
            dice: [{faces: 6, results: [{active: true, result:12}]},{faces: 10, results: [{active: true, result:10}]}]
        };
        sinon.stub(foundryApi, "roll").returns(rollMock);

        const roll = await DamageRoll.parse(damageString, "Kritisch 1").evaluate();

        expect(roll._total).to.equal(25);
        expect(getDie(roll)[0].results[0].result).to.equal(6);
        expect(getDie(roll)[0].results[1].result).to.equal(6);
        expect(getDie(roll)[1].results[0].result).to.equal(10);
    });
});

function getDie(roll: Roll):Die[] {
    return roll.terms.filter(term => "results" in term && "faces" in term );
}
