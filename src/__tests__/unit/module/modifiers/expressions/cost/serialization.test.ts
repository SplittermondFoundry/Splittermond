import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
    AddExpression,
    AmountExpression,
    MultiplyExpression,
    of,
    ref,
    ReferenceExpression,
    SubtractExpression,
} from "module/modifiers/expressions/cost/definitions";
import { of as scalarOf } from "module/modifiers/expressions/scalar";
import { deserialize, serialize } from "module/modifiers/expressions/cost/serialization";
import { CostModifier } from "module/util/costs/Cost";
import { foundryApi } from "module/api/foundryApi";

function costMod(channeled: number, channeledConsumed: number, exhausted: number, consumed: number) {
    return new CostModifier({
        _channeled: channeled,
        _channeledConsumed: channeledConsumed,
        _exhausted: exhausted,
        _consumed: consumed,
    });
}

describe("Cost Expression Serialization", () => {
    describe("serialize", () => {
        it("should serialize zero AmountExpression", () => {
            const result = serialize(of(CostModifier.zero));
            expect(result).to.deep.equal({
                type: "amount",
                amount: { _channeled: 0, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 },
            });
        });

        it("should serialize non-zero AmountExpression", () => {
            const mod = costMod(3, 1, 2, 0);
            const result = serialize(of(mod));
            expect(result).to.deep.equal({
                type: "amount",
                amount: { _channeled: 3, _channeledConsumed: 1, _exhausted: 2, _consumed: 0 },
            });
        });

        it("should serialize AddExpression", () => {
            const left = of(costMod(1, 0, 0, 0));
            const right = of(costMod(0, 0, 2, 0));
            const result = serialize(new AddExpression(left, right));
            expect(result.type).to.equal("add");
            expect(result.left).to.have.property("type", "amount");
            expect(result.right).to.have.property("type", "amount");
        });

        it("should serialize SubtractExpression", () => {
            const left = of(costMod(5, 0, 0, 0));
            const right = of(costMod(2, 0, 0, 0));
            const result = serialize(new SubtractExpression(left, right));
            expect(result.type).to.equal("subtract");
        });

        it("should serialize MultiplyExpression", () => {
            const expr = new MultiplyExpression(scalarOf(3), of(costMod(1, 0, 0, 0)));
            const result = serialize(expr);
            expect(result.type).to.equal("multiply");
            expect(result.scalar).to.have.property("type", "amount");
            expect(result.cost).to.have.property("type", "amount");
        });

        it("should serialize RollExpression using formula", () => {
            // MultiplyExpression with scalar
            const expr = new MultiplyExpression(scalarOf(2), of(costMod(1, 0, 1, 0)));
            const result = serialize(expr);
            expect(result).to.deep.equal({
                type: "multiply",
                scalar: { type: "amount", amount: 2 },
                cost: {
                    type: "amount",
                    amount: { _channeled: 1, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 },
                },
            });
        });

        describe("ReferenceExpression", () => {
            it("should serialize when source has uuid", () => {
                const source = { uuid: "Actor.abc123", value: "K3V2" };
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
                const source = { value: "K3V2" };
                const expr = ref("value", source, "value");
                expect(() => serialize(expr)).to.throw(/uuid/);
            });
        });
    });

    describe("deserialize", () => {
        it("should deserialize AmountExpression", () => {
            const data = {
                type: "amount",
                amount: { _channeled: 3, _channeledConsumed: 1, _exhausted: 2, _consumed: 0 },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(AmountExpression);
            const amount = (result as AmountExpression).amount;
            expect(amount).to.be.instanceOf(CostModifier);
        });

        it("should deserialize AddExpression", () => {
            const data = {
                type: "add",
                left: { type: "amount", amount: { _channeled: 1, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 } },
                right: {
                    type: "amount",
                    amount: { _channeled: 0, _channeledConsumed: 0, _exhausted: 2, _consumed: 0 },
                },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(AddExpression);
        });

        it("should deserialize SubtractExpression", () => {
            const data = {
                type: "subtract",
                left: { type: "amount", amount: { _channeled: 5, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 } },
                right: {
                    type: "amount",
                    amount: { _channeled: 2, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 },
                },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(SubtractExpression);
        });

        it("should deserialize MultiplyExpression", () => {
            const data = {
                type: "multiply",
                scalar: { type: "amount", amount: 3 },
                cost: { type: "amount", amount: { _channeled: 1, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 } },
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(MultiplyExpression);
        });

        it("should deserialize ReferenceExpression with lazy uuid", () => {
            const data = {
                type: "reference",
                propertyPath: "system.cost",
                stringRep: "cost",
                uuid: "Item.xyz789",
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(ReferenceExpression);
            expect((result as ReferenceExpression).propertyPath).to.equal("system.cost");
            expect((result as ReferenceExpression).uuid).to.equal("Item.xyz789");
        });

        it("should throw for unknown type", () => {
            expect(() => deserialize({ type: "unknown" })).to.throw(/unknown/i);
        });
    });

    describe("roundtrip", () => {
        it("should roundtrip AmountExpression", () => {
            const original = of(costMod(3, 1, 2, 0));
            const result = deserialize(serialize(original));
            expect(result).to.be.instanceOf(AmountExpression);
            expect((result as AmountExpression).amount.toObject()).to.deep.equal(
                (original as AmountExpression).amount.toObject()
            );
        });

        it("should roundtrip AddExpression", () => {
            const original = new AddExpression(of(costMod(1, 0, 0, 0)), of(costMod(0, 0, 2, 0)));
            const result = deserialize(serialize(original));
            expect(result).to.be.instanceOf(AddExpression);
        });

        it("should roundtrip MultiplyExpression", () => {
            const original = new MultiplyExpression(scalarOf(3), of(costMod(1, 0, 1, 0)));
            const result = deserialize(serialize(original));
            expect(result).to.be.instanceOf(MultiplyExpression);
        });
    });

    describe("Cost ReferenceExpression lazy resolution", () => {
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
            const mockSource = { uuid: "Actor.abc123", system: { cost: "K3V2" } };
            const stub = sandbox.stub(foundryApi.utils, "fromUUIDSync").returns(mockSource as any);

            const expr = new ReferenceExpression("system.cost", null, "cost", "Actor.abc123");
            const source = expr.source;

            expect(stub.calledOnceWith("Actor.abc123")).to.be.true;
            expect(source).to.equal(mockSource);
        });

        it("should cache resolved source", () => {
            const mockSource = { uuid: "Actor.abc123", system: { cost: "K3V2" } };
            const stub = sandbox.stub(foundryApi.utils, "fromUUIDSync").returns(mockSource as any);

            const expr = new ReferenceExpression("system.cost", null, "cost", "Actor.abc123");
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
            const directSource = { value: "K3V2" };
            const stub = sandbox.stub(foundryApi.utils, "fromUUIDSync");

            const expr = new ReferenceExpression("value", directSource, "value", "Actor.abc123");
            const source = expr.source;

            expect(stub.called).to.be.false;
            expect(source).to.equal(directSource);
        });

        it("should extract uuid from source object", () => {
            const source = { uuid: "Item.xyz789", value: "K3" };
            const expr = ref("value", source, "value");
            expect(expr.uuid).to.equal("Item.xyz789");
        });

        it("should return null uuid when source has no uuid", () => {
            const source = { value: "K3" };
            const expr = ref("value", source, "value");
            expect(expr.uuid).to.be.null;
        });
    });
});
