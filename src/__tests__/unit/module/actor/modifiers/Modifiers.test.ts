import Modifier from "module/modifiers/impl/modifier";
import { Modifiers } from "module/actor/modifiers/Modifiers";
import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";
import { TooltipFormula } from "module/util/tooltip";
import { describe, it } from "mocha";
import sinon from "sinon";
import { of } from "module/modifiers/expressions/scalar";

describe("Modifiers", () => {
    it("should create a new instance from static method", () => {
        const one = new Modifier("path", of(2), { name: "One", type: "innate" });
        const other = new Modifier("path", of(3), { name: "Two", type: "innate" });

        const modifiers = new Modifiers(one, other);

        expect(modifiers[0]).to.equal(one);
        expect(modifiers[1]).to.equal(other);
    });

    it("should calculate the total value correctly", () => {
        const one = new Modifier("path", of(2), { name: "One", type: "innate" });
        const other = new Modifier("path", of(3), { name: "Two", type: "innate" });

        const modifiers = new Modifiers(one, other);

        expect(modifiers.value).to.equal(5);
    });

    it("should calculate the total value correctly", () => {
        const one = new Modifier("path", of(2), { name: "One", type: "innate" });
        const other = new Modifier("path", of(3), { name: "Two", type: "innate" });

        const modifiers = new Modifiers(one, other).filter((mod) => mod.attributes.name === "One");

        expect(modifiers.value).to.equal(2);
    });
    describe("modifier tooltips", () => {
        let sandbox: sinon.SinonSandbox;
        beforeEach(() => {
            sandbox = sinon.createSandbox();
            sandbox.stub(foundryApi, "localize").callsFake((inp) => inp);
        });
        afterEach(() => sandbox.restore());
        it("should add all parts to the tooltip formula", () => {
            const one = new Modifier("path", of(2), { name: "One", type: "innate" });
            const other = new Modifier("path", of(3), { name: "Two", type: "innate" });
            const modifiers = new Modifiers(one, other);
            const formula = new TooltipFormula();

            modifiers.addTooltipFormulaElements(formula);

            expect(formula.getData()[1]).to.deep.equal({
                type: "part",
                classes: "formula-part bonus",
                value: "2",
                description: "One",
            });
            expect(formula.getData()[3]).to.deep.equal({
                type: "part",
                classes: "formula-part bonus",
                value: "3",
                description: "Two",
            });
        });
    });
});
