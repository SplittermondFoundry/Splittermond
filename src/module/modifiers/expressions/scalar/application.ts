import { exhaustiveMatchGuard } from "module/modifiers/util";
import {
    AbsExpression,
    AddExpression,
    AmountExpression,
    DivideExpression,
    dividedBy,
    type Expression,
    MaxExpression,
    MinExpression,
    minus,
    MultiplyExpression,
    of,
    plus,
    PowerExpression,
    ReferenceExpression,
    RollExpression,
    SubtractExpression,
    times,
    abs,
    min,
    max,
    roll,
} from "module/modifiers/expressions/scalar/definitions";
import { mapRoll } from "module/modifiers/expressions/scalar/rollTermMapper";
import type { Die } from "module/api/Roll";

export function apply(target: Expression, timesToApply: number): Expression {
    if (timesToApply === 0) {
        return of(0);
    }
    if (target instanceof AmountExpression) {
        return of(target.amount * timesToApply);
    } else if (target instanceof AddExpression) {
        return plus(apply(target.left, timesToApply), apply(target.right, timesToApply));
    } else if (target instanceof SubtractExpression) {
        return minus(apply(target.left, timesToApply), apply(target.right, timesToApply));
    } else if (target instanceof MultiplyExpression) {
        if (target.right instanceof AmountExpression) {
            return times(target.left, apply(target.right, timesToApply));
        }
        return times(apply(target.left, timesToApply), target.right);
    } else if (target instanceof DivideExpression) {
        return dividedBy(apply(target.left, timesToApply), target.right);
    } else if (target instanceof PowerExpression) {
        return times(of(timesToApply), target);
    } else if (target instanceof AbsExpression) {
        return handleAbsExpression(target, timesToApply);
    } else if (target instanceof MinExpression) {
        return handleMinExpression(target, timesToApply);
    } else if (target instanceof MaxExpression) {
        return handleMaxExpression(target, timesToApply);
    } else if (target instanceof ReferenceExpression) {
        return times(of(timesToApply), target);
    } else if (target instanceof RollExpression) {
        return handleRollExpression(target, timesToApply);
    }
    exhaustiveMatchGuard(target);
}

function handleAbsExpression(expression: AbsExpression, timesToApply: number) {
    const applied = apply(expression.arg, timesToApply);
    return timesToApply >= 0 ? abs(applied) : times(of(-1), abs(applied));
}

function handleMinExpression(expression: MinExpression, timesToApply: number) {
    const applied = expression.map((e) => apply(e, timesToApply));
    return timesToApply >= 0 ? min(...applied) : max(...applied);
}

function handleMaxExpression(expression: MaxExpression, timesToApply: number) {
    const applied = expression.map((e) => apply(e, timesToApply));
    return timesToApply >= 0 ? max(...applied) : min(...applied);
}

function handleRollExpression(expression: RollExpression, timesToApply: number) {
    if (expression.value.terms.length === 1 && !expression.value.isDeterministic) {
        //single dice term
        const rollCopy = expression.value.clone();
        const dieTerm = rollCopy.terms[0] as Die;
        dieTerm.number = dieTerm.number * timesToApply;
        return roll(rollCopy);
    } else {
        return apply(mapRoll(expression.value), timesToApply);
    }
}
