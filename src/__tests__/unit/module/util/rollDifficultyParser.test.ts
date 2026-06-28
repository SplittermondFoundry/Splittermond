import { expect } from "chai";
import { describe, it } from "mocha";
import { parseRollDifficulty } from "module/util/rollDifficultyParser";
import { fromExpression } from "module/util/util";
import { of } from "module/modifiers/expressions/scalar";

describe("roll difficulty parser", () => {
    it("should return the difficulty as number if initialized with a number", () => {
        const rollDifficulty = parseRollDifficulty("20");
        expect(rollDifficulty.difficulty).to.equal(20);
    });

    it("should return the default difficulty if initialized with an invalid string", () => {
        const rollDifficulty = parseRollDifficulty("invalid string");
        expect(rollDifficulty.difficulty).to.equal(15);
    });

    it("should return the default difficulty before evaluation if initialized with a target-dependent string", () => {
        const rollDifficulty = parseRollDifficulty("VTD");
        expect(rollDifficulty.difficulty).to.equal(15);
    });

    it("should evaluate VTD based on target's defense value", async () => {
        const rollDifficulty = parseRollDifficulty("VTD");
        await rollDifficulty.evaluate(createTokenStub());
        expect(rollDifficulty.difficulty).to.equal(18);
    });

    it("should evaluate KW based on target's bodyresist value", async () => {
        const rollDifficulty = parseRollDifficulty("KW");
        await rollDifficulty.evaluate(createTokenStub());
        expect(rollDifficulty.difficulty).to.equal(12);
    });

    it("should evaluate GW based on target's mindresist value", async () => {
        const rollDifficulty = parseRollDifficulty("GW");
        await rollDifficulty.evaluate(createTokenStub());
        expect(rollDifficulty.difficulty).to.equal(14);
    });
});

function createTokenStub() {
    return {
        actor: {
            derivedValues: {
                defense: { value: fromExpression(() => of(18)) },
                bodyresist: { value: fromExpression(() => of(12)) },
                mindresist: { value: fromExpression(() => of(14)) },
            },
        },
    };
}
