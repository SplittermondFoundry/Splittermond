import { foundryApi } from "./foundryApi";

/*
    Note: There also exist 'FunctionalTerm' and 'StringTerm' in the foundry codebase. But the former is too
    complicated to handle for us (we'll just have functional terms remain as rolls) and what the latter does
    I do not yet understand (It might be for descriptions, which we don't need).
 */
export type RollTerm = Die | OperatorTerm | NumericTerm | ParentheticTerm;

export interface Die {
    number: number;
    faces: number;
    readonly formula: string;
    /**
     * Contains dice postprocessing, like keep lowest or similar
     */
    modifiers: string[];
    results: { active: boolean; result: number }[];

    /**@internal*/ _evaluated: boolean;
}

export interface OperatorTerm {
    operator: string;
    readonly formula: string;
    /**@internal*/ _evaluated: boolean;
}

export interface ParentheticTerm {
    roll: FoundryRoll;
    /**@internal*/ _evaluated: boolean;
}

export interface NumericTerm {
    number: number;
    readonly expression: string;
    readonly total: number;
    readonly formula: string;

    /**@internal*/ _evaluated: boolean;
}

export declare class Roll {
    evaluate: () => Promise<Roll>;
    /** Can only be used to evaluate deterministic roll will otherwise it throws an error
     * or returns 0 if not strict.
     */
    evaluateSync: (options?: { strict: boolean }) => Roll;

    clone(): Roll;

    /** Will contain all definite (evaluated and constant) components of the roll*/
    readonly result: string;
    readonly formula: string;
    /**@internal*/ _evaluated: boolean;
    /**@internal*/ _total: number;
    readonly total: number;
    readonly isDeterministic: boolean;
    dice: Die[];
    terms: (Die | OperatorTerm | NumericTerm | ParentheticTerm)[];

    getTooltip(): Promise<string>;

    resetFormula(): void;

    static validate(formula: string): boolean;

    static fromTerms(terms: RollTerm[]): Roll;

    /**
     * @param formula a roll formula. Supports named parameters with @
     * @param data pass values to fill the formula template
     * @param options
     */
    constructor(formula: string, data?: Record<string, string>, options?: Record<string, any>);
}

export type FoundryRoll = InstanceType<typeof Roll>;

export function isRoll(value: unknown): value is FoundryRoll {
    //We're not using instanceof, because the Roll class is only available when we have foundry
    return (
        !!value &&
        typeof value === "object" &&
        "result" in value &&
        typeof value.result === "string" &&
        "formula" in value &&
        typeof value.formula === "string" &&
        "total" in value &&
        typeof value.total === "number" &&
        "evaluate" in value &&
        typeof value.evaluate === "function" &&
        "evaluateSync" in value &&
        typeof value.evaluateSync === "function" &&
        "getTooltip" in value &&
        typeof value.getTooltip === "function"
    );
}

export function isNumericTerm(value: RollTerm): value is NumericTerm {
    return "number" in value && !("faces" in value) && !("operator" in value) && !("roll" in value);
}

export function isOperatorTerm(value: RollTerm): value is OperatorTerm {
    return "operator" in value && !("faces" in value) && !("number" in value) && !("roll" in value);
}

export function addRolls(one: Roll, other: Roll): Roll {
    const oneTerms = one.terms;
    const otherTerms = other.terms;

    const addTerm = foundryApi.rollInfra.plusTerm();
    return Roll.fromTerms([...oneTerms, addTerm, ...otherTerms]);
}

export function sumRolls(rolls: Roll[]): Roll {
    if (rolls.length === 0) {
        return new Roll("0");
    }
    if (rolls.length === 1) {
        return rolls[0];
    }

    const addTerm = foundryApi.rollInfra.plusTerm();

    const terms: (Die | OperatorTerm | NumericTerm | ParentheticTerm)[] = [];
    rolls
        .map((r) => r.terms)
        .forEach((r) => {
            terms.push(...r);
            terms.push(addTerm);
        });
    terms.pop();

    return Roll.fromTerms(terms);
}
