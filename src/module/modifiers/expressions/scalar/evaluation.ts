// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    DivideExpression,
    Expression,
    MaxExpression,
    MinExpression,
    MultiplyExpression,
    PowerExpression,
    ReferenceExpression,
    RollExpression,
    SubtractExpression,
    UnboundReferenceError,
} from "./definitions";
import { exhaustiveMatchGuard, PropertyResolver } from "module/modifiers/util";

export async function evaluate(expression: Expression): Promise<number> {
    return (await doEvaluate(expression)) ?? 0;
}

async function doEvaluate(expression: Expression): Promise<number | null> {
    if (expression instanceof AmountExpression) {
        return expression.amount;
    } else if (expression instanceof ReferenceExpression) {
        return swallowReferenceError(() =>
            new PropertyResolver().numberOrNull(expression.propertyPath, expression.source)
        );
    } else if (expression instanceof AddExpression) {
        return ((await doEvaluate(expression.left)) ?? 0) + ((await doEvaluate(expression.right)) ?? 0);
    } else if (expression instanceof SubtractExpression) {
        return ((await doEvaluate(expression.left)) ?? 0) - ((await doEvaluate(expression.right)) ?? 0);
    } else if (expression instanceof MultiplyExpression) {
        return ((await doEvaluate(expression.left)) ?? 1) * ((await doEvaluate(expression.right)) ?? 1);
    } else if (expression instanceof DivideExpression) {
        return ((await doEvaluate(expression.left)) ?? 1) / ((await doEvaluate(expression.right)) ?? 1);
    } else if (expression instanceof PowerExpression) {
        return Math.pow((await doEvaluate(expression.base)) ?? 0, (await doEvaluate(expression.exponent)) ?? 1);
    } else if (expression instanceof RollExpression) {
        return expression.evaluate();
    } else if (expression instanceof AbsExpression) {
        return Math.abs(await evaluate(expression.arg));
    } else if (expression instanceof MinExpression) {
        return Math.min(...(await Promise.all(expression.args.map(evaluate))));
    } else if (expression instanceof MaxExpression) {
        return Math.max(...(await Promise.all(expression.args.map(evaluate))));
    }
    exhaustiveMatchGuard(expression);
}

/**
 * Synchronously evaluates an expression, using a pre-rolled value for {@link RollExpression}
 * If possible, prefer to use {@link evaluate}
 */
export function syncEvaluate(expression: Expression): number {
    return syncDoEvaluate(expression) ?? 0;
}

function syncDoEvaluate(expression: Expression): number | null {
    if (expression instanceof AmountExpression) {
        return expression.amount;
    } else if (expression instanceof ReferenceExpression) {
        return new PropertyResolver().numberOrNull(expression.propertyPath, expression.source);
    } else if (expression instanceof AddExpression) {
        return (syncDoEvaluate(expression.left) ?? 0) + (syncDoEvaluate(expression.right) ?? 0);
    } else if (expression instanceof SubtractExpression) {
        return (syncDoEvaluate(expression.left) ?? 0) - (syncDoEvaluate(expression.right) ?? 0);
    } else if (expression instanceof MultiplyExpression) {
        return (syncDoEvaluate(expression.left) ?? 1) * (syncDoEvaluate(expression.right) ?? 1);
    } else if (expression instanceof DivideExpression) {
        return (syncDoEvaluate(expression.left) ?? 1) / (syncDoEvaluate(expression.right) ?? 1);
    } else if (expression instanceof PowerExpression) {
        return Math.pow(syncDoEvaluate(expression.base) ?? 0, syncDoEvaluate(expression.exponent) ?? 1);
    } else if (expression instanceof RollExpression) {
        return expression.evaluateSync();
    } else if (expression instanceof AbsExpression) {
        return Math.abs(syncEvaluate(expression.arg));
    } else if (expression instanceof MinExpression) {
        return Math.min(...expression.args.map(syncEvaluate));
    } else if (expression instanceof MaxExpression) {
        return Math.max(...expression.args.map(syncEvaluate));
    }
    exhaustiveMatchGuard(expression);
}

function swallowReferenceError(resolver: () => number | null) {
    try {
        return resolver();
    } catch (e) {
        if (e instanceof UnboundReferenceError) {
            return null;
        }
        throw e;
    }
}
