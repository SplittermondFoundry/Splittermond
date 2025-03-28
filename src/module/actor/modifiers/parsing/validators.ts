import {ErrorMessage, Value} from "./index";
import {PropertyResolver} from "../expressions/util";

export function validateAllInputConsumed(modifier: string, pathMatch: null | RegExpMatchArray, attributeMatch: string[], valueMatch: RegExpMatchArray | null): boolean {
    let valueMatchReplacer = valueMatch ? valueMatch[0].replace("+","\\+").replace("$","\\$") : '';
    let unconsumed = modifier.replace(pathMatch ? pathMatch[0] : '', '').trim()
        .replace(new RegExp(`${valueMatchReplacer}(?=\\s*$)`), '').trim();
    attributeMatch.forEach((attribute) => {
        unconsumed = unconsumed.replace(attribute, '').trim();
    });
    return unconsumed.trim() == "";
}

export function validateDescriptors(value: Value): ErrorMessage[] {
    const errors: ErrorMessage[] = [];
    validateNotANumber(value, errors)

    return errors;
}

export function validateKeys(key: string): ErrorMessage[] {
    const errors: ErrorMessage[] = [];
    if (/\$\{.*}/.test(key)) {
        errors.push("Key should not have an expression format")
    }
    validateNotANumber(key, errors)
    return errors;
}

export function validateReference(propertyPath:string, source:object):ErrorMessage[] {
    const resolvedProperty = new PropertyResolver().resolve(propertyPath, source);
    if(!["string", "number","boolean"].includes(typeof resolvedProperty)){
        return [`${propertyPath} does not resolve to a primitive on ${source}`];
    }
    return [];
}

function validateNotANumber(input: Value, errors: ErrorMessage[]): void {
    if (typeof input === "number"|| /^\d+$/.test(`${input}`)) {
        errors.push(`Input '${input}' should not be a number, but is.`)
    }
}