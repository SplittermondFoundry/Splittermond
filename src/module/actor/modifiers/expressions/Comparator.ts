// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    DivideExpression,
    Expression,
    MultiplyExpression,
    ReferenceExpression,
    RollExpression,
    SubtractExpression
} from "./definitions";
import {condense} from "./condenser";
import {evaluate} from "./evaluation";
import {exhaustiveMatchGuard} from "./util";
import {mapRoll} from "./rollTermMapper";
import {Die} from "../../../api/Roll";

interface Range {
    min: number;
    max: number;
}

export function isGreaterZero(expression: Expression): boolean | null {
    const result = tentativeEvaluate(expression);
    if (result.min > 0 && result.max > 0) {
        return true;
    } else if (result.min <= 0 && result.max <= 0) {
        return false;
    } else {
        return null;
    }
}

export function isLessThanZero(expression: Expression): boolean | null {
    const result = tentativeEvaluate(expression);
    if (result.min < 0 && result.max < 0) {
        return true;
    } else if (result.min >= 0 && result.max >= 0) {
        return false;
    } else {
        return null;
    }
}

function tentativeEvaluate(expression: Expression): { min: number, max: number } {
    const condensed = condense(expression);
    if (condensed instanceof AmountExpression) {
        const val = evaluate(condensed);
        return {min: val, max: val}
    }else if (condensed instanceof RollExpression){
        return evalRolls(condensed);
    } else if (condensed instanceof ReferenceExpression) {
        return {min: Number.NaN, max: Number.NaN}
    } else if (condensed instanceof AddExpression) {
        return evalBinaries(condensed, (left: number, right: number) => left + right);
    } else if (condensed instanceof SubtractExpression) {
        return evalBinaries(condensed, (left: number, right: number) => left - right);
    } else if (condensed instanceof MultiplyExpression) {
        return evalBinaries(condensed, (left: number, right: number) => left * right);
    } else if (condensed instanceof DivideExpression) {
        return evalBinaries(condensed, (left: number, right: number) => left / right);
    } else if (condensed instanceof AbsExpression) {
        return evalAbs(condensed)
    }
    exhaustiveMatchGuard(condensed);
}

function evalRolls(expression: RollExpression){
    if(expression.value.terms.length === 1 && "faces" in expression.value.terms[0]){
        return evalDies(expression.value.terms[0])
    }else {
        return tentativeEvaluate(mapRoll(expression.value));
    }
}
//We are ignoring foundry dice modifiers for now
function evalDies(term:Die): Range {
    if(term.modifier && term.modifier.length > 0){
        console.warn("Splittermond | Value estimation for dice with modifiers is not supported. will assume any range")
        return {min:Number.NaN, max:Number.NaN}
    }
    return {min: term.number, max: term.number * term.faces};
}

function evalBinaries(expression: {
    left: Expression,
    right: Expression
}, operation: (a: number, b: number) => number): {
    min: number,
    max: number
} {
    const left = tentativeEvaluate(expression.left);
    const right = tentativeEvaluate(expression.right);
    return sortResult(left, right, operation);
}

function sortResult(one: Range, other: Range, operation: (a: number, b: number) => number): Range {
    if ([one.min, one.max, other.min, other.max].some(isNaN)) {
        return {min: Number.NaN, max: Number.NaN};
    }
    const allResults = [
        operation(one.min, other.min),
        operation(one.min, other.max),
        operation(one.max, other.min),
        operation(one.max, other.max),
    ]
    return {min: Math.min(...allResults), max: Math.max(...allResults)};
}

function evalAbs(expression: AbsExpression) {
    const result = tentativeEvaluate(expression.arg);
    const arrayedResults = [result.min, result.max];
    if (arrayedResults.some(isNaN)) {
        return {min: Number.NaN, max: Number.NaN};
    } else {
        return {min: Math.min(...arrayedResults), max: Math.max(...arrayedResults)};
    }
}


