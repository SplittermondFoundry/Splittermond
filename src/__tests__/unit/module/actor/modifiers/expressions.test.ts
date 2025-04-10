import {
    abs,
    AddExpression,
    dividedBy,
    minus,
    of,
    plus,
    ref,
    roll,
    times
} from "../../../../../module/actor/modifiers/expressions/definitions";
import {expect} from "chai";
import {evaluate} from "../../../../../module/actor/modifiers/expressions/evaluation";
import {condense} from "../../../../../module/actor/modifiers/expressions/condenser";
import {asString} from "../../../../../module/actor/modifiers/expressions/Stringifier";
import {createTestRoll, MockRoll} from "../../../RollMock";
import {isGreaterZero, isLessThanZero} from "../../../../../module/actor/modifiers/expressions/Comparator";
import sinon from "sinon";
import {foundryApi} from "../../../../../module/api/foundryApi";
import {NumericTerm, OperatorTerm} from "module/api/Roll";


describe("Expressions", () => {
    ([
        [abs(of(-3)), 3, of(3), "3"],
        [of(3), 3, of(3), "3"],
        [of(-3), -3, of(-3), "-3"],
        [plus(of(3), of(3)), 6, of(6), "3 + 3"],
        [minus(of(3), of(3)), 0, of(0), "3 - 3"],
        [times(of(3), of(3)), 9, of(9), "3 \u00D7 3"],
        [dividedBy(of(3), of(3)), 1, of(1), "3 / 3"],
    ] as const).forEach(([input, evaluated, condensed, stringRepresentation]) => {

        it(`simple expression ${stringRepresentation} should evaluate to ${evaluated}`, () => {
            expect(evaluate(input)).to.equal(evaluated);
        });

        it(`simple expression ${stringRepresentation} should condense to ${stringRepresentation}`, () => {
            expect(condense(input)).to.deep.equal(condensed);
        });

        it(`simple expression ${stringRepresentation} should be duly represented`, () => {
            expect(asString(input)).to.equal(stringRepresentation);
        });

        it(`should correctly estimate ${stringRepresentation} greater than zero`, () => {
            expect(isGreaterZero(input)).to.equal(evaluated > 0);
        });

        it(`should correctly estimate ${stringRepresentation} less than zero`, () => {
            expect(isLessThanZero(input)).to.equal(evaluated < 0);
        });
    });

    ([
        [times(plus(of(1), of(0)), of(1)), 1, of(1), "1"],
        [times(minus(of(1), of(0)), of(1)), 1, of(1), "1"],
        [times(minus(of(0), of(1)), of(1)), -1, of(-1), "-1"],
        [times(plus(of(3), of(3)), of(3)), 18, of(18), "(3 + 3) \u00D7 3"],
        [times(minus(of(4), of(3)), of(3)), 3, of(3), "(4 - 3) \u00D7 3"],
        [times(minus(of(3), of(4)), of(3)), -3, of(-3), "(3 - 4) \u00D7 3"],
        [times(abs(minus(of(3), of(4))), of(3)), 3, of(3), "|(3 - 4)| \u00D7 3"],
        [dividedBy(
            times(
                of(2),
                plus(of(1), of(2))
            ),
            times(
                of(3),
                minus(of(4), of(3))
            )
        ), 2, of(2), "(2 \u00D7 (1 + 2)) / (3 \u00D7 (4 - 3))"],

    ] as const).forEach(([input, evaluated, condensed, stringRepresentation]) => {

        it(`braced expression ${stringRepresentation} should evaluate to ${evaluated}`, () => {
            expect(evaluate(input)).to.equal(evaluated);
        });

        it(`braced expression ${stringRepresentation} should condense to ${stringRepresentation}`, () => {
            expect(condense(input)).to.deep.equal(condensed);
        });

        it(`braced expression ${stringRepresentation} should be duly represented`, () => {
            expect(asString(input)).to.equal(stringRepresentation);
        });
    });

    describe("Roll Expressions", () => {
        let sandbox: sinon.SinonSandbox;
        beforeEach(() => {
            sandbox = sinon.createSandbox();
            sandbox.stub(foundryApi, "rollInfra").get(() => {
                return {
                    numericTerm(value: number) {
                        return {
                            number: value,
                            _evaluated: false,
                            total: value,
                        }
                    },
                    rollFromTerms(terms: (OperatorTerm|NumericTerm)[]) {
                        return MockRoll.fromTerms(terms);
                    }

                }
            });

        });
        afterEach(() => sandbox.restore());

        it("should evaluate to the value of the property", () => {
            const property = roll(createTestRoll("1d6", [3]));
            expect(evaluate(property)).to.equal(3);
        });

        it("should not condense property ", () => {
            const property = plus(of(3), roll(createTestRoll("1d6", [3])));

            const result = condense(property);

            expect(result).to.be.instanceOf(AddExpression);
        });

        it("should stringify property to formula", () => {
            const property = roll(createTestRoll("1d6", [3]));
            expect(asString(property)).to.equal("1d6");
        });

        it("should expect a simple roll to be positive", () => {
            const property = roll(createTestRoll("1d6", [3]));
            expect(isGreaterZero(property)).to.be.true;
            expect(isLessThanZero(property)).to.be.false;
        });

        it("should expect a large negative modifier to be negative", () => {
            const property = roll(new MockRoll("1d6 - 10"));
            expect(isGreaterZero(property)).to.be.false;
            expect(isLessThanZero(property)).to.be.true;
        });

        it("return null if it cannot safely predict value", () => {
            const property = roll(new MockRoll("2d6 - 10"));
            expect(isGreaterZero(property)).to.be.null;
            expect(isLessThanZero(property)).to.be.null;
        });
    });

    describe("Reference Expressions", () => {
        it("should evaluate to the value of the property", () => {
            const property = ref("value", {value: 3}, "value");
            expect(evaluate(property)).to.equal(3);
        });

        it("should omit properties of the wrong format when multiplying", () => {
            const property = ref("value", {value: "splittermond"}, "value");
            const expression = times(plus(of(3), property), minus(of(4), of(3)));
            expect(evaluate(expression)).to.deep.equal(3);
        });

        it("should omit properties of the wrong format when adding", () => {
            const property = ref("value", {value: "splittermond"}, "value");
            const expression = times(property, minus(of(4), of(3)));
            expect(evaluate(expression)).to.deep.equal(1);
        });

        it("should evaluate nested properties", () => {
            const property = ref("first.second.third", {first: {second: {third: 3}}}, "first.second.third");
            expect(evaluate(property)).to.equal(3);
        });

        it("should not condense property ", () => {
            const property = ref("value", {value: 3}, "value");
            const expression = times(plus(of(3), property), minus(of(4), of(3)));
            expect(condense(expression)).to.deep.equal(times(plus(of(3), property), of(1)));
        });

        it("should stringify property ", () => {
            const property = ref("value", {value: 3}, "value");
            const expression = times(plus(of(3), property), minus(of(4), of(3)));
            expect(asString(expression)).to.equal("(3 + ${value}) \u00D7 (4 - 3)");
        });
    });
});

