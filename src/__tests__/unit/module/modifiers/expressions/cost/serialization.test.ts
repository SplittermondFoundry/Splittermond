import { describe, it } from "mocha";
import { expect } from "chai";
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

        it("should deserialize ReferenceExpression as unbound", () => {
            const data = {
                type: "reference",
                propertyPath: "system.cost",
                stringRep: "cost",
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(ReferenceExpression);
            expect((result as ReferenceExpression).propertyPath).to.equal("system.cost");
            expect((result as ReferenceExpression).stringRep).to.equal("cost");
        });

        it("should ignore legacy uuid field when deserializing", () => {
            const data = {
                type: "reference",
                propertyPath: "system.cost",
                stringRep: "cost",
                uuid: "Item.xyz789",
            };
            const result = deserialize(data);
            expect(result).to.be.instanceOf(ReferenceExpression);
            expect((result as ReferenceExpression).propertyPath).to.equal("system.cost");
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

    describe("Cost ReferenceExpression provider binding", () => {
        it("should throw UnboundReferenceError when no provider is set", () => {
            const expr = new ReferenceExpression("value", "value", false);
            expect(() => expr.source).to.throw(/no actor context/);
        });

        it("should throw UnboundReferenceError when provider returns null", () => {
            const expr = ref("value", () => null, "value");
            expect(() => expr.source).to.throw(/no actor context/);
        });

        it("should return source from provider when provider returns an actor", () => {
            const stubActor = { value: "K3V2" } as any;
            const expr = ref("value", () => stubActor, "value");
            expect(expr.source).to.equal(stubActor);
        });

        it("should allow rebinding via bindProvider", () => {
            const expr = new ReferenceExpression("value", "value", false);
            const stubActor = { value: "3V1" } as any;
            expr.bindProvider(() => stubActor);
            expect(expr.source).to.equal(stubActor);
        });

        it("should roundtrip ReferenceExpression through serialize/deserialize", () => {
            const stubActor = { value: "K3V2" } as any;
            const original = ref("value", () => stubActor, "value");
            const roundtripped = deserialize(serialize(original)) as ReferenceExpression;
            expect(roundtripped).to.be.instanceOf(ReferenceExpression);
            expect(roundtripped.propertyPath).to.equal("value");
            roundtripped.bindProvider(() => stubActor);
            expect(roundtripped.source).to.equal(stubActor);
        });
    });
});
