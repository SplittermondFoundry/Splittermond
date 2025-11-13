import { FocusModifier, ParsedModifier, ScalarModifier, Value } from "./index";
import { Expression, ref as scalarRef, roll, times } from "module/modifiers/expressions/scalar/definitions";
import { normalizeValue } from "./normalizer";
import { isRoll } from "module/api/Roll";
import { validateReference } from "./validators";
import { parseCostString } from "module/util/costs/costParser";
import { of } from "../expressions/scalar";
import { CostExpression, of as ofCost, ref as costRef, times as timesCost } from "../expressions/cost";
import { Cost } from "module/util/costs/Cost";
import type { IErrorConsumer } from "module/modifiers/parsing/ParseErrors";

export function withErrorLogger(errorLogger: IErrorConsumer) {
    return {
        processCostValue,
        processScalarValue,
    };
    function processCostValue(modifier: ParsedModifier, refSource: object): FocusModifier | null {
        const value = modifier.attributes.value;
        if (value === null || value === undefined) {
            errorLogger.pushKey("splittermond.modifiers.parseMessages.noValue", { modifier: modifier.path });
            return null;
        }
        const normalized = normalizeValue(value);
        const processedValue = setUpCostExpression(normalized, refSource);
        if (!processedValue) return null;
        const valueProcessedModifier: FocusModifier = {
            path: modifier.path,
            attributes: { ...modifier.attributes },
            value: processedValue,
        };
        delete valueProcessedModifier.attributes.value;
        return valueProcessedModifier;
    }

    function processScalarValue(modifier: ParsedModifier, refSource: object): ScalarModifier | null {
        const value = modifier.attributes.value;
        if (value === null || value === undefined) {
            if (value === null || value === undefined) {
                errorLogger.pushKey("splittermond.modifiers.parseMessages.noValue", { modifier: modifier.path });
                return null;
            }
        }
        const normalized = normalizeValue(value);
        const processedValue = setUpExpression(normalized, refSource);
        if (!processedValue) return null;
        const valueProcessedModifier: ScalarModifier = {
            path: modifier.path,
            attributes: { ...modifier.attributes },
            value: processedValue,
        };
        delete valueProcessedModifier.attributes.value;
        return valueProcessedModifier;
    }

    function setUpExpression(expression: Value, source: object): Expression | null {
        if (typeof expression === "number") {
            return of(expression);
        } else if (isRoll(expression)) {
            return roll(expression);
        } else if (typeof expression === "object") {
            const validationFailures = validateReference(expression.propertyPath, source);
            if (validationFailures.length > 0) {
                errorLogger.push(...validationFailures);
                return null;
            }
            const reference = scalarRef(expression.propertyPath, source, expression.original);
            return times(of(expression.sign), reference);
        } else {
            errorLogger.pushKey("splittermond.modifiers.parseMessages.notANumber", { expression });
            return null;
        }
    }

    function setUpCostExpression(expression: Value, source: object): CostExpression | null {
        if (typeof expression === "number") {
            return ofCost(new Cost(expression, 0, false).asModifier());
        } else if (isRoll(expression)) {
            errorLogger.pushKey("splittermond.modifiers.parseMessages.foNoCost", { expression: expression.formula });
            return null;
        } else if (typeof expression === "object") {
            const validationFailures = validateReference(expression.propertyPath, source);
            if (validationFailures.length > 0) {
                errorLogger.push(...validationFailures);
                return null;
            }
            const reference = costRef(expression.propertyPath, source, expression.original);
            return timesCost(of(expression.sign), reference);
        } else {
            return ofCost(parseCostString(expression).asModifier());
        }
    }
}
