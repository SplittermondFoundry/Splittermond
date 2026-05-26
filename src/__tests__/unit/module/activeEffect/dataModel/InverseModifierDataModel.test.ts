import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { InverseModifier } from "module/activeEffect";
import { of } from "module/modifiers/expressions/scalar";
import { TooltipFormula } from "module/util/tooltip";

describe("InverseModifier", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it("should initialize with correct values", () => {
        const mod = InverseModifier.create("initiative", of(-2), { name: "Tempo", type: "magic" }, null, true);
        expect(mod.value).to.deep.equal(of(-2));
        expect(mod.path).to.equal("initiative");
        expect(mod.selectable).to.be.true;
    });

    it("should detect inverse bonus/malus correctly", () => {
        const bonus = InverseModifier.create("path", of(-2), { name: "Bonus", type: "innate" });
        const malus = InverseModifier.create("path", of(3), { name: "Malus", type: "innate" });
        const neutral = InverseModifier.create("path", of(0), { name: "Neutral", type: "innate" });

        expect(bonus.isBonus).to.be.true;
        expect(malus.isMalus).to.be.true;
        expect(neutral.isBonus).to.be.false;
        expect(neutral.isMalus).to.be.false;
    });

    it("should expose inverse modifier effectType", () => {
        const mod = InverseModifier.create("path", of(-1), { name: "Inverse", type: "magic" });
        expect(mod.effectType).to.equal("inverseModifier");
    });

    it("should format tooltip correctly", () => {
        const bonus = InverseModifier.create("path", of(-2), { name: "Bonus", type: "innate" });
        const malus = InverseModifier.create("path", of(3), { name: "Malus", type: "innate" });
        const formula = sandbox.createStubInstance(TooltipFormula);

        bonus.addTooltipFormulaElements(formula);
        malus.addTooltipFormulaElements(formula);

        expect(formula.addOperator.calledWith("-")).to.be.true;
        expect(formula.addOperator.calledWith("+")).to.be.true;
        expect(formula.addPart.calledWith("2", "Bonus", "bonus")).to.be.true;
        expect(formula.addPart.calledWith("3", "Malus", "malus")).to.be.true;
    });
});
