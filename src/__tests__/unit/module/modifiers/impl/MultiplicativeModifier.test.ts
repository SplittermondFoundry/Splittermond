import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { MultiplicativeModifier } from "module/activeEffect";
import { evaluate, of } from "module/modifiers/expressions/scalar";
import { TooltipFormula } from "module/util/tooltip";

describe("MultiplicativeModifier", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it("should initialize with correct values", () => {
        const mod = MultiplicativeModifier.create("speed.multiplier", of(2), { name: "Haste", type: "magic" }, true);
        expect(mod.value).to.deep.equal(of(2));
        expect(mod.path).to.equal("speed.multiplier");
        expect(mod.selectable).to.be.true;
    });

    it("should detect multiplicative bonus/malus correctly", () => {
        const bonus = MultiplicativeModifier.create("path", of(2), { name: "Bonus", type: "innate" });
        const malus = MultiplicativeModifier.create("path", of(0.5), { name: "Malus", type: "innate" });
        const neutral = MultiplicativeModifier.create("path", of(1), { name: "Neutral", type: "innate" });

        expect(bonus.isBonus).to.be.true;
        expect(malus.isMalus).to.be.true;
        expect(neutral.isBonus).to.be.false;
        expect(neutral.isMalus).to.be.false;
    });

    it("should format tooltip correctly", () => {
        const bonus = MultiplicativeModifier.create("path", of(2), { name: "Bonus", type: "innate" });
        const malus = MultiplicativeModifier.create("path", of(0.5), { name: "Malus", type: "innate" });
        const formula = sandbox.createStubInstance(TooltipFormula);

        bonus.addTooltipFormulaElements(formula);
        malus.addTooltipFormulaElements(formula);

        expect(formula.addOperator.calledWith("*")).to.be.true;
        expect(formula.addPart.calledWith("2", "Bonus", "bonus")).to.be.true;
        expect(formula.addPart.calledWith("0.5", "Malus", "malus")).to.be.true;
    });

    it("should raise its value to the multiplier via applyMultiplier (pow operator)", async () => {
        const mod = MultiplicativeModifier.create("path", of(0.5), { name: "Malus", type: "innate" });
        const multiplied = mod.applyMultiplier(of(2));
        expect(await evaluate(multiplied)).to.equal(0.25);
    });
});
