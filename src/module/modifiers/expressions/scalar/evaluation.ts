// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    DivideExpression,
    Expression,
    MultiplyExpression,
    PowerExpression,
    ReferenceExpression,
    RollExpression,
    SubtractExpression,
} from "./definitions";
import { exhaustiveMatchGuard, PropertyResolver } from "module/modifiers/util";

export async function evaluate(expression: Expression): Promise<number> {
    return (await doEvaluate(expression)) ?? 0;
}

async function doEvaluate(expression: Expression): Promise<number | null> {
    if (expression instanceof AmountExpression) {
        return expression.amount;
    } else if (expression instanceof ReferenceExpression) {
        return new PropertyResolver().numberOrNull(expression.propertyPath, expression.source);
    } else if (expression instanceof AddExpression) {
        return (await doEvaluate(expression.left) ?? 0) + (await doEvaluate(expression.right) ?? 0);
    } else if (expression instanceof SubtractExpression) {
        return (await doEvaluate(expression.left) ?? 0) - (await doEvaluate(expression.right) ?? 0);
    } else if (expression instanceof MultiplyExpression) {
        return (await doEvaluate(expression.left) ?? 1) * (await doEvaluate(expression.right) ?? 1);
    } else if (expression instanceof DivideExpression) {
        return (await doEvaluate(expression.left) ?? 1) / (await doEvaluate(expression.right) ?? 1);
    } else if (expression instanceof PowerExpression) {
        return Math.pow(await doEvaluate(expression.base) ?? 0, await doEvaluate(expression.exponent) ?? 1);
    } else if (expression instanceof RollExpression) {
        return expression.evaluate();
    } else if (expression instanceof AbsExpression) {
        return Math.abs(await evaluate(expression.arg));
    }
    exhaustiveMatchGuard(expression);
}

/**
 * Synchronously evaluates an expression, never rolling dice. Returns the deterministic value
 * when there is one, and {@link Number.NaN} for any sub-expression that contains a
 * non-deterministic {@link RollExpression}. Intended only for boolean guards (e.g. {@link isZero},
 * {@link isGreaterZero}) that already tolerate an "unknown" outcome. Never use this for a value
 * that will be displayed to the user or used in a roll result.
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
        console.debug(
            `Splittermond | syncEvaluate encountered a RollExpression (${expression.value.formula}); returning NaN.`
        );
        return Number.NaN;
    } else if (expression instanceof AbsExpression) {
        return Math.abs(syncEvaluate(expression.arg));
    }
    exhaustiveMatchGuard(expression);
}
