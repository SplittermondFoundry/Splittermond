import {
    abs,
    asString,
    condense,
    condenseCombineDamageWithModifiers,
    dividedBy,
    evaluate,
    isGreaterThan,
    isGreaterZero,
    isLessThan,
    isLessThanZero,
    mapRoll,
    minus,
    of,
    plus,
    pow,
    ref,
    roll,
    times,
    toRollFormula,
} from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import { createTestRoll, MockRoll, stubRollApi } from "__tests__/unit/RollMock";
import sinon, { SinonSandbox } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { NumericTerm, OperatorTerm } from "module/api/Roll";
import { AddExpression, PowerExpression } from "module/modifiers/expressions/scalar/definitions";

describe("Expressions", () => {
    (
        [
            [abs(of(-3)), 3, of(3), "3", "abs(-3)"],
            [of(3), 3, of(3), "3", "3"],
            [of(-3), -3, of(-3), "-3", "-3"],
            [plus(of(3), of(3)), 6, of(6), "3 + 3", "3 + 3"],
            [minus(of(3), of(3)), 0, of(0), "3 - 3", "3 - 3"],
            [times(of(3), of(3)), 9, of(9), "3 \u00D7 3", "3 * 3"],
            [dividedBy(of(3), of(3)), 1, of(1), "3 / 3", "3 / 3"],
            [pow(of(3), of(2)), 9, of(9), "3 ^ 2", "pow(3,2)"],
        ] as const
    ).forEach(([input, evaluated, condensed, stringRepresentation, rollRepresentation]) => {
        it(`simple expression ${stringRepresentation} should evaluate to ${evaluated}`, () => {
            expect(evaluate(input)).to.equal(evaluated);
        });

        it(`simple expression ${stringRepresentation} should condense to ${stringRepresentation}`, () => {
            expect(condense(input)).to.deep.equal(condensed);
        });

        it(`simple expression ${stringRepresentation} should be duly represented`, () => {
            expect(asString(input)).to.equal(stringRepresentation);
        });

        it(`should convert simple expression ${stringRepresentation} to roll representation`, () => {
            expect(toRollFormula(input)).to.deep.equal([rollRepresentation, {}]);
        });

        it(`should correctly estimate ${stringRepresentation} greater than zero`, () => {
            expect(isGreaterZero(input)).to.equal(evaluated > 0);
        });

        it(`should correctly estimate ${stringRepresentation} less than zero`, () => {
            expect(isLessThanZero(input)).to.equal(evaluated < 0);
        });
    });

    (
        [
            [times(plus(of(1), of(0)), of(1)), 1, of(1), "1", "1"],
            [times(minus(of(1), of(0)), of(1)), 1, of(1), "1", "1"],
            [times(minus(of(0), of(1)), of(1)), -1, of(-1), "-1", "-1"],
            [times(plus(of(3), of(3)), of(3)), 18, of(18), "(3 + 3) \u00D7 3", "(3 + 3) * 3"],
            [times(minus(of(4), of(3)), of(3)), 3, of(3), "(4 - 3) \u00D7 3", "(4 - 3) * 3"],
            [times(minus(of(3), of(4)), of(3)), -3, of(-3), "(3 - 4) \u00D7 3", "(3 - 4) * 3"],
            [times(abs(minus(of(3), of(4))), of(3)), 3, of(3), "|3 - 4| \u00D7 3", "abs(3 - 4) * 3"],
            [minus(of(3), pow(of(4), of(3))), -61, of(-61), "3 - (4 ^ 3)", "3 - pow(4,3)"],
            [
                dividedBy(times(of(2), plus(of(1), of(2))), times(of(3), minus(of(4), of(3)))),
                2,
                of(2),
                "(2 \u00D7 (1 + 2)) / (3 \u00D7 (4 - 3))",
                "(2 * (1 + 2)) / (3 * (4 - 3))",
            ],
        ] as const
    ).forEach(([input, evaluated, condensed, stringRepresentation, rollRepresentation]) => {
        it(`braced expression ${stringRepresentation} should evaluate to ${evaluated}`, () => {
            expect(evaluate(input)).to.equal(evaluated);
        });

        it(`braced expression ${stringRepresentation} should convert to roll representation`, () => {
            expect(toRollFormula(input)).to.deep.equal([rollRepresentation, {}]);
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
                        };
                    },
                    rollFromTerms(terms: (OperatorTerm | NumericTerm)[]) {
                        return MockRoll.fromTerms(terms);
                    },
                };
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

        it("should be able to compare two distinct rolls", () => {
            const one = roll(new MockRoll("1d6"));
            const other = roll(new MockRoll("1d6-10"));

            expect(isGreaterThan(one, other)).to.be.true;
            expect(isLessThan(one, other)).to.be.false;
        });

        it("should not evaluate overlapping rolls as being greater", () => {
            const one = roll(new MockRoll("1d6+2"));
            const other = roll(new MockRoll("1d6-2"));

            expect(isGreaterThan(one, other)).to.be.null;
            expect(isLessThan(one, other)).to.be.null;
        });
    });

    describe("Reference Expressions", () => {
        it("should evaluate to the value of the property", () => {
            const property = ref("value", { value: 3 }, "value");
            expect(evaluate(property)).to.equal(3);
        });

        it("should omit properties of the wrong format when multiplying", () => {
            const property = ref("value", { value: "splittermond" }, "value");
            const expression = times(plus(of(3), property), minus(of(4), of(3)));
            expect(evaluate(expression)).to.deep.equal(3);
        });

        it("should omit properties of the wrong format when adding", () => {
            const property = ref("value", { value: "splittermond" }, "value");
            const expression = times(property, minus(of(4), of(3)));
            expect(evaluate(expression)).to.deep.equal(1);
        });

        it("should evaluate nested properties", () => {
            const property = ref("first.second.third", { first: { second: { third: 3 } } }, "first.second.third");
            expect(evaluate(property)).to.equal(3);
        });

        it("should not condense property ", () => {
            const property = ref("value", { value: 3 }, "value");
            const expression = times(plus(of(3), property), minus(of(4), of(3)));
            expect(condense(expression)).to.deep.equal(times(plus(of(3), property), of(1)));
        });

        it("should stringify property ", () => {
            const property = ref("value", { value: 3 }, "value");
            const expression = times(plus(of(3), property), minus(of(4), of(3)));
            expect(asString(expression)).to.equal("(3 + ${value}) \u00D7 (4 - 3)");
        });

        it("should produce a unique identifier for each reference", () => {
            const property1 = ref("value", { value: 3 }, "value");
            const property2 = ref("value", { value: 4 }, "value");
            const expression = plus(property1, property2);
            expect(toRollFormula(expression)).to.deep.equal(["@value0 + @value1", { value0: "3", value1: "4" }]);
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
    });

    it("should simplify power when base is one", () => {
        const result = pow(of(1), of(5));
        expect(result).to.deep.equal(of(1));
    });

    it("should simplify power when exponent is one", () => {
        const result = pow(of(7), of(1));
        expect(result).to.deep.equal(of(7));
    });

    it("should simplify power when exponent is zero and base is not zero", () => {
        const result = pow(of(5), of(0));
        expect(result).to.deep.equal(of(1));
    });

    it("should handle zero to the power of zero case", () => {
        const result = pow(of(0), of(0));
        expect(result).to.deep.equal(of(1));
    });

    it("should simplify power when base is zero and exponent is not zero", () => {
        const result = pow(of(0), of(3));
        expect(result).to.deep.equal(of(0));
    });

    it("should create PowerExpression for non-trivial cases", () => {
        const result = pow(of(2), of(3));
        expect(result).to.be.instanceOf(PowerExpression);
        expect((result as PowerExpression).base).to.deep.equal(of(2));
        expect((result as PowerExpression).exponent).to.deep.equal(of(3));
    });
});

describe("Roll condensation", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
    });
    afterEach(() => sandbox.restore());

    it("should condense a roll with a single numeric term", () => {
        const rollTerm = mapRoll(createTestRoll("1d6", [6], 3));
        const modifiers = of(0);
        const result = condenseCombineDamageWithModifiers(rollTerm, modifiers);

        expect(asString(result)).to.equal("1d6 + 3");
    });

    it("should condense a roll with a single numeric term and a modifier", () => {
        const rollTerm = mapRoll(createTestRoll("1d6", [6], 3));
        const modifiers = plus(of(3), of(-2));
        const result = condenseCombineDamageWithModifiers(rollTerm, modifiers);

        expect(asString(result)).to.equal("1d6 + 4");
    });

    it("should condense a roll with a single negative numeric term ", () => {
        const rollTerm = mapRoll(createTestRoll("1d6", [6], -3));
        const modifiers = of(0);
        const result = condenseCombineDamageWithModifiers(rollTerm, modifiers);

        expect(asString(result)).to.equal("1d6 - 3");
    });

    (
        [
            [3, of(-3), ""],
            [-3, of(3), ""],
            [-3, of(4), "+ 1"],
            [6, of(-8), "- 2"],
            [2, plus(minus(of(3), of(8)), of(2)), "- 1"],
        ] as const
    ).forEach(([principalModifier, modifiers, expected]) => {
        it(`should condense a roll with inputs ${principalModifier}, ${asString(modifiers)}`, () => {
            const rollTerm = mapRoll(createTestRoll("1d6", [6], principalModifier));
            const result = condenseCombineDamageWithModifiers(rollTerm, modifiers);

            expect(asString(result)).to.equal(`1d6 ${expected}`.trim());
        });
    });

    it(`should pass through a roll with two roll terms`, () => {
        const firstRoll = mapRoll(createTestRoll("1d6", [6]));
        const secondRoll = mapRoll(createTestRoll("1d10", [10]));
        const roll = plus(firstRoll, secondRoll);

        expect(asString(condenseCombineDamageWithModifiers(roll, of(0)))).to.equal(asString(roll));
    });

    it(`should pass through a roll in the modifier term`, () => {
        const firstRoll = mapRoll(createTestRoll("1d6", [6], 3));
        const secondRoll = mapRoll(createTestRoll("1d9", [9]));

        expect(asString(condenseCombineDamageWithModifiers(firstRoll, secondRoll))).to.equal(
            asString(plus(firstRoll, secondRoll))
        );
    });
});

