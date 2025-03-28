// noinspection SuspiciousTypeOfGuard

import {expressions} from "./definitions";
import {AmountExpression, type Expression, ReferenceExpression, AddExpression, SubtractExpression, MultiplyExpression, DivideExpression} from "./definitions";
import {exhaustiveMatchGuard} from "./util";
import {evaluate} from "./evaluation";

export function condense(expression: Expression): Expression {
    if(canCondense(expression)){
        return expressions.of(evaluate(expression)??0)
    }
    if (expression instanceof AddExpression) {
        return condenseOperands(expression.left, expression.right, AddExpression)
    }else if (expression instanceof SubtractExpression) {
        return condenseOperands(expression.left, expression.right, SubtractExpression)
    }else if (expression instanceof MultiplyExpression) {
        return condenseOperands(expression.left, expression.right, MultiplyExpression)
    }else if (expression instanceof DivideExpression) {
        return condenseOperands(expression.left, expression.right, DivideExpression)
    }else {
        if (expression instanceof ReferenceExpression || expression instanceof AmountExpression) {
                return expression;
            }
    }
    exhaustiveMatchGuard(expression);
}
function condenseOperands(left: Expression, right: Expression, constructor:new (left:Expression, right:Expression)=>Expression):Expression {
    const condensedLeft = condense(left);
    const condensedRight = condense(right);
    return new constructor(condensedLeft, condensedRight);
}

function canCondense(expression: Expression): boolean {
    if (expression instanceof AmountExpression) {
        return true;
    } else if (expression instanceof ReferenceExpression) {
        return false;
    } else {
        return canCondense(expression.left) && canCondense(expression.right);
    }
}