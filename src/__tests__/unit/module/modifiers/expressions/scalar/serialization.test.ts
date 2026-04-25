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
            it("should serialize when source has uuid", () => {
                const source = { uuid: "Actor.abc123", value: 5 };
                const expr = ref("value", source, "value");
                const result = serialize(expr);
                expect(result).to.deep.equal({
                    type: "reference",
                    propertyPath: "value",
                    stringRep: "value",
                    uuid: "Actor.abc123",
                });
            });

            it("should throw when source has no uuid", () => {
                const source = { value: 5 };
                const expr = ref("value", source, "value");
                expect(() => serialize(expr)).to.throw(/uuid/);
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
            it("should deserialize with lazy uuid resolution", () => {
                const data = {
                    type: "reference",
                    propertyPath: "system.value",
                    stringRep: "value",
                    uuid: "Actor.abc123",
                };
                const result = deserialize(data);
                expect(result).to.be.instanceOf(ReferenceExpression);
                expect((result as ReferenceExpression).propertyPath).to.equal("system.value");
                expect((result as ReferenceExpression).stringRep).to.equal("value");
                expect((result as ReferenceExpression).uuid).to.equal("Actor.abc123");
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

    describe("ReferenceExpression lazy resolution", () => {
        let sandbox: sinon.SinonSandbox;
        beforeEach(() => (sandbox = sinon.createSandbox()));
        afterEach(() => sandbox.restore());

        it("should not resolve uuid on construction", () => {
            const stub = sandbox.stub(foundryApi.utils, "fromUUIDSync");
            const expr = new ReferenceExpression("value", null, "value", "Actor.abc123");
            expect(stub.called).to.be.false;
            expect(expr.uuid).to.equal("Actor.abc123");
        });

        it("should resolve uuid lazily on source access", () => {
            const mockSource = { uuid: "Actor.abc123", system: { value: 5 } };
            const stub = sandbox.stub(foundryApi.utils, "fromUUIDSync").returns(mockSource as any);

            const expr = new ReferenceExpression("system.value", null, "value", "Actor.abc123");
            const source = expr.source;

            expect(stub.calledOnceWith("Actor.abc123")).to.be.true;
            expect(source).to.equal(mockSource);
        });

        it("should cache resolved source", () => {
            const mockSource = { uuid: "Actor.abc123", system: { value: 5 } };
            const stub = sandbox.stub(foundryApi.utils, "fromUUIDSync").returns(mockSource as any);

            const expr = new ReferenceExpression("system.value", null, "value", "Actor.abc123");
            expr.source;
            expr.source;

            expect(stub.calledOnce).to.be.true;
        });

        it("should throw when uuid resolution fails", () => {
            sandbox.stub(foundryApi.utils, "fromUUIDSync").returns(null);
            const expr = new ReferenceExpression("value", null, "value", "Actor.missing");
            expect(() => expr.source).to.throw(/fromUuidSync returned null/);
        });

        it("should throw when neither source nor uuid is available", () => {
            const expr = new ReferenceExpression("value", null, "value", null);
            expect(() => expr.source).to.throw(/neither a source object nor a uuid/);
        });

        it("should use direct source when available without resolving uuid", () => {
            const directSource = { value: 42 };
            const stub = sandbox.stub(foundryApi.utils, "fromUUIDSync");

            const expr = new ReferenceExpression("value", directSource, "value", "Actor.abc123");
            const source = expr.source;

            expect(stub.called).to.be.false;
            expect(source).to.equal(directSource);
        });

        it("should extract uuid from source object", () => {
            const source = { uuid: "Item.xyz789", value: 10 };
            const expr = ref("value", source, "value");
            expect(expr.uuid).to.equal("Item.xyz789");
        });

        it("should return null uuid when source has no uuid", () => {
            const source = { value: 10 };
            const expr = ref("value", source, "value");
            expect(expr.uuid).to.be.null;
        });
    });
});
