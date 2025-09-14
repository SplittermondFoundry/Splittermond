// noinspection SuspiciousTypeOfGuard

import {
    AddExpression,
    AmountExpression,
    type CostExpression,
    minus,
    MultiplyExpression,
    of,
    plus,
    ReferenceExpression,
    SubtractExpression,
    times
} from "./definitions";
import {exhaustiveMatchGuard} from "module/modifiers/util";
import {evaluate} from "./evaluation";
import {Expression} from "module/modifiers/expressions/scalar/definitions";
import {
    condense as scalarCondense,
    canCondense as scalarCanCondense
} from "module/modifiers/expressions/scalar/condenser"
import {CostModifier} from "../../../util/costs/Cost";

export function isZero(expression: CostExpression): boolean {
    //straight forward eval would resolve references and rolls whose values are not constant and thus not reliably zero.
    return canCondense(expression) && evaluate(expression) === CostModifier.zero;
}

export function condense(expression: CostExpression): CostExpression {
    if (canCondense(expression)) {
        return of(evaluate(expression))
    }
    if (expression instanceof AddExpression) {
        return condenseOperands(expression.left, expression.right, plus)
    } else if (expression instanceof SubtractExpression) {
        return condenseOperands(expression.left, expression.right, minus)
    } else if (expression instanceof MultiplyExpression) {
        return condenseMultiply(expression.scalar, expression.cost)
    } else if (expression instanceof ReferenceExpression) {
        return expression;
    } else if (expression instanceof AmountExpression) {
        return expression;
    }
    exhaustiveMatchGuard(expression);
}

function condenseOperands(left: CostExpression, right: CostExpression, constructor: (left: CostExpression, right: CostExpression) => CostExpression): CostExpression {
    const condensedLeft = condense(left);
    const condensedRight = condense(right);
    return constructor(condensedLeft, condensedRight);
}

function condenseMultiply(scalar: Expression, cost: CostExpression) {
    const condensedScalar = scalarCondense(scalar);
    const condensedCost = condense(cost);
    return times(condensedScalar, condensedCost)
}

function canCondense(expression: CostExpression): boolean {
    if (expression instanceof AmountExpression) {
        return true;
    } else if (expression instanceof ReferenceExpression) {
        return false;
    } else if (expression instanceof MultiplyExpression) {
        return scalarCanCondense(expression.scalar) && canCondense(expression.cost);
    } else {
        return canCondense(expression.left) && canCondense(expression.right);
    }
}