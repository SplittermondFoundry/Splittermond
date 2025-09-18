import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";
import { addRolls, type Die as DieType, sumRolls } from "module/api/Roll";

declare class Die implements DieType {
    formula: string;
    results: { active: boolean; result: number; discarded?: boolean }[];
    _evaluated: boolean;
    faces: number;
    modifiers: string[];
    number: number;
}

declare class OperatorTerm {
    operator: string;
}

declare class NumericTerm {
    number: number;
}

export function foundryRollTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("test API", () => {
        it("should fail if 1000 dice or more are requested", async () => {
            foundryApi
                .roll("1000d6")
                .evaluate()
                .then(() => expect.fail("Expected test to throw an error"));
        });

        it("should return a roll object", async () => {
            const rollResult = await foundryApi.roll("2d6+1").evaluate();

            expect(rollResult).to.have.property("terms");
            expect(rollResult).to.have.property("_total");
            expect(rollResult).to.have.property("total");

            expect(rollResult.terms).to.be.instanceOf(Array);
            expect(rollResult.terms).to.have.length(3);
            expect(rollResult.terms[0]).to.have.property("results");
            expect(rollResult.terms[0]).to.have.property("faces");
            expect(rollResult.terms[0]).to.have.property("number");
            const firstTerm = rollResult.terms[0] as { results: any; faces: any; number: any };
            expect(firstTerm.results).to.be.instanceOf(Array);
            expect(firstTerm.faces).to.equal(6);
            expect(firstTerm.number).to.equal(2);

            expect(firstTerm).to.be.instanceOf(Die);
            expect(firstTerm.results).to.have.length(2);
            expect(firstTerm.results[0]).to.have.property("active");
            expect(firstTerm.results[0]).to.have.property("result");
            expect(firstTerm.results[0].result).to.be.below(7).and.above(0);
            expect(firstTerm.results[0].active).to.be.true;

            expect(rollResult.terms[1]).to.be.instanceOf(OperatorTerm);
            expect((rollResult.terms[1] as OperatorTerm).operator).to.equal("+");

            expect(rollResult.terms[2]).to.be.instanceOf(NumericTerm);
            expect((rollResult.terms[2] as NumericTerm).number).to.equal(1);
        });

        it("should not fail for a zero dice formula", async () => {
            const rollResult = await foundryApi.roll("0d0").evaluate();

            expect(rollResult.total).to.equal(0);
        });

        it("should have a result if not evaluated", () => {
            expect(foundryApi.roll("1d6+3").result).to.contain("+ 3");
        });

        it("should not produce a total if not evaluated", () => {
            expect(foundryApi.roll("1d6+3").total).to.equal(0);
        });

        it("has an absolute function", () => {
            expect(foundryApi.roll("abs(-3)").evaluateSync().total).to.equal(3);
        });

        it("should have a result if evaluated", async () => {
            const rollResult = await foundryApi
                .roll("1d6")
                .evaluate()
                .then((roll) => roll.total);
            expect(rollResult).to.be.above(0);
            expect(rollResult).to.be.below(7);
        });

        it("should allow manipulation of roll terms", async () => {
            const roll = foundryApi.roll("998d6");
            (roll.terms[0] as Die).number += 1;
            (roll.terms[0] as Die).modifiers.push("kh1");

            const rollResult = await roll.evaluate();

            expect((rollResult.terms[0] as Die).results.length).to.equal(999);
            expect(rollResult.total).to.be.below(7);
        });

        it("should allow adding of roll terms", async () => {
            const roll = foundryApi.roll("1d6");

            roll.terms.push(foundryApi.rollInfra.plusTerm());
            roll.terms.push(foundryApi.rollInfra.numericTerm(3));
            roll.terms.push(foundryApi.rollInfra.minusTerm());
            roll.terms.push(foundryApi.rollInfra.numericTerm(3));
            roll.resetFormula();

            expect(roll.terms.length).to.equal(5);
            expect(roll.formula).to.equal("1d6 + 3 - 3");
        });

        it("should reset formula", async () => {
            const roll = foundryApi.roll("1d6+3");
            roll.terms.push(foundryApi.rollInfra.plusTerm(), foundryApi.rollInfra.numericTerm(3));
            roll.resetFormula();

            expect(roll.formula).to.equal("1d6 + 3 + 3");
        });

        it("should produce a tooltip", async () => {
            const rollResult = await foundryApi.roll("2d6+1").evaluate();

            const tooltip = await rollResult.getTooltip();
            expect(tooltip).to.contain('<span class="part-formula">2d6</span>');
            expect(tooltip).to.match(/(<li class="roll die d6(?: min| max)?">[1-6]<\/li>)/);
        });

        ["1d6 +", "1W6", "leerzeichen", "+K2V3", ""].forEach((input) => {
            it(`should fail if '${input}' is not a roll formula`, () => {
                expect(foundryApi.rollInfra.validate(input as string)).to.be.false;
            });
        });

        it("should create a numeric term", () => {
            const numericTerm = foundryApi.rollInfra.numericTerm(3);
            expect(numericTerm.number).to.equal(3);
            expect(numericTerm.total).to.equal(3);
            expect(numericTerm.expression).to.equal("3");
        });

        it("should consume a numeric term", () => {
            const numericTerm = foundryApi.rollInfra.numericTerm(3);

            const roll = foundryApi.rollInfra.rollFromTerms([numericTerm]).evaluateSync();
            expect(roll.total).to.equal(3);
        });
    });

    describe("Roll addition", () => {
        it("should allow concatenation of rolls", async () => {
            const rollResult1 = foundryApi.roll("2d6+1");
            const rollResult2 = foundryApi.roll("1d10+3");

            const roll = await addRolls(rollResult1, rollResult2).evaluate();

            expect(rollResult1.formula).to.equal("2d6 + 1");
            expect(rollResult2.formula).to.equal("1d10 + 3");
            expect(roll.formula).to.equal("2d6 + 1 + 1d10 + 3");
            expect(roll.total).to.be.above(6);
            expect(roll.total).to.be.below(27); //2*6+1+1*10+3;
        });

        it("should shallow copy the terms", async () => {
            const rollResult1 = foundryApi.roll("2d6+1");
            const rollResult2 = foundryApi.roll("1d10+3");

            const roll = await addRolls(rollResult1, rollResult2).evaluate();
            await rollResult1.evaluate();
            await rollResult2.evaluate();

            expect(rollResult1.total + rollResult2.total).to.equal(roll.total);
        });

        it("should allow concatenation of evaluated rolls", async () => {
            const rollResult1 = await foundryApi.roll("2d6+1").evaluate();
            const rollResult2 = await foundryApi.roll("1d10+3").evaluate();

            const roll = addRolls(rollResult1, rollResult2);

            expect(rollResult1.formula).to.equal("2d6 + 1");
            expect(rollResult2.formula).to.equal("1d10 + 3");
            expect(roll.formula).to.equal("2d6 + 1 + 1d10 + 3");
        });

        it("should allow summation of evaluated rolls", async () => {
            const rollResult1 = await foundryApi.roll("2d6+1").evaluate();
            const rollResult2 = await foundryApi.roll("1d10+3").evaluate();

            const roll = sumRolls([rollResult1, rollResult2]);

            expect(rollResult1.formula).to.equal("2d6 + 1");
            expect(rollResult2.formula).to.equal("1d10 + 3");
            expect(roll.formula).to.equal("2d6 + 1 + 1d10 + 3");
        });
    });
}
