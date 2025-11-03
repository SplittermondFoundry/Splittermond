import { expect } from "chai";
import { describe, it } from "mocha";
import { parseRollDifficulty } from "module/util/rollDifficultyParser";

describe("roll difficulty parser", () => {
    it("should return the difficulty as number if initialized with a number", () => {
        const rollDifficulty = parseRollDifficulty(20);
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

    it("should evaluate VTD based on target's defense value", () => {
        const rollDifficulty = parseRollDifficulty("VTD");
        rollDifficulty.evaluate({
            actor: {
                derivedValues: {
                    defense: { value: 18 },
                    bodyresist: { value: 12 },
                    mindresist: { value: 14 },
                },
            },
        });
        expect(rollDifficulty.difficulty).to.equal(18);
    });

    it("should evaluate KW based on target's bodyresist value", () => {
        const rollDifficulty = parseRollDifficulty("KW");
        rollDifficulty.evaluate({
            actor: {
                derivedValues: {
                    defense: { value: 18 },
                    bodyresist: { value: 12 },
                    mindresist: { value: 14 },
                },
            },
        });
        expect(rollDifficulty.difficulty).to.equal(12);
    });

    it("should evaluate GW based on target's mindresist value", () => {
        const rollDifficulty = parseRollDifficulty("GW");
        rollDifficulty.evaluate({
            actor: {
                derivedValues: {
                    defense: { value: 18 },
                    bodyresist: { value: 12 },
                    mindresist: { value: 14 },
                },
            },
        });
        expect(rollDifficulty.difficulty).to.equal(14);
    });
});
