// noinspection SuspiciousTypeOfGuard

import {
    AbsExpression,
    AddExpression,
    AmountExpression, DivideExpression,
    Expression, MultiplyExpression, PowerExpression,
    ReferenceExpression,
    RollExpression,
    SubtractExpression
} from "./definitions";
import {exhaustiveMatchGuard, PropertyResolver} from "../../util";


export function toRollFormula(expression: Expression): [string, Record<string, string>] {
    const nextNumber = numberGenerator();
    const mapResult = mapToRoll(expression);
    return [unbrace(mapResult[0]), mapResult[1]];
    function mapToRoll(expression: Expression): [string, Record<string, string>]{
        if (expression instanceof AmountExpression) {
            return [`${expression.amount}`, {}];
        } else if (expression instanceof RollExpression) {
            return [`${expression.value.formula}`, {}];
        } else if (expression instanceof ReferenceExpression) {
            return handleReferences(expression);
        } else if (expression instanceof AbsExpression) {
            const innerRoll = mapToRoll(expression.arg);
            return [`abs(${unbrace(innerRoll[0])})`, innerRoll[1]];
        } else if (expression instanceof AddExpression) {
            return handleSummation(expression, "+");
        } else if (expression instanceof SubtractExpression) {
            return handleSummation(expression, "-");
        } else if (expression instanceof MultiplyExpression) {
            return handleFactorExpressions(expression, "*");
        } else if (expression instanceof DivideExpression) {
            return handleFactorExpressions(expression, "/");
        } else if (expression instanceof PowerExpression) {
            return handlePowerExpression(expression);
        }

        exhaustiveMatchGuard(expression)
    }

    function handleReferences(expression: ReferenceExpression): [string, Record<string, string>] {
        const uniqueId = `${expression.stringRep}${nextNumber.next().value}`;
        return [`@${uniqueId}`, {[uniqueId]: `${new PropertyResolver().numberOrNull(expression.propertyPath, expression.source) ?? 0}`}];
    }

    function handleSummation(expression: {
        left: Expression,
        right: Expression
    }, operator: '+' | '-'): [string, Record<string, string>] {
        const left = mapToRoll(expression.left);
        const right = mapToRoll(expression.right);
        return [`(${left[0]} ${operator} ${right[0]})`, {...left[1], ...right[1]}];
    }

    function handleFactorExpressions(expression: {
        left: Expression,
        right: Expression
    }, operator: '*' | '/'): [string, Record<string, string>] {
        const left = mapToRoll(expression.left);
        const right = mapToRoll(expression.right);
        return [`(${left[0]} ${operator} ${right[0]})`, {...left[1], ...right[1]}];
    }

    function handlePowerExpression(expression: PowerExpression): [string, Record<string, string>] {
        const base = mapToRoll(expression.base);
        const exponent = mapToRoll(expression.exponent);
        return [`pow(${base[0]},${exponent[0]})`, {...base[1], ...exponent[1]}];
    }
}

function unbrace(str: string) {
    const match = /^\((.*)\)$/.exec(str);
    return match ? match[1] : str;
}

function* numberGenerator(): Generator<number> {
    let current = 0;
    while (true) {
        yield current++;
    }
}

