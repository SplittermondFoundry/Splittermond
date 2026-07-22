import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { InverseModifier } from "module/activeEffect";
import { evaluate, of } from "module/modifiers/expressions/scalar";
import { TooltipFormula } from "module/util/tooltip";

describe("InverseModifier", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it("should initialize with correct values", () => {
        const mod = InverseModifier.create("initiative", of(-2), { name: "Tempo", type: "magic" }, true);
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

    it("should multiply its value via applyMultiplier (times operator)", async () => {
        const mod = InverseModifier.create("path", of(-3), { name: "Bonus", type: "innate" }, true);
        const multiplied = mod.applyMultiplier(of(2));
        expect(await evaluate(multiplied.value)).to.equal(-6);
        expect(multiplied).to.be.instanceOf(InverseModifier);
        expect(multiplied.path).to.equal(mod.path);
        expect(multiplied.attributes).to.deep.equal(mod.attributes);
        expect(multiplied.selectable).to.equal(mod.selectable);
    });

    it("should return a new instance and leave the original value unchanged", async () => {
        const mod = InverseModifier.create("path", of(-3), { name: "Bonus", type: "innate" });
        const multiplied = mod.applyMultiplier(of(2));
        expect(multiplied).to.not.equal(mod);
        expect(await evaluate(mod.value)).to.equal(-3);
        expect(await evaluate(multiplied.value)).to.equal(-6);
    });

    it("should recompute isBonus/isMalus on the multiplied instance", async () => {
        const mod = InverseModifier.create("path", of(-3), { name: "Bonus", type: "innate" });
        const multiplied = mod.applyMultiplier(of(-1));
        expect(await evaluate(multiplied.value)).to.equal(3);
        expect(multiplied.isBonus).to.be.false;
        expect(multiplied.isMalus).to.be.true;
    });
});
