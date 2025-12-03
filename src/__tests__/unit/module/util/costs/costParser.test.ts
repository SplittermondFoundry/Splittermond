import { describe, it } from "mocha";
import { expect } from "chai";
import { parseCostString, parseSpellEnhancementDegreesOfSuccess } from "module/util/costs/costParser.js";
import { Cost } from "module/util/costs/Cost.js";

describe("Parses costs correctly", () => {
    describe("Unparseable strings", () => {
        ["-", "", undefined, null, "Alle meine Entchen", [], 0].forEach((unparseableString) => {
            it(`the invalid string '${unparseableString}' returns a zero cost object`, () => {
                expect(parseCostString(unparseableString as any)).to.deep.equal(new Cost(0, 0, false));
            });
        });

        ["1 EG/K4V1", "1EG/+K4V1", " 2EG /  +K4V1"].forEach((enhancedCostString) => {
            it(`parses en enhanced cost string ${enhancedCostString}`, () => {
                expect(parseCostString(enhancedCostString)).to.deep.equal(new Cost(3, 1, true));
            });
        });
    });

    describe("Actual costs", () => {
        const validCosts = {
            K2: new Cost(2, 0, true),
            K2V1: new Cost(1, 1, true),
            K2V2: new Cost(0, 2, true),
            "20V10": new Cost(10, 10, false),
            "5000V100": new Cost(4900, 100, false),
            K1000V300: new Cost(700, 300, true),
            "1V1": new Cost(0, 1, false),
            "1": new Cost(1, 0, false),
        };
        Object.entries(validCosts).forEach(([costString, costObject]) => {
            it(`Parses ${costString} correctly`, () => {
                expect(parseCostString(costString)).to.deep.equal(costObject);
            });
        });
    });
    describe("Negative costs", () => {
        const validCosts = {
            "-K2": new Cost(-2, 0, true).asModifier(),
            "-K2V1": new Cost(-1, -1, true).asModifier(),
            "-K2V2": new Cost(-0, -2, true).asModifier(),
            "-20V10": new Cost(-10, -10, false).asModifier(),
            "-5000V100": new Cost(-4900, -100, false).asModifier(),
            "-K1000V300": new Cost(-700, -300, true).asModifier(),
            "-1V1": new Cost(-0, -1, false).asModifier(),
            "-1": new Cost(-1, 0, false).asModifier(),
        };
        Object.entries(validCosts).forEach(([costString, costObject]) => {
            it(`Parses ${costString} correctly`, () => {
                const actual = parseCostString(costString).asModifier();
                expect(actual).to.deep.equal(costObject);
            });
        });
    });

    describe("Invalid costs", () => {
        ["K2V3", "K2V-1", "K2V", "K1V0", "3V5", "V5"].forEach((invalidCost) => {
            it(`Returns a zero cost object for ${invalidCost}`, () => {
                expect(parseCostString(invalidCost)).to.deep.equal(new Cost(0, 0, false));
            });
        });
    });
});
describe("Parses degrees of success correctly", () => {
    (
        [
            ["20 EG", 20],
            ["4EG", 4],
            ["1 EG/K4V1", 1],
            ["1EG/+K4V1", 1],
            ["1eg/K8V2", 1],
            [" 2eG /  +K4V1", 2],
            ["3 Eg/+K4V1", 3],
            ["K4V1", 0],
            ["", 0],
            ["0EG/+0", 0],
        ] as const
    ).forEach(([costString, expectedDegreesOfSuccess]) => {
        it(`Parses ${costString} as ${expectedDegreesOfSuccess}`, () => {
            expect(parseSpellEnhancementDegreesOfSuccess(costString)).to.equal(expectedDegreesOfSuccess);
        });
    });
});
