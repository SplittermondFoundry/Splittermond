import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import Modifier from "module/modifiers/impl/modifier";
import SplittermondItem from "module/item/item";
import { TooltipFormula } from "module/util/tooltip";
import { of } from "module/modifiers/expressions/scalar";

describe("Modifier", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());
    const mockOrigin = {} as SplittermondItem;

    it("should initialize with correct values", () => {
        const mod = new Modifier("speed.multiplier", of(2), { name: "Speed Boost", type: "magic" }, mockOrigin, true);
        expect(mod.value).to.deep.equal(of(2));
        expect(mod.path).to.equal("speed.multiplier");
        expect(mod.selectable).to.be.true;
    });

    it("should detect malus/bonus correctly", () => {
        const bonus = new Modifier("path", of(2), { name: "Bonus", type: "innate" });
        const malus = new Modifier("path", of(-3), { name: "Malus", type: "innate" });
        const neutral = new Modifier("path", of(0), { name: "Neutral", type: "innate" });

        expect(bonus.isBonus).to.be.true;
        expect(malus.isMalus).to.be.true;
        expect(neutral.isBonus).to.be.false;
        expect(neutral.isMalus).to.be.false;
    });

    it("should format tooltip correctly", () => {
        const bonus = new Modifier("path", of(2), { name: "Bonus", type: "innate" });
        const malus = new Modifier("path", of(-3), { name: "Malus", type: "innate" });
        const formula = sandbox.createStubInstance(TooltipFormula);

        bonus.addTooltipFormulaElements(formula);
        malus.addTooltipFormulaElements(formula);

        expect(formula.addBonus.calledWith("+2", "Bonus")).to.be.true;
        expect(formula.addMalus.calledWith("-3", "Malus")).to.be.true;
    });
});
