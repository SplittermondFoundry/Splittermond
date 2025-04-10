// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    DivideExpression,
    Expression,
    MultiplyExpression,
    ReferenceExpression, RollExpression,
    SubtractExpression
} from "./definitions";
import {exhaustiveMatchGuard, PropertyResolver} from "./util";


export function evaluate(expression: Expression): number {
    return doEvaluate(expression) ?? 0
}

function doEvaluate(expression: Expression): number | null {
    if (expression instanceof AmountExpression) {
        return expression.amount
    } else if (expression instanceof ReferenceExpression) {
        return new PropertyResolver().numberOrNull(expression.propertyPath, expression.source)
    } else if (expression instanceof AddExpression) {
        return (doEvaluate(expression.left) ?? 0) + (doEvaluate(expression.right) ?? 0)
    } else if (expression instanceof SubtractExpression) {
        return (doEvaluate(expression.left) ?? 0) - (doEvaluate(expression.right) ?? 0)
    } else if (expression instanceof MultiplyExpression) {
        return (doEvaluate(expression.left) ?? 1) * (doEvaluate(expression.right) ?? 1)
    } else if (expression instanceof DivideExpression) {
        return (doEvaluate(expression.left) ?? 1) / (doEvaluate(expression.right) ?? 1)
    } else if (expression instanceof RollExpression) {
        return expression.evaluate()
    } else if (expression instanceof AbsExpression) {
        return Math.abs(evaluate(expression.arg))
    }
    exhaustiveMatchGuard(expression)
}
