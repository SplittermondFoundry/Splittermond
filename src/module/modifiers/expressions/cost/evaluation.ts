// noinspection SuspiciousTypeOfGuard

import {
    AddExpression,
    AmountExpression,
    CostExpression,
    MultiplyExpression,
    ReferenceExpression,
    SubtractExpression,
} from "./definitions";
import { exhaustiveMatchGuard, PropertyResolver } from "module/modifiers/util";
import {
    evaluate as scalarEvaluate,
    type Expression,
    syncEvaluate as scalarSyncEvaluate,
} from "module/modifiers/expressions/scalar";
import { CostModifier } from "../../../util/costs/Cost";

export async function evaluate(expression: CostExpression): Promise<CostModifier> {
    return doEvaluate(expression, scalarEvaluate);
}

async function doEvaluate(
    expression: CostExpression,
    scalarEval: (e: Expression) => Promise<number>
): Promise<CostModifier> {
    if (expression instanceof AmountExpression) {
        return expression.amount;
    } else if (expression instanceof ReferenceExpression) {
        return new PropertyResolver().costModifier(expression.propertyPath, expression.source);
    } else if (expression instanceof AddExpression) {
        return (await doEvaluate(expression.left, scalarEval)).add(await doEvaluate(expression.right, scalarEval));
    } else if (expression instanceof SubtractExpression) {
        return (await doEvaluate(expression.left, scalarEval)).subtract(await doEvaluate(expression.right, scalarEval));
    } else if (expression instanceof MultiplyExpression) {
        return (await doEvaluate(expression.cost, scalarEval)).multiply((await scalarEval(expression.scalar)) ?? 1);
    }
    exhaustiveMatchGuard(expression);
}

/**
 * Synchronous counterpart to {@link evaluate} that never rolls dice. Used by boolean guards
 * (e.g. {@link isZero}) that already tolerate an "unknown" outcome. See {@link scalarSyncEvaluate}.
 */
export function syncEvaluate(expression: CostExpression): CostModifier {
    if (expression instanceof AmountExpression) {
        return expression.amount;
    } else if (expression instanceof ReferenceExpression) {
        return new PropertyResolver().costModifier(expression.propertyPath, expression.source);
    } else if (expression instanceof AddExpression) {
        return syncEvaluate(expression.left).add(syncEvaluate(expression.right));
    } else if (expression instanceof SubtractExpression) {
        return syncEvaluate(expression.left).subtract(syncEvaluate(expression.right));
    } else if (expression instanceof MultiplyExpression) {
        return syncEvaluate(expression.cost).multiply(scalarSyncEvaluate(expression.scalar) ?? 1);
    }
    exhaustiveMatchGuard(expression);
}
