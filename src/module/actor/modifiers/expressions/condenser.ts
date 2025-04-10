// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    dividedBy,
    DivideExpression,
    type Expression,
    minus,
    MultiplyExpression,
    of,
    plus,
    ReferenceExpression,
    RollExpression,
    SubtractExpression,
    times
} from "./definitions";
import {exhaustiveMatchGuard} from "./util";
import {evaluate} from "./evaluation";

export function isZero(expression: Expression): boolean {
    //straight forward eval would resolve references and rolls whose values are not constant and thus not reliably zero.
    return canCondense(expression) && evaluate(expression) ===0;
}
export function condense(expression: Expression): Expression {
    if(canCondense(expression)){
        return of(evaluate(expression))
    }
    if (expression instanceof AddExpression) {
        return condenseOperands(expression.left, expression.right, plus)
    }else if (expression instanceof SubtractExpression) {
        return condenseOperands(expression.left, expression.right, minus)
    }else if (expression instanceof MultiplyExpression) {
        return condenseOperands(expression.left, expression.right, times)
    }else if (expression instanceof DivideExpression) {
        return condenseOperands(expression.left, expression.right, dividedBy)
    }else if (expression instanceof ReferenceExpression) {
        return expression;
    }else if (expression instanceof AmountExpression) {
        return expression;
    }else if (expression instanceof RollExpression) {
        return expression;
    }else if (expression instanceof AbsExpression) {
        return expression;
    }
    exhaustiveMatchGuard(expression);
}
function condenseOperands(left: Expression, right: Expression, constructor:(left:Expression, right:Expression)=>Expression):Expression {
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
    } else {
        return canCondense(expression.left) && canCondense(expression.right);
    }
}