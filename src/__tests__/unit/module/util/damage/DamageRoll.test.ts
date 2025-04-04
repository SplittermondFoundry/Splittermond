import {describe, it} from "mocha";
import {expect} from "chai";
import sinon from "sinon";
import {DamageRoll} from "module/util/damage/DamageRoll.js";
import {Die, FoundryRoll} from "module/api/Roll";
import {createTestRoll, stubFoundryRoll} from "../../../RollMock";


describe("DamageRoll damage string parsing and stringifying", () => {
    ([
        ["0d0 +0", {nDice: 0, nFaces: 0, damageModifier: 0}],
        ["0d6 +0", {nDice: 0, nFaces: 6, damageModifier: 0}],
        ["0d6 +1", {nDice: 0, nFaces: 6, damageModifier: 1}],
        ["garbage", {nDice: 0, nFaces: 0, damageModifier: 0}],
        ["1d6 +1", {nDice: 1, nFaces: 6, damageModifier: 1}],
        ["2d6", {nDice: 2, nFaces: 6, damageModifier: 0}],
        ["2_d_6_+_1", {nDice: 2, nFaces: 6, damageModifier: 1}],
        ["1d10 -1", {nDice: 1, nFaces: 10, damageModifier: -1}],
        ["1W6 + 1", {nDice: 1, nFaces: 6, damageModifier: 1}],
        ["1w6+ 1", {nDice: 1, nFaces: 6, damageModifier: 1}],
        ["1W6- 1", {nDice: 1, nFaces: 6, damageModifier: -1}],
        ["2d6- 1", {nDice: 2, nFaces: 6, damageModifier: -1}],
        ["2d6+ 1 +1", {nDice: 2, nFaces: 6, damageModifier: +2}],
        ["2d6+ 1 +1+3", {nDice: 2, nFaces: 6, damageModifier: +5}],
        ["9d6+10", {nDice: 9, nFaces: 6, damageModifier: 10}],
        ["9W10+20", {nDice: 9, nFaces: 10, damageModifier: 20}],
        ["20W10+200", {nDice: 20, nFaces: 10, damageModifier: 200}],
        ["20W12+200", {nDice: 0, nFaces: 0, damageModifier: 0}],
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
});

describe("DamageRoll feature string parsing and stringifying", () => {
    ([
        ["Scharf", {scharf: {name: "Scharf", value: 1, active: false}}],
        ["Scharf1", {scharf: {name: "Scharf", value: 1, active: false}}],
        ["Kritisch 2", {kritisch: {name: "Kritisch", value: 2, active: false}}],
        ["kritisch2", {kritisch: {name: "kritisch", value: 2, active: false}}],
        ["Exakt 3", {exakt: {name: "Exakt", value: 3, active: false}}],
        ["eXakT     25", {exakt: {name: "eXakT", value: 25, active: false}}],
        ["Wuchtig", {wuchtig: {name: "Wuchtig", value: 1, active: false}}],
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

describe("Addition to Damage Roll", () => {
    it("should increase damage modifier by amount", () => {
        const damageRoll = new DamageRoll({nDice: 1, nFaces: 6, damageModifier: 1, features: {}});
        damageRoll.increaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6+6");
    });

    it("should decrease damage modifier by amount", () => {
        const damageRoll = new DamageRoll({nDice: 1, nFaces: 6, damageModifier: 7, features: {}});
        damageRoll.decreaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6+2");
    });

    it("should double damage modifier on addition if 'Wuchtig' feature exists", () => {
        const damageRoll = new DamageRoll({
            nDice: 1, nFaces: 6, damageModifier: 7, features: {
                wuchtig: {name: "Wuchtig", value: 1, active: false}
            }
        });
        damageRoll.increaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6+17");
    });

    it("should double damage modifier on subtraction if 'Wuchtig' feature exists", () => {
        const damageRoll = new DamageRoll({
            nDice: 1, nFaces: 6, damageModifier: 7, features: {
                wuchtig: {name: "Wuchtig", value: 1, active: false}
            }
        });
        damageRoll.decreaseDamage(5);

        expect(damageRoll.getDamageFormula()).to.equal("1W6-3");
    });

})

describe("DamageRoll evaluation", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("Should add an optional die for exact feature", async () => {
        const damageString = "1d6"
        const rollMock: FoundryRoll = createTestRoll("1d6", [1], 0);
        const mock = stubFoundryRoll(rollMock, sandbox);
        await DamageRoll.parse(damageString, "Exakt 1").evaluate();

        expect(mock.callCount).to.equal(1);
        expect(mock.firstCall.args[0]).to.equal("2d6kh1");
    });

    it("Should not increase the lowest dice for scharf feature", async () => {
        const damageString = "2d6";
        const rollMock: FoundryRoll = createTestRoll("2d6", [1, 1], 0);
        stubFoundryRoll(rollMock, sandbox);

        const roll = await DamageRoll.parse(damageString, "Scharf 2").evaluate();

        expect(roll._total).to.equal(4);
        expect(getFirstDie(roll).results[0].result).to.equal(1);
        expect(getFirstDie(roll).results[1].result).to.equal(1);
    });

    it("Should not increase the highest dice for kritisch feature", async () => {
        const damageString = "2d6"
        const rollMock: FoundryRoll = createTestRoll("2d6", [6, 6], 0);
        stubFoundryRoll(rollMock, sandbox);

        const roll = await DamageRoll.parse(damageString, "Kritisch 2").evaluate();

        expect(roll._total).to.equal(16);
        expect(getFirstDie(roll).results[0].result).to.equal(6);
        expect(getFirstDie(roll).results[1].result).to.equal(6);
    });
});

describe("Feature activation", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should activate the exakt feature", async () => {
        const damageString = "1d6"
        const rollMock: FoundryRoll = createTestRoll("1d6", [1], 0);
        stubFoundryRoll(rollMock, sandbox);
        const damageRoll = DamageRoll.parse(damageString, "Exakt 1");
        await damageRoll.evaluate();

        expect(damageRoll.getActiveFeatures()).to.deep.equal({exakt: {name: "Exakt", value: 1, active: true}});
    });

    it("should activate the scharf feature", async () => {
        const damageString = "1d6"
        const rollMock: FoundryRoll = createTestRoll("1d6", [1], 0);
        stubFoundryRoll(rollMock, sandbox);
        const damageRoll = DamageRoll.parse(damageString, "Scharf 2");
        await damageRoll.evaluate();

        expect(damageRoll.getActiveFeatures()).to.deep.equal({scharf: {name: "Scharf", value: 2, active: true}});
    });

    it("should activate the kritisch feature", async () => {
        const damageString = "1d6"
        const rollMock: FoundryRoll = createTestRoll("1d6", [6], 0);
        stubFoundryRoll(rollMock, sandbox);
        const damageRoll = DamageRoll.parse(damageString, "Kritisch 1");
        await damageRoll.evaluate();

        expect(damageRoll.getActiveFeatures()).to.deep.equal({kritisch: {name: "Kritisch", value: 1, active: true}});
    });
});

function getFirstDie(roll: FoundryRoll) {
    return roll.terms.find(term => "results" in term && "faces" in term) as Die;
}