describe("String beautification", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => stubRollApi(sandbox));
    afterEach(() => sandbox.restore());

    describe("Plus-Minus replacement", () => {
        it("should replace + - with -", () => {
            const expression = plus(of(3), of(-2));
            expect(asString(expression)).to.equal("3 - 2");
        });

        it("should handle multiple negative additions", () => {
            const expression = plus(plus(of(3), of(-2)), of(-4));
            expect(asString(expression)).to.equal("3 - 2 - 4");
        });

        it("should handle negative in middle of expression", () => {
            const expression = plus(plus(of(5), of(-1)), of(2));
            expect(asString(expression)).to.equal("5 - 1 + 2");
        });

        it("should not affect standalone negative numbers", () => {
            const expression = of(-5);
            expect(asString(expression)).to.equal("-5");
        });

        it("should handle negative in multiplication", () => {
            const expression = times(of(3), of(-2));
            expect(asString(expression)).to.equal("3 \u00D7 -2");
        });
    });

    describe("Unbrace top level", () => {
        it("should remove outer braces from addition", () => {
            const expression = plus(of(1), of(2));
            expect(asString(expression)).to.equal("1 + 2");
        });

        it("should remove outer braces from subtraction", () => {
            const expression = minus(of(5), of(3));
            expect(asString(expression)).to.equal("5 - 3");
        });

        it("should remove outer braces from multiplication", () => {
            const expression = times(of(2), of(3));
            expect(asString(expression)).to.equal("2 \u00D7 3");
        });

        it("should remove outer braces from division", () => {
            const expression = dividedBy(of(6), of(2));
            expect(asString(expression)).to.equal("6 / 2");
        });

        it("should remove outer braces from power", () => {
            const expression = pow(of(2), of(3));
            expect(asString(expression)).to.equal("2 ^ 3");
        });
    });

    describe("Unbrace in additions", () => {
        it("should unbrace both operands in addition", () => {
            const left = plus(of(1), of(2));
            const right = plus(of(3), of(4));
            const expression = plus(left, right);
            expect(asString(expression)).to.equal("1 + 2 + 3 + 4");
        });

        it("should unbrace left operand only", () => {
            const left = plus(of(1), of(2));
            const expression = plus(left, of(5));
            expect(asString(expression)).to.equal("1 + 2 + 5");
        });

        it("should unbrace right operand only", () => {
            const right = plus(of(3), of(4));
            const expression = plus(of(1), right);
            expect(asString(expression)).to.equal("1 + 3 + 4");
        });

        it("should unbrace multiplication in addition", () => {
            const expression = plus(times(of(2), of(3)), of(1));
            expect(asString(expression)).to.equal("2 \u00D7 3 + 1");
        });
    });

    describe("Unbrace numbers", () => {
        it("should unbrace single positive numbers in multiplication", () => {
            const expression = times(of(2), of(3));
            expect(asString(expression)).to.equal("2 \u00D7 3");
        });

        it("should not unbrace expressions in multiplication", () => {
            const expression = times(plus(of(1), of(2)), of(3));
            expect(asString(expression)).to.equal("(1 + 2) \u00D7 3");
        });

        it("should unbrace numbers in division", () => {
            const expression = dividedBy(of(6), of(2));
            expect(asString(expression)).to.equal("6 / 2");
        });

        it("should unbrace numbers in power", () => {
            const expression = pow(of(2), of(3));
            expect(asString(expression)).to.equal("2 ^ 3");
        });
    });

    describe("Negative multiplication handling", () => {
        it("should convert -1 * x to -x when -1 is on left", () => {
            const expression = times(of(-1), of(5));
            expect(asString(expression)).to.equal("-5");
        });

        it("should convert x * -1 to -x when -1 is on right", () => {
            const expression = times(of(5), of(-1));
            expect(asString(expression)).to.equal("-5");
        });

        it("should handle -1 * expression", () => {
            const expression = times(of(-1), plus(of(2), of(3)));
            expect(asString(expression)).to.equal("-(2 + 3)");
        });

        it("should not affect other negative multiplications", () => {
            const expression = times(of(-2), of(3));
            expect(asString(expression)).to.equal("-2 \u00D7 3");
        });
    });

    describe("Complex beautification scenarios", () => {
        it("should handle nested additions with negatives", () => {
            const expression = plus(plus(of(10), of(-3)), plus(of(5), of(-2)));
            expect(asString(expression)).to.equal("10 - 3 + 5 - 2");
        });

        it("should preserve necessary braces for precedence", () => {
            const expression = times(plus(of(2), of(3)), minus(of(5), of(1)));
            expect(asString(expression)).to.equal("(2 + 3) \u00D7 (5 - 1)");
        });

        it("should handle absolute value with addition", () => {
            const expression = abs(plus(of(3), of(-2)));
            expect(asString(expression)).to.equal("|3 - 2|");
        });

        it("should handle division with complex expressions", () => {
            const numerator = times(of(2), plus(of(1), of(2)));
            const denominator = times(of(3), minus(of(4), of(3)));
            const expression = dividedBy(numerator, denominator);
            expect(asString(expression)).to.equal("(2 \u00D7 (1 + 2)) / (3 \u00D7 (4 - 3))");
        });

        it("should handle power with subtraction", () => {
            const expression = minus(of(3), pow(of(4), of(3)));
            expect(asString(expression)).to.equal("3 - (4 ^ 3)");
        });

        it("should handle roll expressions with negatives", () => {
            const rollExpr = mapRoll(createTestRoll("1d6", [6], -3));
            const expression = plus(rollExpr, of(2));
            expect(asString(expression)).to.equal("1d6 - 3 + 2");
        });
    });

    describe("Edge cases", () => {
        it("should handle zero in addition", () => {
            const expression = plus(of(0), of(5));
            expect(asString(expression)).to.equal("5");
        });

        it("should handle zero in subtraction", () => {
            const expression = minus(of(5), of(0));
            expect(asString(expression)).to.equal("5");
        });

        it("should handle identity multiplication", () => {
            const expression = times(of(1), of(5));
            expect(asString(expression)).to.equal("5");
        });

        it("should handle double negative", () => {
            const expression = minus(of(3), of(-2));
            expect(asString(expression)).to.equal("3 - -2");
        });

        it("should handle absolute value of negative", () => {
            const expression = abs(of(-5));
            expect(asString(expression)).to.equal("5");
        });

        it("should handle absolute value of expression", () => {
            const expression = abs(minus(of(2), of(5)));
            expect(asString(expression)).to.equal("|2 - 5|");
        });
    });
});

