import { toDisplayFormula, toRollFormula } from "../../../../../module/util/damage/util";
import { expect } from "chai";

describe("damage formula mapping", () => {
    [
        ["1W6", "1d6"],
        ["1D6", "1d6"],
        ["1w6", "1d6"],
        ["1w6+2", "1d6+2"],
        ["1w10+2", "1d10+2"],
        ["2w10     - 5", "2d10     - 5"],
        ["2d10     - 5 + 1W6", "2d10     - 5 + 1d6"],
    ].forEach(([input, expected]) => {
        it(`should convert display formula ${input} to ${expected}`, () => {
            expect(toRollFormula(input)).to.equal(expected);
        });
    });

    [
        ["1d6", "1W6"],
        ["1d6+2", "1W6 + 2"],
        ["1d10+2", "1W10 + 2"],
        ["2d10 -5", "2W10 - 5"],
        ["2d10- 5     +1d6", "2W10 - 5 + 1W6"],
    ].forEach(([input, expected]) => {
        it(`should convert roll formula ${input} to ${expected}`, () => {
            expect(toDisplayFormula(input)).to.equal(expected);
        });
    });
});
