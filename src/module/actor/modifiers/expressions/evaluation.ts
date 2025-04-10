// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression, CostAddExpression, CostExpression, CostSubtractExpression,
    DivideExpression,
    Expression, isScalarExpression, isVectorExpression, LeftScalarMultiplication,
    MultiplyExpression,
    ReferenceExpression, RightScalarMultiplication, RollExpression, ScalarExpression,
    SubtractExpression, VecExpression, VectorExpression
} from "./definitions";
import {exhaustiveMatchGuard, PropertyResolver} from "./util";
import {Cost, CostModifier} from "../../../util/costs/Cost";


export function evaluate(expression: Expression): number{
    if (isScalarExpression(expression)) {
        return doEvaluate(expression) ?? 0
    } else {
        throw new Error(`Cannot evaluate vector expression ${expression.constructor.name} as scalar`)
    }
}

export function evaluateCost(expression: VectorExpression): CostModifier {
    return vecEvaluate(expression) ?? new Cost(0, 0, false)
}

function doEvaluate(expression: ScalarExpression): number | null {
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
        const arg = expression.arg;
        if (isVectorExpression(arg)) {
            return vecEvaluate(arg).length;
        } else if (isScalarExpression(arg)) {
            return Math.abs(doEvaluate(arg) ?? 0);
        }
        exhaustiveMatchGuard(arg)
    }
    exhaustiveMatchGuard(expression)
}

function vecEvaluate(expression: VectorExpression): CostModifier {
    if (expression instanceof CostExpression) {
        return expression.cost
    } else if (expression instanceof LeftScalarMultiplication) {
        return vecEvaluate(expression.right).multiply(doEvaluate(expression.left) ?? 1)
    } else if (expression instanceof RightScalarMultiplication) {
        return vecEvaluate(expression.left).multiply(doEvaluate(expression.right) ?? 1)
    } else if (expression instanceof VecExpression) {
        return new Cost(doEvaluate(expression.arg) ?? 0, 0, false).asModifier();
    } else if (expression instanceof CostAddExpression) {
        return vecEvaluate(expression.left).add(vecEvaluate(expression.right))
    } else if (expression instanceof CostSubtractExpression) {
        return vecEvaluate(expression.left).subtract(vecEvaluate(expression.right))
    }
    exhaustiveMatchGuard(expression)
}