describe("Roll mapping", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => stubRollApi(sandbox));
    afterEach(() => sandbox.restore());

    it("should map a one dice roll", () => {
        const rollTerm = mapRoll(createTestRoll("1d6", [6]));
        expect(asString(rollTerm)).to.equal("1d6");
    });

    it("should keep the order of terms", () => {
        const testRoll = createTestRoll("1d6", [6], 3);
        testRoll.terms.splice(0, 0, makeNumeric(2), makeOperator("+"));
        const rollTerm = mapRoll(testRoll);
        expect(asString(rollTerm)).to.equal("2 + 1d6 + 3");
    });

    describe("Addition Only", () => {
        it("should map a roll with one terms", () => {
            const testRoll = createTestRoll("1d6", [6], 3);
            const rollTerm = mapRoll(testRoll);
            expect(asString(rollTerm)).to.equal("1d6 + 3");
        });
        it("should map a roll with one negative term", () => {
            const testRoll = createTestRoll("1d6", [6], -3);
            testRoll.terms.push(makeOperator("+"), makeNumeric(2));
            const rollTerm = mapRoll(testRoll);
            expect(asString(rollTerm)).to.equal("1d6 - 3 + 2");
        });

        it("should map a roll with several terms", () => {
            const testRoll = createTestRoll("1d6", [6], 3);
            testRoll.terms.push(makeOperator("+"), makeNumeric(2));
            const rollTerm = mapRoll(testRoll);
            expect(asString(rollTerm)).to.equal("1d6 + 3 + 2");
        });

        it("should map a roll with first term negative", () => {
            const testRoll = createTestRoll("1d6", [6], -3);
            testRoll.terms.push(makeOperator("+"), makeNumeric(2));
            const rollTerm = mapRoll(testRoll);
            expect(asString(rollTerm)).to.equal("1d6 - 3 + 2");
        });

        it("should map a roll with second term negative", () => {
            const testRoll = createTestRoll("1d6", [6], 3);
            testRoll.terms.push(makeOperator("-"), makeNumeric(2));
            const rollTerm = mapRoll(testRoll);
            expect(asString(rollTerm)).to.equal("1d6 + 3 - 2");
        });

        it("should map a roll with three terms", () => {
            const testRoll = createTestRoll("1d6", [6], 3);
            testRoll.terms.push(makeOperator("+"), makeNumeric(2));
            testRoll.terms.push(makeOperator("+"), makeNumeric(1));
            const rollTerm = mapRoll(testRoll);
            expect(asString(rollTerm)).to.equal("1d6 + 3 + 2 + 1");
        });

        it("should map a roll with terms, one negative", () => {
            const testRoll = createTestRoll("1d6", [6], 3);
            testRoll.terms.push(makeOperator("-"), makeNumeric(4));
            testRoll.terms.push(makeOperator("+"), makeNumeric(2));
            const rollTerm = mapRoll(testRoll);
            expect(asString(rollTerm)).to.equal("1d6 + 3 - 4 + 2");
        });
    });

    describe("Mulitiplication included", () => {
        it("should map a roll with a final multiplication term", () => {
            const testRoll = createTestRoll("1d6", [6], -3);
            testRoll.terms.push(makeOperator("*"), makeNumeric(2));
            const rollTerm = mapRoll(testRoll);
            expect(evaluate(rollTerm)).to.equal(0);
            expect(asString(rollTerm)).to.equal("1d6 - (3 \u00D7 2)");
        });

        it("should map a roll with a multiplication term", () => {
            const testRoll = createTestRoll("1d6", [6]);
            testRoll.terms.push(makeOperator("*"), makeNumeric(2));
            const rollTerm = mapRoll(testRoll);
            expect(evaluate(rollTerm)).to.equal(12);
            expect(asString(rollTerm)).to.equal("1d6 \u00D7 2");
        });

        it("should map a roll with a leading multiplication term", () => {
            const testRoll = createTestRoll("1d6", [6]);
            testRoll.terms.push(makeOperator("*"), makeNumeric(2));
            testRoll.terms.push(makeOperator("+"), makeNumeric(1));
            const rollTerm = mapRoll(testRoll);
            expect(evaluate(rollTerm)).to.equal(13);
            expect(asString(rollTerm)).to.equal("1d6 \u00D7 2 + 1");
        });
    });

    function makeOperator(term: "+" | "-" | "*" | "/") {
        return {
            operator: term,
            formula: term,
            _evaluated: false,
        };
    }
    function makeNumeric(number: number) {
        return {
            number,
            formula: `${number}`,
            _evaluated: false,
            expression: `${number}`,
            total: number,
        };
    }
});
