import {
    AddExpression,
    AmountExpression,
    type CostExpression,
    MultiplyExpression,
    ReferenceExpression,
    SubtractExpression,
} from "module/modifiers/expressions/cost/definitions";
import {
    serialize as serializeScalar,
    deserialize as deserializeScalar,
} from "module/modifiers/expressions/scalar/serialization";
import { CostModifier } from "module/util/costs/Cost";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import { bindReferenceProviders } from "./binder";

type SerializedCostExpression = Record<string, unknown> & { type: string };

export function serialize(expression: CostExpression): SerializedCostExpression {
    if (expression instanceof AmountExpression) {
        return { type: "amount", amount: expression.amount.toObject() };
    } else if (expression instanceof ReferenceExpression) {
        return {
            type: "reference",
            propertyPath: expression.propertyPath,
            stringRep: expression.stringRep,
            isStable: expression.isStable,
        };
    } else if (expression instanceof AddExpression) {
        return { type: "add", left: serialize(expression.left), right: serialize(expression.right) };
    } else if (expression instanceof SubtractExpression) {
        return { type: "subtract", left: serialize(expression.left), right: serialize(expression.right) };
    } else if (expression instanceof MultiplyExpression) {
        return { type: "multiply", scalar: serializeScalar(expression.scalar), cost: serialize(expression.cost) };
    }
    throw new Error(`Splittermond | Cannot serialize unknown cost expression type: ${expression}`);
}

export function deserialize(
    data: SerializedCostExpression,
    provider?: ActorProvider,
    onUnbound?: () => void
): CostExpression {
    const expression = deserializeInner(data);
    if (provider) {
        bindReferenceProviders(expression, provider, onUnbound);
    }
    return expression;
}

function deserializeInner(data: SerializedCostExpression): CostExpression {
    switch (data.type) {
        case "amount":
            return new AmountExpression(new CostModifier(data.amount as any));
        case "reference":
            return new ReferenceExpression(
                data.propertyPath as string,
                data.stringRep as string,
                data.isStable as boolean
            );
        case "add":
            return new AddExpression(
                deserializeInner(data.left as SerializedCostExpression),
                deserializeInner(data.right as SerializedCostExpression)
            );
        case "subtract":
            return new SubtractExpression(
                deserializeInner(data.left as SerializedCostExpression),
                deserializeInner(data.right as SerializedCostExpression)
            );
        case "multiply":
            return new MultiplyExpression(
                deserializeScalar(data.scalar as any),
                deserializeInner(data.cost as SerializedCostExpression)
            );
        default:
            throw new Error(`Splittermond | Cannot deserialize unknown cost expression type: ${data.type}`);
    }
}
