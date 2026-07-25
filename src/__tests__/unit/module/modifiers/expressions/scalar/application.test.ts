import { apply } from "module/modifiers/expressions/scalar/application";
import {
    abs,
    asString,
    dividedBy,
    evaluate,
    max,
    min,
    minus,
    of,
    plus,
    pow,
    ref,
    roll,
    times,
} from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import { createTestRoll, stubRollApi } from "__tests__/unit/RollMock";
import { Die } from "module/api/Roll";

describe("apply", () => {
    describe("AmountExpression", () => {
        it("should scale the amount by the multiplier", () => {
            expect(apply(of(3), 2)).to.deep.equal(of(6));
        });

        it("should produce zero when multiplier is zero", () => {
            expect(apply(of(5), 0)).to.deep.equal(of(0));
        });

        it("should produce one when result is one", () => {
            expect(apply(of(1), 1)).to.deep.equal(of(1));
        });

        it("should handle negative multiplier", () => {
            expect(apply(of(4), -2)).to.deep.equal(of(-8));
        });

        it("should handle negative amount", () => {
            expect(apply(of(-3), 2)).to.deep.equal(of(-6));
        });
    });

    describe("AddExpression", () => {
        it("should distribute over addition", async () => {
            const expression = plus(of(2), of(3));
            const result = apply(expression, 3);
            expect(await evaluate(result)).to.equal(15);
        });

        it("should distribute over nested addition", async () => {
            const expression = plus(plus(of(1), of(2)), of(3));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(12);
        });

        it("should handle negative multiplier on addition", async () => {
            const expression = plus(of(2), of(3));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-5);
        });

        it("should distribute over addition with zero multiplier", async () => {
            const expression = plus(of(2), of(3));
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });
    });

    describe("SubtractExpression", () => {
        it("should distribute over subtraction", async () => {
            const expression = minus(of(10), of(3));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(14);
        });

        it("should distribute over subtraction with negative multiplier", async () => {
            const expression = minus(of(10), of(3));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-7);
        });

        it("should handle nested subtraction", async () => {
            const expression = minus(minus(of(10), of(2)), of(3));
            const result = apply(expression, 3);
            expect(await evaluate(result)).to.equal(15);
        });
    });

    describe("MultiplyExpression", () => {
        it("should scale the right operand when it is an AmountExpression", async () => {
            const expression = times(
                ref("a", () => ({ a: 4 }) as any, "a"),
                of(3)
            );
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(24);
        });

        it("should scale the left operand when right is not an AmountExpression", async () => {
            const expression = times(
                of(2),
                ref("a", () => ({ a: 3 }) as any, "a")
            );
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(12);
        });

        it("should produce zero when multiplier is zero and right is AmountExpression", async () => {
            const expression = times(
                ref("a", () => ({ a: 4 }) as any, "a"),
                of(3)
            );
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });

        it("should keep multiplication correct when multiplier is one", async () => {
            const expression = times(
                of(2),
                ref("a", () => ({ a: 3 }) as any, "a")
            );
            const result = apply(expression, 1);
            expect(await evaluate(result)).to.equal(6);
        });
    });

    describe("DivideExpression", () => {
        it("should scale the numerator", async () => {
            const expression = dividedBy(of(6), of(3));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(4);
        });

        it("should handle negative multiplier on division", async () => {
            const expression = dividedBy(of(6), of(3));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-2);
        });

        it("should produce zero when multiplier is zero", async () => {
            const expression = dividedBy(of(6), of(3));
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });

        it("should keep the divisor unchanged", async () => {
            const expression = dividedBy(
                of(10),
                ref("a", () => ({ a: 5 }) as any, "a")
            );
            const result = apply(expression, 3);
            expect(await evaluate(result)).to.equal(6);
        });
    });

    describe("PowerExpression", () => {
        it("should wrap in multiplication by the multiplier", async () => {
            const expression = pow(of(2), of(3));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(16);
        });

        it("should produce zero when multiplier is zero", async () => {
            const expression = pow(of(2), of(3));
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });

        it("should handle negative multiplier", async () => {
            const expression = pow(of(2), of(3));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-8);
        });
    });

    describe("AbsExpression", () => {
        it("should scale inside the absolute value for positive multiplier", async () => {
            const expression = abs(of(3));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(6);
        });

        it("should scale inside the absolute value for positive multiplier with negative arg", async () => {
            const expression = abs(of(-3));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(6);
        });

        it("should negate the absolute value for negative multiplier", async () => {
            const expression = abs(of(3));
            const result = apply(expression, -2);
            expect(await evaluate(result)).to.equal(-6);
        });

        it("should negate the absolute value for negative multiplier with negative arg", async () => {
            const expression = abs(of(-3));
            const result = apply(expression, -2);
            expect(await evaluate(result)).to.equal(-6);
        });

        it("should produce zero when multiplier is zero", async () => {
            const expression = abs(of(-3));
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });

        it("should handle nested abs with addition", async () => {
            const expression = abs(minus(of(2), of(5)));
            const result = apply(expression, 3);
            expect(await evaluate(result)).to.equal(9);
        });
    });

    describe("MinExpression", () => {
        it("should scale all arguments for positive multiplier", async () => {
            const expression = min(of(3), of(4), of(5));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(6);
        });

        it("should swap to max for negative multiplier", async () => {
            const expression = min(of(3), of(4), of(5));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-3);
        });

        it("should produce zero when multiplier is zero", async () => {
            const expression = min(of(3), of(4));
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });

        it("should handle negative arguments with positive multiplier", async () => {
            const expression = min(of(-3), of(4));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(-6);
        });

        it("should handle negative arguments with negative multiplier", async () => {
            const expression = min(of(-3), of(4));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(3);
        });
    });

    describe("MaxExpression", () => {
        it("should scale all arguments for positive multiplier", async () => {
            const expression = max(of(3), of(4), of(5));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(10);
        });

        it("should swap to min for negative multiplier", async () => {
            const expression = max(of(3), of(4), of(5));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-5);
        });

        it("should produce zero when multiplier is zero", async () => {
            const expression = max(of(3), of(4));
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });

        it("should handle negative arguments with positive multiplier", async () => {
            const expression = max(of(-3), of(4));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(8);
        });

        it("should handle negative arguments with negative multiplier", async () => {
            const expression = max(of(-3), of(4));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-4);
        });
    });

    describe("ReferenceExpression", () => {
        it("should wrap the reference in multiplication by the multiplier", async () => {
            const expression = ref("value", () => ({ value: 4 }) as any, "value");
            const result = apply(expression, 3);
            expect(await evaluate(result)).to.equal(12);
        });

        it("should produce zero when multiplier is zero", async () => {
            const expression = ref("value", () => ({ value: 4 }) as any, "value");
            const result = apply(expression, 0);
            expect(await evaluate(result)).to.equal(0);
        });

        it("should handle negative multiplier", async () => {
            const expression = ref("value", () => ({ value: 4 }) as any, "value");
            const result = apply(expression, -2);
            expect(await evaluate(result)).to.equal(-8);
        });
    });

    describe("RollExpression", () => {
        let sandbox: SinonSandbox;
        beforeEach(() => {
            sandbox = sinon.createSandbox();
            stubRollApi(sandbox);
        });
        afterEach(() => sandbox.restore());

        it("should multiply the dice count for a single die term", async () => {
            const expression = roll(createTestRoll("1d6", [3]));
            const result = apply(expression, 2);
            const resultRoll = (result as any).value;
            const dieTerm = resultRoll.terms[0] as Die;
            expect(dieTerm.number).to.equal(2);
            expect(dieTerm.faces).to.equal(6);
        });

        it("should not mutate the original roll", () => {
            const originalRoll = createTestRoll("1d6", [3]);
            const originalDieNumber = (originalRoll.terms[0] as Die).number;
            const expression = roll(originalRoll);
            apply(expression, 3);
            expect((originalRoll.terms[0] as Die).number).to.equal(originalDieNumber);
        });

        it("should multiply dice count by one leaves the dice unchanged", async () => {
            const expression = roll(createTestRoll("2d6", [3, 4]));
            const result = apply(expression, 1);
            const resultRoll = (result as any).value;
            const dieTerm = resultRoll.terms[0] as Die;
            expect(dieTerm.number).to.equal(2);
        });

        it("should shortcut to zero when multiplier is zero", () => {
            const expression = roll(createTestRoll("1d6", [3]));
            const result = apply(expression, 0);
            expect(result).to.deep.equal(of(0));
        });

        it("should fall back to mapRoll for multi-term rolls", async () => {
            const testRoll = createTestRoll("1d6", [3], 2);
            const expression = roll(testRoll);
            const result = apply(expression, 2);
            const dieTerm = (((result as any).left as any).value.terms[0] as Die) ?? undefined;
            expect(dieTerm?.number).to.equal(2);
        });
    });

    describe("nested expressions", () => {
        it("should distribute over a complex expression tree", async () => {
            const expression = plus(minus(of(4), of(1)), times(of(2), of(3)));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(18);
        });

        it("should handle abs nested in addition", async () => {
            const expression = plus(abs(of(-3)), of(2));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(10);
        });

        it("should handle min nested in addition", async () => {
            const expression = plus(min(of(3), of(5)), of(1));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(8);
        });

        it("should handle max nested in subtraction", async () => {
            const expression = minus(max(of(3), of(5)), of(1));
            const result = apply(expression, -1);
            expect(await evaluate(result)).to.equal(-4);
        });

        it("should handle division nested in addition", async () => {
            const expression = plus(dividedBy(of(6), of(3)), of(1));
            const result = apply(expression, 2);
            expect(await evaluate(result)).to.equal(6);
        });
    });

    describe("multiplier of one", () => {
        it("should keep an AmountExpression unchanged when multiplier is one", () => {
            expect(apply(of(5), 1)).to.deep.equal(of(5));
        });

        it("should keep addition semantically unchanged when multiplier is one", async () => {
            const expression = plus(of(2), of(3));
            const result = apply(expression, 1);
            expect(await evaluate(result)).to.equal(5);
        });
    });

    describe("zero multiplier shortcut", () => {
        it("should return of(0) for an AmountExpression", () => {
            expect(apply(of(5), 0)).to.deep.equal(of(0));
        });

        it("should return of(0) for an AddExpression", () => {
            expect(apply(plus(of(2), of(3)), 0)).to.deep.equal(of(0));
        });

        it("should return of(0) for a RollExpression", () => {
            expect(apply(roll(createTestRoll("1d6", [3])), 0)).to.deep.equal(of(0));
        });

        it("should return of(0) for a ReferenceExpression", () => {
            const expression = ref("value", () => ({ value: 4 }) as any, "value");
            expect(apply(expression, 0)).to.deep.equal(of(0));
        });

        it("should return of(0) for a complex expression tree", () => {
            const expression = plus(minus(of(4), of(1)), times(of(2), of(3)));
            expect(apply(expression, 0)).to.deep.equal(of(0));
        });
    });

    describe("display", () => {
        let sandbox: SinonSandbox;
        beforeEach(() => {
            sandbox = sinon.createSandbox();
            stubRollApi(sandbox);
        });
        afterEach(() => sandbox.restore());

        it("should display a scaled AmountExpression", () => {
            expect(asString(apply(of(3), 2))).to.equal("6");
        });

        it("should display a distributed addition", () => {
            expect(asString(apply(plus(of(2), of(3)), 2))).to.equal("4 + 6");
        });

        it("should display a distributed subtraction", () => {
            expect(asString(apply(minus(of(5), of(2)), 3))).to.equal("15 - 6");
        });

        it("should display a scaled multiplication", () => {
            expect(asString(apply(times(of(2), of(3)), 2))).to.equal("2 \u00D7 6");
        });

        it("should display a scaled division", () => {
            expect(asString(apply(dividedBy(of(6), of(3)), 2))).to.equal("12 / 3");
        });

        it("should display a wrapped power", () => {
            expect(asString(apply(pow(of(2), of(3)), 2))).to.equal("2 \u00D7 (2 ^ 3)");
        });

        it("should display a scaled abs", () => {
            expect(asString(apply(abs(of(-3)), 2))).to.equal("6");
        });

        it("should display a negated abs for negative multiplier", () => {
            expect(asString(apply(abs(of(3)), -2))).to.equal("-6");
        });

        it("should display a scaled min", () => {
            expect(asString(apply(min(of(3), of(5)), 2))).to.equal("min(6, 10)");
        });

        it("should display a scaled max", () => {
            expect(asString(apply(max(of(3), of(5)), 2))).to.equal("max(6, 10)");
        });

        it("should display a single die roll scaled by two", () => {
            const expression = roll(createTestRoll("1d6", [3]));
            expect(asString(apply(expression, 2))).to.equal("2d6");
        });

        it("should display a single die roll scaled by three", () => {
            const expression = roll(createTestRoll("1d6", [3]));
            expect(asString(apply(expression, 3))).to.equal("3d6");
        });

        it("should display a roll expression of 1d6 + 3 scaled by two", () => {
            const expression = roll(createTestRoll("1d6", [3], 3));
            expect(asString(apply(expression, 2))).to.equal("2d6 + 6");
        });

        it("should display a roll expression of 1d6 + 3 scaled by three", () => {
            const expression = roll(createTestRoll("1d6", [3], 3));
            expect(asString(apply(expression, 3))).to.equal("3d6 + 9");
        });

        it("should display a roll expression of 1d6 + 3 scaled by one unchanged", () => {
            const expression = roll(createTestRoll("1d6", [3], 3));
            expect(asString(apply(expression, 1))).to.equal("1d6 + 3");
        });

        it("should display a roll expression of 1d6 + 3 scaled by zero as zero", () => {
            const expression = roll(createTestRoll("1d6", [3], 3));
            expect(asString(apply(expression, 0))).to.equal("0");
        });

        it("should display a roll expression of 1d6 + 3 scaled by negative one", () => {
            const expression = roll(createTestRoll("1d6", [3], 3));
            expect(asString(apply(expression, -1))).to.equal("-1d6 - 3");
        });

        it("should display a roll expression of 1d6 - 3 scaled by two", () => {
            const expression = roll(createTestRoll("1d6", [3], -3));
            expect(asString(apply(expression, 2))).to.equal("2d6 - 6");
        });
    });
});
