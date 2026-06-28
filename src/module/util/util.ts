import type { TimeUnit } from "module/config/timeUnits";
import { splittermond } from "module/config";
import { asString, condense, evaluate, type Expression } from "module/modifiers/expressions/scalar";

export function getTimeUnitConversion(from: TimeUnit, to: TimeUnit): number {
    return splittermond.time.relativeDurations[from] / splittermond.time.relativeDurations[to];
}

export function isMember<T>(collection: Readonly<T[]>, member: unknown): member is T {
    return collection.includes(member as T);
}

export function fromExpression(expressionCalculator: () => Expression) {
    return {
        get display() {
            return asString(condense(expressionCalculator()));
        },
        get expression() {
            return expressionCalculator();
        },
        async calculate() {
            return evaluate(expressionCalculator());
        },
    };
}
export type ValueBundle<T = number> = { display: string; calculate(): Promise<T> };
export type ExpressionBundle = ValueBundle<number> & { expression: Expression };
