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
    times,
} from "./definitions";
import { exhaustiveMatchGuard } from "module/modifiers/util";
import { syncEvaluate } from "./evaluation";
import { Expression } from "module/modifiers/expressions/scalar/definitions";
import {
    canCondense as scalarCanCondense,
    condense as scalarCondense,
} from "module/modifiers/expressions/scalar/condenser";
import { CostModifier } from "module/util/costs/Cost";

export function isZero(expression: CostExpression): boolean {
    //straight forward eval would resolve references and rolls whose values are not constant and thus not reliably zero.
    if (!canCondense(expression, false)) {
        return false;
    }
    return syncEvaluate(expression) === CostModifier.zero;
}

export function condense(expression: CostExpression, evalStableRef: boolean = false): CostExpression {
    if (canCondense(expression, evalStableRef)) {
        return of(syncEvaluate(expression));
    }
    if (expression instanceof AddExpression) {
        return condenseOperands(expression.left, expression.right, plus);
    } else if (expression instanceof SubtractExpression) {
        return condenseOperands(expression.left, expression.right, minus);
    } else if (expression instanceof MultiplyExpression) {
        return condenseMultiply(expression.scalar, expression.cost);
    } else if (expression instanceof ReferenceExpression) {
        return evalStableRef && expression.isStable ? of(syncEvaluate(expression)) : expression;
    } else if (expression instanceof AmountExpression) {
        return expression;
    }
    exhaustiveMatchGuard(expression);
}

function condenseOperands(
    left: CostExpression,
    right: CostExpression,
    constructor: (left: CostExpression, right: CostExpression) => CostExpression
): CostExpression {
    const condensedLeft = condense(left);
    const condensedRight = condense(right);
    return constructor(condensedLeft, condensedRight);
}

function condenseMultiply(scalar: Expression, cost: CostExpression) {
    const condensedScalar = scalarCondense(scalar);
    const condensedCost = condense(cost);
    return times(condensedScalar, condensedCost);
}

function canCondense(expression: CostExpression, evalStableRef: boolean): boolean {
    if (expression instanceof AmountExpression) {
        return true;
    } else if (expression instanceof ReferenceExpression) {
        return evalStableRef && expression.isStable;
    } else if (expression instanceof MultiplyExpression) {
        return scalarCanCondense(expression.scalar, evalStableRef) && canCondense(expression.cost, evalStableRef);
    } else {
        return canCondense(expression.left, evalStableRef) && canCondense(expression.right, evalStableRef);
    }
}
