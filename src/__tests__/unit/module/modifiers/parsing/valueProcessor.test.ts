import { expect } from "chai";
import { describe, it } from "mocha";
import { ParsedModifier, withErrorLogger } from "module/modifiers/parsing";
import { AmountExpression, MultiplyExpression, ReferenceExpression } from "module/modifiers/expressions/scalar";
import { evaluate, of as ofCost } from "module/modifiers/expressions/cost";
import { foundryApi } from "module/api/foundryApi";
import sinon, { type SinonSandbox } from "sinon";
import { clearMappers } from "module/modifiers/parsing/normalizer";
import { Cost } from "module/util/costs/Cost";
import { type IErrorConsumer } from "module/modifiers/parsing/ParseErrors";

describe("Value Processor", () => {
    const sandbox: SinonSandbox = sinon.createSandbox();
    beforeEach(() => {
        sandbox.stub(foundryApi, "format").callsFake((key) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key) => key);
    });
    afterEach(() => {
        sandbox.restore();
        clearMappers();
    });
    const mockSource = { existing: { path: "value" } };

    it("should handle valid number attributes", () => {
        const modifier: ParsedModifier = {
            path: "test.path",
            attributes: {
                value: 5,
                stringAttr: "static",
            },
        };

        const errors = new MockParseErrors();
        const result = withErrorLogger(errors).processScalarValue(modifier, mockSource);

        expect(errors).to.have.lengthOf(0);
        expect(result!.value).to.be.an.instanceOf(AmountExpression);
        expect(result!.attributes.stringAttr).to.equal("static");
    });

    it("should handle valid reference expressions", () => {
        const modifier: ParsedModifier = {
            path: "test.path",
            attributes: {
                value: {
                    propertyPath: "existing.path",
                    original: "existing.path",
                    sign: 1,
                },
            },
        };

        const errors = new MockParseErrors();
        const result = withErrorLogger(errors).processScalarValue(modifier, mockSource);

        expect(errors).to.have.lengthOf(0);
        const expr = result!.value as ReferenceExpression;
        expect(expr).to.be.an.instanceOf(ReferenceExpression);
        expect(expr).to.deep.equal({
            propertyPath: "existing.path",
            source: mockSource,
            stringRep: "existing.path",
        });
    });

    it("should collect validation errors for invalid references", () => {
        const modifier: ParsedModifier = {
            path: "invalid.path",
            attributes: {
                value: {
                    propertyPath: "non.existing.path",
                    sign: -1,
                    original: "non.existing.path",
                },
            },
        };

        const errors = new MockParseErrors();
        const result = withErrorLogger(errors).processScalarValue(modifier, mockSource);

        expect(errors.length).to.equal(1);
        expect(result).to.be.null;
    });

    it("should maintain attribute structure", () => {
        const complexModifier: ParsedModifier = {
            path: "complex.path",
            attributes: {
                num: 42,
                value: { propertyPath: "existing.path", sign: -1, original: "existing.path" },
                str: "constant",
            },
        };

        const errors = new MockParseErrors();
        const result = withErrorLogger(errors).processScalarValue(complexModifier, mockSource);

        expect(errors).to.have.lengthOf(0);
        expect(result!.value).to.be.instanceOf(MultiplyExpression);
        const attrs = result!.attributes;
        expect(typeof attrs.num).to.equal("number");
        expect(attrs.value).to.be.undefined;
        expect(attrs.str).to.equal("constant");
    });

    it("should count string values as vector expressions", () => {
        const complexModifier: ParsedModifier = {
            path: "focus.reduction skill=path",
            attributes: {
                value: "K7V5",
            },
        };

        const errors = new MockParseErrors();
        const result = withErrorLogger(errors).processCostValue(complexModifier, mockSource);

        expect(errors).to.have.lengthOf(0);
        expect(result!.value).to.deep.equal(ofCost(new Cost(2, 5, true).asModifier()));
    });

    it("should provide references for cost expressions", () => {
        const focusSource = { existing: { path: "1" } };
        const complexModifier: ParsedModifier = {
            path: "focus.enhancedreduction skill=path",
            attributes: {
                value: {
                    propertyPath: "existing.path",
                    sign: -1,
                    original: "existing.path",
                },
            },
        };

        const errors = new MockParseErrors();
        const result = withErrorLogger(errors).processCostValue(complexModifier, focusSource);

        expect(evaluate(result!.value)).deep.equal(new Cost(-1, 0, false).asModifier());
    });
});
class MockParseErrors extends Array<string> implements IErrorConsumer {
    pushKey(key: string, variables?: Record<string, unknown>): void {
        this.push(`${key}, ${JSON.stringify(variables)}`);
    }
    printAll(): void {}
}
