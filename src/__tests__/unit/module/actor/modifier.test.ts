import {describe, it} from "mocha";
import {expect} from "chai";
import sinon from "sinon";
import Modifier, {Modifiers} from "module/actor/modifier.js";
import SplittermondItem from "module/item/item";
import {TooltipFormula} from "module/util/tooltip";
import {of} from "module/modifiers/expressions/scalar";
import {foundryApi} from "../../../../module/api/foundryApi";

describe("Modifier", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());
    const mockOrigin = {} as SplittermondItem;

    it("should initialize with correct values", () => {
        const mod = new Modifier("speed.multiplier", of(2), {name: "Speed Boost", type: "magic"}, mockOrigin, true);
        expect(mod.value).to.deep.equal(of(2));
        expect(mod.path).to.equal("speed.multiplier");
        expect(mod.selectable).to.be.true;
    });

    it("should detect malus/bonus correctly", () => {
        const bonus = new Modifier("path", of(2), {name: "Bonus", type: "innate"});
        const malus = new Modifier("path", of(-3), {name: "Malus", type: "innate"});
        const neutral = new Modifier("path", of(0), {name: "Neutral", type: "innate"});

        expect(bonus.isBonus).to.be.true;
        expect(malus.isMalus).to.be.true;
        expect(neutral.isBonus).to.be.false;
        expect(neutral.isMalus).to.be.false;
    });

    it("should format tooltip correctly", () => {
        const bonus = new Modifier("path", of(2), {name: "Bonus", type: "innate"});
        const malus = new Modifier("path", of(-3), {name: "Malus", type: "innate"});
        const formula = sandbox.createStubInstance(TooltipFormula)

        bonus.addTooltipFormulaElements(formula);
        malus.addTooltipFormulaElements(formula);

        expect(formula.addBonus.calledWith("+2", "Bonus")).to.be.true;
        expect(formula.addMalus.calledWith("-3", "Malus")).to.be.true;
    });
});

describe("Modifiers", () => {
    it("should create a new instance from static method", () => {
        const one = new Modifier("path", of(2), {name: "One", type: "innate"});
        const other = new Modifier("path", of(3), {name: "Two", type: "innate"});

        const modifiers = new Modifiers(one, other);

        expect(modifiers[0]).to.equal(one);
        expect(modifiers[1]).to.equal(other);
    });

    it("should calculate the total value correctly", () => {
        const one = new Modifier("path", of(2), {name: "One", type: "innate"});
        const other = new Modifier("path", of(3), {name: "Two", type: "innate"});

        const modifiers = new Modifiers(one, other);

        expect(modifiers.value).to.equal(5);
    });

    it("should calculate the total value correctly", () => {
        const one = new Modifier("path", of(2), {name: "One", type: "innate"});
        const other = new Modifier("path", of(3), {name: "Two", type: "innate"});

        const modifiers = new Modifiers(one, other).filter(mod => mod.attributes.name === "One");

        expect(modifiers.value).to.equal(2);
    });
    describe("modifier tooltips", () => {
        let sandbox: sinon.SinonSandbox;
        beforeEach(() => {
            sandbox = sinon.createSandbox()
            sandbox.stub(foundryApi, "localize").callsFake((inp) => inp);
        });
        afterEach(() => sandbox.restore());
        it("should add all parts to the tooltip formula", () => {

            const one = new Modifier("path", of(2), {name: "One", type: "innate"});
            const other = new Modifier("path", of(3), {name: "Two", type: "innate"});
            const modifiers = new Modifiers(one, other);
            const formula = new TooltipFormula();

            modifiers.addTooltipFormulaElements(formula);

            expect(formula.getData()[1]).to.deep.equal({type:"part",classes: "formula-part bonus", value: "2", description: "One"});
            expect(formula.getData()[3]).to.deep.equal({type:"part",classes: "formula-part bonus", value: "3", description: "Two"});
        });
    });
});

