import { afterEach, beforeEach, describe, it } from "mocha";
import { DamageModel } from "../../../../../../module/item/dataModel/propertyModels/DamageModel";
import { expect } from "chai";
import sinon from "sinon";
import { stubRollApi } from "../../../../RollMock";

describe("Damage Model", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());
    ["1W6, 1d6", "1W10 + 1", "0"].forEach((input) => {
        it(`should return ${input}as display value`, () => {
            const underTest = new DamageModel({ stringInput: input });
            expect(underTest.displayValue).to.equal(input);
        });
    });

    it("should convert 1W6 to 1d6 for calculation", () => {
        const underTest = new DamageModel({ stringInput: "1W6" });
        expect(underTest.calculationValue).to.equal("1d6");
    });

    ["", null].forEach((input) => {
        it(`should convert invalid values to an empty string for display`, () => {
            const underTest = new DamageModel({ stringInput: input });
            expect(underTest.displayValue).to.equal("");
        });

        it("should convert invalid value to 0 for calculation", () => {
            const underTest = new DamageModel({ stringInput: input });
            expect(underTest.calculationValue).to.equal("0");
        });
    });

    it("should return a roll", () => {
        stubRollApi(sandbox);
        const underTest = new DamageModel({ stringInput: "1 + 1W6 + 2 + 1W10" });
        expect(underTest.asRoll().formula).to.equal("1 + 1d6 + 2 + 1d10");
    });
});