describe("Smart constructors", () => {
    it("should not multiply if left-hand-side is 0", () => {
        const result = times(of(0), of(3));
        expect(result).to.deep.equal(of(0));
    });

    it("should not multiply if right-hand-side is 0", () => {
        const result = times(of(3), of(0));
        expect(result).to.deep.equal(of(0));
    });

    it("should simplify identity multiplication left-hand-side", () => {
        const result = times(of(1), of(3));
        expect(result).to.deep.equal(of(3));
    });

    it("should simplify identity multiplication right -hand-side", () => {
        const result = times(of(3), of(1));
        expect(result).to.deep.equal(of(3));
    });

    it("should simplify identity addition left-hand-side", () => {
        const result = plus(of(0), of(3));
        expect(result).to.deep.equal(of(3));
    });

    it("should simplify identity addition right-hand-side", () => {
        const result = plus(of(3), of(0));
        expect(result).to.deep.equal(of(3));
    });

    it("should simplify identity subtraction", () => {
        const result = plus(of(3), of(0));
        expect(result).to.deep.equal(of(3));
    });

    it("should simplify division by one", () => {
        const result = dividedBy(of(3), of(1));
        expect(result).to.deep.equal(of(3));
    });

    it("should throw for division by zero", () => {
        expect(() => dividedBy(of(3), of(0))).to.throw();
    })
});

