import "../../foundryMocks.js";
import { describe, it } from "mocha";
import { expect } from "chai";
import { TooltipFormula } from "module/util/tooltip.js";
import { identity } from "../../foundryMocks.js";

describe("tooltip formatter", () => {
    // @ts-expect-error Game is not defined for typescript.
    global.game.i18n = { localize: identity };
    it("should convert all part input to string", () => {
        const underTest = new TooltipFormula();

        underTest.addPart(1, ["description"]);

        underTest.getData().forEach((part) => {
            expect(part.value).to.be.a("string");
            expect(part.description).to.be.a("string");
        });
    });

    it("should handle undefined input", () => {
        const underTest = new TooltipFormula();

        underTest.addPart();

        underTest.getData().forEach((part) => {
            expect(part.value).to.equal("");
            expect(part.description).to.equal("");
        });
    });

    it("should not generate an operator for a one element multi-part input", () => {
        const underTest = new TooltipFormula();

        underTest.addParts([{ value: "1", description: "description" }], "+");

        expect(underTest.getData().length).to.equal(1);
    });

    it("should generate an operator in between elements of a multipart input", () => {
        const underTest = new TooltipFormula();

        underTest.addParts(
            [
                { value: "1", description: "description" },
                { value: "2", description: "description" },
            ],
            "+"
        );

        expect(underTest.getData().length).to.equal(3);
        expect(underTest.getData()[1].classes).to.equal("operator");
    });

    it("should render classes as a space separated list of strings", () => {
        const underTest = new TooltipFormula();

        underTest.addPart(1, "", "class1 class2");

        expect(underTest.getData()[0].classes).to.equal("formula-part class1 class2");
    });

    it("should handle undefined class input", () => {
        const underTest = new TooltipFormula();

        underTest.addPart(1, "");

        expect(underTest.getData()[0].classes).to.equal("formula-part");
    });

    it("should add operators correctly", () => {
        const underTest = new TooltipFormula();

        underTest.addOperator("+");

        expect(underTest.getData()[0].classes).to.equal("operator");
        expect(underTest.getData()[0].value).to.equal("+");
        expect(underTest.getData()[0].type).to.equal("operator");
    });

    it("should add bonus correctly", () => {
        const underTest = new TooltipFormula();

        underTest.addBonus("1", "bonus");

        expect(underTest.getData().length).to.equal(2);
        expect(underTest.getData()[0]).to.deep.contain({ type: "operator", value: "+" });
        expect(underTest.getData()[1]).to.deep.contain({
            type: "part",
            value: "1",
            description: "bonus",
            classes: "formula-part bonus",
        });
    });

    it("should add malus correctly", () => {
        const underTest = new TooltipFormula();

        underTest.addMalus("1", "malus");

        expect(underTest.getData().length).to.equal(2);
        expect(underTest.getData()[0]).to.deep.contain({ type: "operator", value: "-" });
        expect(underTest.getData()[1]).to.deep.contain({
            type: "part",
            value: "1",
            description: "malus",
            classes: "formula-part malus",
        });
    });

    it("should render html", () => {
        const underTest = new TooltipFormula();

        underTest.addPart(1, "description");
        underTest.addOperator("+");
        underTest.addPart(2, "description2");

        const actual = underTest.render();

        const formatted = actual.split("\n").map((i) => i.trim());
        expect(formatted).to.deep.equal([
            '<span class="formula"><span class="formula-part"><span class="value">1</span>',
            '<span class="description">description</span></span><span class="operator">+</span>' +
                '<span class="formula-part"><span class="value">2</span>',
            '<span class="description">description2</span></span></span>',
        ]);
    });
});
