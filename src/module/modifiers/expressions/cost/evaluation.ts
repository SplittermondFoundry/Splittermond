// noinspection SuspiciousTypeOfGuard

import {
    AddExpression,
    AmountExpression,
    CostExpression,
    MultiplyExpression,
    ReferenceExpression,
    SubtractExpression
} from "./definitions";
import {exhaustiveMatchGuard, PropertyResolver} from "module/modifiers/util";
import {evaluate as scalarEvaluate} from "module/modifiers/expressions/scalar";
import {CostModifier} from "../../../util/costs/Cost";


export function evaluate(expression: CostExpression): CostModifier {
    return doEvaluate(expression)
}

function doEvaluate(expression: CostExpression): CostModifier {
    if (expression instanceof AmountExpression) {
        return expression.amount
    } else if (expression instanceof ReferenceExpression) {
        return new PropertyResolver().costModifier(expression.propertyPath, expression.source)
    } else if (expression instanceof AddExpression) {
        return (doEvaluate(expression.left)).add(doEvaluate(expression.right))
    } else if (expression instanceof SubtractExpression) {
        return (doEvaluate(expression.left)).subtract(doEvaluate(expression.right));
    } else if (expression instanceof MultiplyExpression) {
        return (doEvaluate(expression.cost)).multiply(scalarEvaluate(expression.scalar) ?? 1)
    }
    exhaustiveMatchGuard(expression)
}
