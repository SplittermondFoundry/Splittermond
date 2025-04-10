// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    cost, CostAddExpression,
    CostExpression, CostSubtractExpression,
    dividedBy,
    DivideExpression,
    type Expression,
    isScalarExpression,
    isVectorExpression, LeftScalarMultiplication,
    minus,
    MultiplyExpression,
    of,
    plus,
    ReferenceExpression, RightScalarMultiplication,
    RollExpression,
    ScalarExpression,
    SubtractExpression,
    times, VecExpression
} from "./definitions";
import {exhaustiveMatchGuard} from "./util";
import {evaluate, evaluateCost} from "./evaluation";

export function isZero(expression: Expression): boolean {
    //straight forward eval would resolve references and rolls whose values are not constant and thus not reliably zero.
    return canCondense(expression) && evaluate(expression) === 0;
}

export function condense(expression: Expression): Expression {
    if (canCondense(expression) && isScalarExpression(expression)) {
        return of(evaluate(expression))
    }
    if (canCondense(expression) && isVectorExpression(expression)) {
        return cost(evaluateCost(expression))
    }
    if (expression instanceof AddExpression || expression instanceof CostAddExpression) {
        return condenseOperands(expression.left, expression.right, plus)
    } else if (expression instanceof SubtractExpression || expression instanceof CostSubtractExpression) {
        return condenseOperands(expression.left, expression.right, minus)
    } else if (expression instanceof MultiplyExpression || expression instanceof LeftScalarMultiplication || expression instanceof RightScalarMultiplication) {
        return condenseOperands(expression.left, expression.right, times)
    } else if (expression instanceof DivideExpression) {
        return condenseOperands(expression.left, expression.right, (l, r) => dividedBy(l, r as ScalarExpression))
    } else if (expression instanceof ReferenceExpression) {
        return expression;
    } else if (expression instanceof AmountExpression) {
        return expression;
    } else if (expression instanceof RollExpression) {
        return expression;
    } else if (expression instanceof AbsExpression) {
        return expression;
    } else if (expression instanceof CostExpression) {
        return expression;
    } else if (expression instanceof VecExpression) {
        return expression;
    }

    exhaustiveMatchGuard(expression);
}

function condenseOperands(left: Expression, right: Expression, constructor: (left: Expression, right: Expression) => Expression): Expression {
    const condensedLeft = condense(left);
    const condensedRight = condense(right);
    return constructor(condensedLeft, condensedRight);
}

function canCondense(expression: Expression): boolean {
    if (expression instanceof AmountExpression) {
        return true;
    } else if (expression instanceof ReferenceExpression || expression instanceof RollExpression) {
        return false;
    } else if (expression instanceof AbsExpression) {
        return canCondense(expression.arg);
    } else if (expression instanceof CostExpression) {
        return true
    } else if (expression instanceof VecExpression) {
        return true
    } else {
        return canCondense(expression.left) && canCondense(expression.right);
    }
}