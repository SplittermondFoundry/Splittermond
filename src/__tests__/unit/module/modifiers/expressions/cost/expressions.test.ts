import {
    asString,
    condense,
    CostExpression,
    evaluate,
    minus,
    of as expr,
    plus,
    ref,
    times,
} from "module/modifiers/expressions/cost";
import { minus as scalarMinus, of as scalarOf } from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import { parseCostString } from "module/util/costs/costParser";
import { Cost, CostModifier } from "module/util/costs/Cost";

function of(cost: string): CostExpression {
    return expr(parseCostString(cost, true).asModifier());
}

function mod(nonConsumed: number, consumed: number, isChanneled: boolean) {
    return new Cost(nonConsumed, consumed, isChanneled, true).asModifier();
}

describe("Expressions", () => {
    (
        [
            [of("3"), mod(3, 0, false), of("3"), "3"],
            [of("-K3"), mod(-3, 0, true), of("-K3"), "-K3"],
            [plus(of("K3"), of("K3")), mod(6, 0, true), of("K6"), "K3 + K3"],
            [minus(of("3V3"), of("3V3")), mod(0, 0, false), of("0"), "3V3 - 3V3"],
            [times(scalarOf(3), of("-2V2")), mod(0, -6, false), of("-6V6"), "3 \u00D7 -2V2"],
        ] as const
    ).forEach(([input, evaluated, condensed, stringRepresentation]) => {
        it(`simple expression ${stringRepresentation} should evaluate to ${evaluated}`, () => {
            expect(evaluate(input)).to.deep.equal(evaluated);
        });

        it(`simple expression ${stringRepresentation} should condense to ${stringRepresentation}`, () => {
            expect(condense(input)).to.deep.equal(condensed);
        });

        it(`simple expression ${stringRepresentation} should be duly represented`, () => {
            expect(asString(input)).to.equal(stringRepresentation);
        });
    });

    (
        [
            [times(scalarOf(1), of("1")), mod(1, 0, false), of("1"), "1"],
            [times(scalarOf(1), minus(of("1"), of("0"))), mod(1, 0, false), of("1"), "1"],
            [times(scalarOf(1), minus(of("0"), of("1"))), mod(-1, 0, false), of("-1"), "-1"],
            [times(scalarOf(3), plus(of("3"), of("3V3"))), mod(9, 9, false), of("18V9"), "3 \u00D7 (3 + 3V3)"],
            [times(scalarOf(3), minus(of("K4"), of("K8V3"))), mod(-3, -9, true), of("-K12V9"), "3 \u00D7 (K4 - K8V3)"],
            [times(scalarOf(2), minus(of("6V3"), of("2"))), mod(2, 6, false), of("8V6"), "2 \u00D7 (6V3 - 2)"],
        ] as const
    ).forEach(([input, evaluated, condensed, stringRepresentation]) => {
        it(`braced expression ${stringRepresentation} should evaluate to ${evaluated}`, () => {
            expect(evaluate(input)).to.deep.equal(evaluated);
        });

        it(`braced expression ${stringRepresentation} should condense to ${asString(condensed)}`, () => {
            expect(condense(input)).to.deep.equal(condensed);
        });

        it(`braced expression ${stringRepresentation} should be duly represented`, () => {
            expect(asString(input)).to.equal(stringRepresentation);
        });
    });

    describe("Reference Expressions", () => {
        it("should evaluate to the value of the property", () => {
            const property = ref("value", { value: "K3V3" }, "value");
            expect(evaluate(property)).to.deep.equal(new Cost(0, 3, true, false).asModifier());
        });

        it("should omit properties of the wrong format when multiplying", () => {
            const property = ref("value", { value: "splittermond" }, "value");
            const expression = times(scalarOf(1), minus(of("4"), property));
            expect(evaluate(expression)).to.deep.equal(mod(4, 0, false));
        });

        it("should omit properties of the wrong format when adding", () => {
            const property = ref("value", { value: "splittermond" }, "value");
            const expression = times(scalarOf(4), property);
            expect(evaluate(expression)).to.deep.equal(CostModifier.zero);
        });

        it("should evaluate nested properties", () => {
            const property = ref("first.second.third", { first: { second: { third: "-3V2" } } }, "first.second.third");
            expect(evaluate(property)).to.deep.equal(new Cost(-1, -2, false).asModifier());
        });

        it("should not condense property ", () => {
            const property = ref("value", { value: "3" }, "value");
            const expression = times(scalarMinus(scalarOf(4), scalarOf(3)), plus(of("3V3"), property));
            expect(condense(expression)).to.deep.equal(times(scalarOf(1), plus(of("3V3"), property)));
        });

        it("should stringify property ", () => {
            const property = ref("value", { value: "K3" }, "value");
            const expression = times(scalarMinus(scalarOf(4), scalarOf(3)), plus(of("3"), property));
            expect(asString(expression)).to.deep.equal("(4 - 3) \u00D7 (3 + ${value})");
        });
    });
});

describe("Smart constructors", () => {
    it("should not multiply if left-hand-side is 0", () => {
        const result = times(scalarOf(0), of("3"));
        expect(result).to.deep.equal(of("0"));
    });

    it("should not multiply if right-hand-side is 0", () => {
        const result = times(scalarOf(3), of("0"));
        expect(result).to.deep.equal(of("0"));
    });

    it("should simplify identity multiplication left-hand-side", () => {
        const result = times(scalarOf(1), of("3"));
        expect(result).to.deep.equal(of("3"));
    });

    it("should simplify identity addition left-hand-side", () => {
        const result = plus(of("0"), of("K3"));
        expect(result).to.deep.equal(of("K3"));
    });

    it("should simplify identity addition right-hand-side", () => {
        const result = plus(of("3V3"), of("0"));
        expect(result).to.deep.equal(of("3V3"));
    });

    it("should simplify identity subtraction", () => {
        const result = plus(of("K3V3"), of("0"));
        expect(result).to.deep.equal(of("K3V3"));
    });
});
