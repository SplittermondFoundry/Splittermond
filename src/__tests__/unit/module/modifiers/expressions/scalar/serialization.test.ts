import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
    abs,
    AddExpression,
    AmountExpression,
    DivideExpression,
    minus,
    MultiplyExpression,
    of,
    plus,
    PowerExpression,
    ref,
    ReferenceExpression,
    SubtractExpression,
} from "module/modifiers/expressions/scalar";
import { deserialize, serialize } from "module/modifiers/expressions/scalar/serialization";
import { foundryApi } from "module/api/foundryApi";
import { MockRoll } from "__tests__/unit/RollMock";
import { roll } from "module/modifiers/expressions/scalar/definitions";

describe("Expression Serialization", () => {
    describe("serialize", () => {
        it("should serialize AmountExpression with value 0", () => {
            const result = serialize(of(0));
            expect(result).to.deep.equal({ type: "amount", amount: 0 });
        });

        it("should serialize AmountExpression with value 1", () => {
            const result = serialize(of(1));
            expect(result).to.deep.equal({ type: "amount", amount: 1 });
        });

        it("should serialize AmountExpression with arbitrary value", () => {
            const result = serialize(of(42));
            expect(result).to.deep.equal({ type: "amount", amount: 42 });
        });

        it("should serialize negative AmountExpression", () => {
            const result = serialize(of(-5));
            expect(result).to.deep.equal({ type: "amount", amount: -5 });
        });

        it("should serialize AddExpression", () => {
            const result = serialize(plus(of(3), of(4)));
            expect(result).to.deep.equal({
                type: "add",
                left: { type: "amount", amount: 3 },
                right: { type: "amount", amount: 4 },
            });
        });

        it("should serialize SubtractExpression", () => {
            const result = serialize(minus(of(5), of(2)));
            expect(result).to.deep.equal({
                type: "subtract",
                left: { type: "amount", amount: 5 },
                right: { type: "amount", amount: 2 },
            });
        });

        it("should serialize MultiplyExpression", () => {
            const expr = new MultiplyExpression(of(3), of(4));
            const result = serialize(expr);
            expect(result).to.deep.equal({
                type: "multiply",
                left: { type: "amount", amount: 3 },
                right: { type: "amount", amount: 4 },
            });
        });

        it("should serialize DivideExpression", () => {
            const expr = new DivideExpression(of(10), of(2));
            const result = serialize(expr);
            expect(result).to.deep.equal({
                type: "divide",
                left: { type: "amount", amount: 10 },
                right: { type: "amount", amount: 2 },
            });
        });

        it("should serialize PowerExpression", () => {
            const expr = new PowerExpression(of(2), of(3));
            const result = serialize(expr);
            expect(result).to.deep.equal({
                type: "power",
                base: { type: "amount", amount: 2 },
                exponent: { type: "amount", amount: 3 },
            });
        });

        it("should serialize AbsExpression", () => {
            const result = serialize(abs(of(-7)));
            expect(result).to.deep.equal({
                type: "abs",
                arg: { type: "amount", amount: -7 },
            });
        });

        it("should serialize nested expressions", () => {
            const expr = new MultiplyExpression(plus(of(1), of(2)), minus(of(5), of(3)));
            const result = serialize(expr);
            expect(result).to.deep.equal({
                type: "multiply",
                left: { type: "add", left: { type: "amount", amount: 1 }, right: { type: "amount", amount: 2 } },
                right: {
                    type: "subtract",
                    left: { type: "amount", amount: 5 },
                    right: { type: "amount", amount: 3 },
                },
            });
        });

        it("should serialize RollExpression using formula", () => {
            const result = serialize(roll(new MockRoll("2d6")));
            expect(result).to.deep.equal({ type: "roll", formula: "2d6" });
        });

        describe("ReferenceExpression", () => {
            it("should serialize with propertyPath and stringRep (no uuid)", () => {
                const expr = ref("value", () => null, "value");
                const result = serialize(expr);
                expect(result).to.deep.equal({
                    type: "reference",
                    propertyPath: "value",
                    stringRep: "value",
                    isStable: false,
                });
            });
        });
    });

    describe("deserialize", () => {
        it("should deserialize AmountExpression with value 0", () => {
            const result = deserialize({ type: "amount", amount: 0 });
            expect(result).to.be.instanceOf(AmountExpression);
            expect((result as AmountExpression).amount).to.equal(0);
        });

        it("should deserialize AmountExpression with value 1", () => {
            const result = deserialize({ type: "amount", amount: 1 });
            expect(result).to.be.instanceOf(AmountExpression);
            expect((result as AmountExpression).amount).to.equal(1);
        });

        it("should deserialize AmountExpression with arbitrary value", () => {
            const result = deserialize({ type: "amount", amount: 42 });
            expect(result).to.be.instanceOf(AmountExpression);
            expect((result as AmountExpression).amount).to.equal(42);
        });

        it("should deserialize AddExpression", () => {
            const data = {
                type: "add",
                left: { type: "amount", amount: 3 },
                right: { type: "amount", amount: 4 },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(AddExpression);
            expect((result as AddExpression).left).to.deep.equal(of(3));
            expect((result as AddExpression).right).to.deep.equal(of(4));
        });

        it("should deserialize SubtractExpression", () => {
            const data = {
                type: "subtract",
                left: { type: "amount", amount: 5 },
                right: { type: "amount", amount: 2 },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(SubtractExpression);
        });

        it("should deserialize MultiplyExpression", () => {
            const data = {
                type: "multiply",
                left: { type: "amount", amount: 3 },
                right: { type: "amount", amount: 4 },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(MultiplyExpression);
        });

        it("should deserialize DivideExpression", () => {
            const data = {
                type: "divide",
                left: { type: "amount", amount: 10 },
                right: { type: "amount", amount: 2 },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(DivideExpression);
        });

        it("should deserialize PowerExpression", () => {
            const data = {
                type: "power",
                base: { type: "amount", amount: 2 },
                exponent: { type: "amount", amount: 3 },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(PowerExpression);
        });

        it("should deserialize AbsExpression", () => {
            const data = { type: "abs", arg: { type: "amount", amount: -7 } };
            const result = deserialize(data);
            expect(result).to.deep.equal(abs(of(-7)));
        });

        it("should throw for unknown type", () => {
            expect(() => deserialize({ type: "unknown" })).to.throw(/unknown/i);
        });

        describe("RollExpression", () => {
            let sandbox: sinon.SinonSandbox;
            beforeEach(() => {
                sandbox = sinon.createSandbox();
                sandbox.stub(foundryApi, "roll").callsFake((formula) => new MockRoll(formula) as any);
            });
            afterEach(() => sandbox.restore());

            it("should deserialize RollExpression using formula", () => {
                const result = deserialize({ type: "roll", formula: "2d6" });
                expect(result).to.be.instanceOf(Object); // RollExpression
            });
        });

        describe("ReferenceExpression", () => {
            it("should deserialize as unbound expression", () => {
                const data = {
                    type: "reference",
                    propertyPath: "system.value",
                    stringRep: "value",
                };
                const result = deserialize(data);
                expect(result).to.be.instanceOf(ReferenceExpression);
                expect((result as ReferenceExpression).propertyPath).to.equal("system.value");
                expect((result as ReferenceExpression).stringRep).to.equal("value");
            });

            it("should ignore legacy uuid field when deserializing", () => {
                const data = {
                    type: "reference",
                    propertyPath: "system.value",
                    stringRep: "value",
                    uuid: "Actor.legacyId",
                };
                const result = deserialize(data);
                expect(result).to.be.instanceOf(ReferenceExpression);
                expect((result as ReferenceExpression).propertyPath).to.equal("system.value");
            });
        });
    });

    describe("roundtrip", () => {
        it("should roundtrip AmountExpression", () => {
            const original = of(42);
            const result = deserialize(serialize(original));
            expect(result).to.deep.equal(original);
        });

        it("should roundtrip nested expression", () => {
            const original = new AddExpression(of(3), new SubtractExpression(of(5), of(2)));
            const result = deserialize(serialize(original));
            expect(result).to.deep.equal(original);
        });

        it("should roundtrip AbsExpression", () => {
            const original = abs(of(-3));
            const result = deserialize(serialize(original));
            expect(result).to.deep.equal(original);
        });

        it("should roundtrip PowerExpression", () => {
            const original = new PowerExpression(of(2), of(3));
            const result = deserialize(serialize(original));
            expect(result).to.deep.equal(original);
        });

        it("should roundtrip complex expression", () => {
            const original = new MultiplyExpression(
                new AddExpression(of(1), of(2)),
                new DivideExpression(of(10), of(5))
            );
            const result = deserialize(serialize(original));
            expect(result).to.deep.equal(original);
        });
    });

    describe("ReferenceExpression provider binding", () => {
        it("should throw UnboundReferenceError when no provider is set", () => {
            const expr = new ReferenceExpression("value", "value", false);
            expect(() => expr.source).to.throw(/no actor context/);
        });

        it("should throw UnboundReferenceError when provider returns null", () => {
            const expr = ref("value", () => null, "value");
            expect(() => expr.source).to.throw(/no actor context/);
        });

        it("should return source from provider when provider returns an actor", () => {
            const stubActor = { value: 42 } as any;
            const expr = ref("value", () => stubActor, "value");
            expect(expr.source).to.equal(stubActor);
        });

        it("should allow rebinding via bindProvider", () => {
            const expr = new ReferenceExpression("value", "value", false);
            const stubActor = { value: 7 } as any;
            expr.bindProvider(() => stubActor);
            expect(expr.source).to.equal(stubActor);
        });

        it("should roundtrip ReferenceExpression through serialize/deserialize", () => {
            const stubActor = { value: 5 } as any;
            const original = ref("value", () => stubActor, "value");
            const roundtripped = deserialize(serialize(original)) as ReferenceExpression;
            expect(roundtripped).to.be.instanceOf(ReferenceExpression);
            expect(roundtripped.propertyPath).to.equal("value");
            expect(roundtripped.stringRep).to.equal("value");
            roundtripped.bindProvider(() => stubActor);
            expect(roundtripped.source).to.equal(stubActor);
        });
    });
});
