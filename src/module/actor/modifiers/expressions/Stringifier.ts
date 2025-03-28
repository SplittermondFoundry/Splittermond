// noinspection SuspiciousTypeOfGuard

import {
    AddExpression,
    AmountExpression,
    DivideExpression,
    Expression,
    MultiplyExpression, ReferenceExpression,
    SubtractExpression
} from "./definitions";
import {exhaustiveMatchGuard} from "./util";


export function asString(expression: Expression): string {
    return unbrace(do_toString(expression));
}

function unbrace(str: string) {
    const match = /^\((.*)\)$/.exec(str);
    return match ? match[1] : str;
}

function do_toString(expression: Expression): string {
    if(expression instanceof AmountExpression) {
        return `${expression.amount}`;
    } else if (expression instanceof ReferenceExpression) {
        return `\$\{${expression.propertyPath}}`
    } else if(expression instanceof AddExpression) {
        return `(${do_toString(expression.left)} + ${do_toString(expression.right)})`;
    } else if(expression instanceof SubtractExpression) {
        return `(${do_toString(expression.left)} - ${do_toString(expression.right)})`;
    } else if(expression instanceof MultiplyExpression) {
        return stringify(expression, "*");
    } else if(expression instanceof DivideExpression) {
        return stringify(expression, "/");
    }
    exhaustiveMatchGuard(expression);
}

function stringify(expression: {left:Expression, right:Expression}, operator:string): string {
    const leftString = unbraceNumbers(do_toString(expression.left));
    const rightString = unbraceNumbers(do_toString(expression.right));
    return `(${leftString} ${operator} ${rightString})`;
}

function unbraceNumbers(str: string): string {
    return /^\((\d+)\)$/.test(str) ? unbrace(str) : str;
}