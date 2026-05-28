import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Modifier } from "module/activeEffect";
import SplittermondItem from "module/item/item";
import { of } from "module/modifiers/expressions/scalar";
import { TooltipFormula } from "module/util/tooltip";

describe("ModifierDataModel", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());
    const mockOrigin = {} as SplittermondItem;

    it("should initialize with correct values", () => {
        const mod = Modifier.create("speed.multiplier", of(2), { name: "Speed Boost", type: "magic" }, mockOrigin, true);
        expect(mod.value).to.deep.equal(of(2));
        expect(mod.path).to.equal("speed.multiplier");
        expect(mod.selectable).to.be.true;
    });

    it("should detect malus/bonus correctly", () => {
        const bonus = Modifier.create("path", of(2), { name: "Bonus", type: "innate" });
        const malus = Modifier.create("path", of(-3), { name: "Malus", type: "innate" });
        const neutral = Modifier.create("path", of(0), { name: "Neutral", type: "innate" });

        expect(bonus.isBonus).to.be.true;
        expect(malus.isMalus).to.be.true;
        expect(neutral.isBonus).to.be.false;
        expect(neutral.isMalus).to.be.false;
    });

    it("should expose modifier effectType", () => {
        const mod = Modifier.create("path", of(1), { name: "Bonus", type: "magic" });
        expect(mod.effectType).to.equal("modifier");
    });

    it("should format tooltip correctly", () => {
        const bonus = Modifier.create("path", of(2), { name: "Bonus", type: "innate" });
        const malus = Modifier.create("path", of(-3), { name: "Malus", type: "innate" });
        const formula = sandbox.createStubInstance(TooltipFormula);

        bonus.addTooltipFormulaElements(formula);
        malus.addTooltipFormulaElements(formula);

        expect(formula.addBonus.calledWith("+2", "Bonus")).to.be.true;
        expect(formula.addMalus.calledWith("-3", "Malus")).to.be.true;
    });
});
