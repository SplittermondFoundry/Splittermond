// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    dividedBy,
    DivideExpression,
    type Expression,
    max,
    MaxExpression,
    min,
    MinExpression,
    minus,
    MultiplyExpression,
    of,
    plus,
    pow,
    PowerExpression,
    ReferenceExpression,
    RollExpression,
    SubtractExpression,
    times,
} from "./definitions";
import { exhaustiveMatchGuard } from "module/modifiers/util";
import { syncEvaluate } from "./evaluation";
import { IllegalStateException } from "module/data/exceptions";

export function isZero(expression: Expression): boolean {
    //straight forward eval would resolve references and rolls whose values are not constant and thus not reliably zero.
    if (!canCondense(expression, false)) {
        return false;
    }
    const value = syncEvaluate(expression);
    return Number.isNaN(value) ? false : value === 0;
}
export function condense(expression: Expression, evalStableRef: boolean = false): Expression {
    if (canCondense(expression, evalStableRef)) {
        return of(syncEvaluate(expression));
    }
    if (expression instanceof AddExpression) {
        return condenseOperands(expression.left, expression.right, plus);
    } else if (expression instanceof SubtractExpression) {
        return condenseOperands(expression.left, expression.right, minus);
    } else if (expression instanceof MultiplyExpression) {
        return condenseOperands(expression.left, expression.right, times);
    } else if (expression instanceof DivideExpression) {
        return condenseOperands(expression.left, expression.right, dividedBy);
    } else if (expression instanceof PowerExpression) {
        return condenseOperands(expression.base, expression.exponent, pow);
    } else if (expression instanceof ReferenceExpression) {
        return evalStableRef && expression.isStable ? of(syncEvaluate(expression)) : expression;
    } else if (expression instanceof AmountExpression) {
        return expression;
    } else if (expression instanceof RollExpression) {
        return expression;
    } else if (expression instanceof AbsExpression) {
        return expression;
    } else if (expression instanceof MinExpression) {
        return processMin(expression, evalStableRef);
    } else if (expression instanceof MaxExpression) {
        return processMax(expression, evalStableRef);
    }
    exhaustiveMatchGuard(expression);
}
function condenseOperands(
    left: Expression,
    right: Expression,
    constructor: (left: Expression, right: Expression) => Expression
): Expression {
    const condensedLeft = condense(left);
    const condensedRight = condense(right);
    return constructor(condensedLeft, condensedRight);
}

export function canCondense(expression: Expression, evalStableRef: boolean): boolean {
    if (expression instanceof AmountExpression) {
        return true;
    } else if (expression instanceof ReferenceExpression) {
        return evalStableRef && expression.isStable;
    } else if (expression instanceof RollExpression) {
        return false;
    } else if (expression instanceof AbsExpression) {
        return canCondense(expression.arg, evalStableRef);
    } else if (expression instanceof PowerExpression) {
        return canCondense(expression.base, evalStableRef) && canCondense(expression.exponent, evalStableRef);
    } else if (expression instanceof MinExpression) {
        return expression.args.every((arg) => canCondense(arg, evalStableRef));
    } else if (expression instanceof MaxExpression) {
        return expression.args.every((arg) => canCondense(arg, evalStableRef));
    } else {
        return canCondense(expression.left, evalStableRef) && canCondense(expression.right, evalStableRef);
    }
}

function processMin(expression: MinExpression, evalStableRef: boolean) {
    const condensed = expression.args.map((arg) => condense(arg, evalStableRef));
    if (condensed.every((e) => e instanceof AmountExpression)) {
        return of(Math.min(...condensed.map((e) => e.amount)));
    }
    if (condensed.length > 1) {
        return min(...(condensed as [Expression, ...Expression[]]));
    }
    throw new IllegalStateException("Zero array when min length 1 array required by definition.");
}

function processMax(expression: MaxExpression, evalStableRef: boolean) {
    const condensed = expression.args.map((arg) => condense(arg, evalStableRef));
    if (condensed.every((e) => e instanceof AmountExpression)) {
        return of(Math.max(...condensed.map((e) => e.amount)));
    }
    if (condensed.length > 1) {
        return max(...(condensed as [Expression, ...Expression[]]));
    }
    throw new IllegalStateException("Zero array when min length 1 array required by definition.");
}
