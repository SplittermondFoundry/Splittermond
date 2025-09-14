// noinspection SuspiciousTypeOfGuard

import {
    AddExpression,
    AmountExpression,
    CostExpression,
    MultiplyExpression,
    ReferenceExpression,
    SubtractExpression
} from "./definitions";
import {AmountExpression as ScalarAmount} from "../scalar/definitions";
import {asString as scalarAsString} from "module/modifiers/expressions/scalar";
import {exhaustiveMatchGuard} from "module/modifiers/util";


export function asString(expression: CostExpression): string {
    return unbrace(do_toString(expression));
}

function unbrace(str: string) {
    const match = /^\((.*)\)$/.exec(str);
    return match ? match[1] : str;
}

function do_toString(expression: CostExpression): string {
    if(expression instanceof AmountExpression) {
        return expression.amount.toString();
    } else if (expression instanceof ReferenceExpression) {
        return `\$\{${expression.stringRep}}`
    } else if(expression instanceof AddExpression) {
        return `(${do_toString(expression.left)} + ${do_toString(expression.right)})`;
    } else if(expression instanceof SubtractExpression) {
        return `(${do_toString(expression.left)} - ${do_toString(expression.right)})`;
    } else if(expression instanceof MultiplyExpression) {
        return asMultiplicationString(expression)
    }
    exhaustiveMatchGuard(expression);
}

function asMultiplicationString(expression: MultiplyExpression): string {
    if(expression.scalar instanceof ScalarAmount && expression.scalar.amount == -1) {
        return `-${asString(expression.cost)}`;
    } else {
        const scalar = unbraceNumbers(`(${scalarAsString(expression.scalar)})`);
        return `(${scalar} \u00D7 ${unbraceNumbers(do_toString(expression.cost))})`;//use unicode multiplication sign
    }
}

function unbraceNumbers(str: string): string {
    return /^\([+-]?K?\d+(?:V\d+)?\)$/.test(str) ? unbrace(str) : str;
}