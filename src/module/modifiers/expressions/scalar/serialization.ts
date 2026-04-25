import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    DivideExpression,
    type Expression,
    MultiplyExpression,
    PowerExpression,
    ReferenceExpression,
    RollExpression,
    SubtractExpression,
    of,
    roll,
} from "module/modifiers/expressions/scalar/definitions";
import { foundryApi } from "module/api/foundryApi";

type SerializedExpression = Record<string, unknown> & { type: string };

export function serialize(expression: Expression): SerializedExpression {
    if (expression instanceof AmountExpression) {
        return { type: "amount", amount: expression.amount };
    } else if (expression instanceof RollExpression) {
        return { type: "roll", formula: expression.value.formula };
    } else if (expression instanceof ReferenceExpression) {
        const uuid = expression.uuid;
        if (!uuid) {
            throw new Error(
                `Splittermond | Cannot serialize ReferenceExpression: source object does not have a uuid property.`
            );
        }
        return {
            type: "reference",
            propertyPath: expression.propertyPath,
            stringRep: expression.stringRep,
            uuid,
        };
    } else if (expression instanceof AddExpression) {
        return { type: "add", left: serialize(expression.left), right: serialize(expression.right) };
    } else if (expression instanceof SubtractExpression) {
        return { type: "subtract", left: serialize(expression.left), right: serialize(expression.right) };
    } else if (expression instanceof MultiplyExpression) {
        return { type: "multiply", left: serialize(expression.left), right: serialize(expression.right) };
    } else if (expression instanceof DivideExpression) {
        return { type: "divide", left: serialize(expression.left), right: serialize(expression.right) };
    } else if (expression instanceof PowerExpression) {
        return { type: "power", base: serialize(expression.base), exponent: serialize(expression.exponent) };
    } else if (expression instanceof AbsExpression) {
        return { type: "abs", arg: serialize(expression.arg) };
    }
    throw new Error(`Splittermond | Cannot serialize unknown expression type: ${expression}`);
}

export function deserialize(data: SerializedExpression): Expression {
    switch (data.type) {
        case "amount":
            return of(data.amount as number);
        case "roll":
            return roll(foundryApi.roll(data.formula as string));
        case "reference": {
            const uuid = data.uuid as string;
            return new ReferenceExpression(
                data.propertyPath as string,
                null,
                data.stringRep as string,
                uuid,
            );
        }
        case "add":
            return new AddExpression(
                deserialize(data.left as SerializedExpression),
                deserialize(data.right as SerializedExpression),
            );
        case "subtract":
            return new SubtractExpression(
                deserialize(data.left as SerializedExpression),
                deserialize(data.right as SerializedExpression),
            );
        case "multiply":
            return new MultiplyExpression(
                deserialize(data.left as SerializedExpression),
                deserialize(data.right as SerializedExpression),
            );
        case "divide":
            return new DivideExpression(
                deserialize(data.left as SerializedExpression),
                deserialize(data.right as SerializedExpression),
            );
        case "power":
            return new PowerExpression(
                deserialize(data.base as SerializedExpression),
                deserialize(data.exponent as SerializedExpression),
            );
        case "abs":
            return new AbsExpression(deserialize(data.arg as SerializedExpression));
        default:
            throw new Error(`Splittermond | Cannot deserialize unknown expression type: ${data.type}`);
    }
}
