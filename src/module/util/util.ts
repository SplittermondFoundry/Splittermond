import type { TimeUnit } from "module/config/timeUnits";
import { splittermond } from "module/config";
import { asString, condense, evaluate, type Expression, syncEvaluate } from "module/modifiers/expressions/scalar";

export function getTimeUnitConversion(from: TimeUnit, to: TimeUnit): number {
    return splittermond.time.relativeDurations[from] / splittermond.time.relativeDurations[to];
}

export function isMember<T>(collection: Readonly<T[]>, member: unknown): member is T {
    return collection.includes(member as T);
}

export function fromExpression(expressionCalculator: () => Expression) {
    return {
        get display() {
            return asString(condense(expressionCalculator(), true));
        },
        get expression() {
            return expressionCalculator();
        },
        async calculate() {
            return evaluate(expressionCalculator());
        },
        calculateSync() {
            return syncEvaluate(expressionCalculator());
        },
    };
}
export type ExpressionBundle = ReturnType<typeof fromExpression>;
export type ValueBundle = Omit<ExpressionBundle, "expression">;

export function not<T>(func: (input: T) => boolean) {
    return (input: T) => !func(input);
}
export function and<T>(op1: (input: T) => boolean, op2: (input: T) => boolean) {
    return (input: T) => op1(input) && op2(input);
}

export function pipe<U, V>(op1: () => U, op2: (input: U) => V): () => V;
export function pipe<T, U, V>(op1: (input: T) => U, op2: (input: U) => V): (x: T) => V {
    return (input: T) => op2(op1(input));
}
