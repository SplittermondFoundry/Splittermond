import { ErrorMessage, Value } from "./index";
import { foundryApi } from "module/api/foundryApi";
import { PropertyResolver } from "module/modifiers/util";

export function validateAllInputConsumed(
    modifier: string,
    pathMatch: null | RegExpMatchArray,
    attributeMatch: string[],
    valueMatch: RegExpMatchArray | null
): boolean {
    let valueMatchReplacer = valueMatch ? valueMatch[0].replace("+", "\\+").replace("$", "\\$") : "";
    let unconsumed = modifier
        .replace(pathMatch ? pathMatch[0] : "", "")
        .trim()
        .replace(new RegExp(`${valueMatchReplacer}(?=\\s*$)`), "")
        .trim();
    attributeMatch.forEach((attribute) => {
        unconsumed = unconsumed.replace(attribute, "").trim();
    });
    return unconsumed.trim() == "";
}

export function validateDescriptors(value: Value): ErrorMessage[] {
    const errors: ErrorMessage[] = [];
    validateNotANumber(value, errors);
    validateNotAnExpression(value, errors);

    return errors;
}

export function validateKeys(key: string): ErrorMessage[] {
    const errors: ErrorMessage[] = [];
    if (/\$\{.*}/.test(key)) {
        errors.push(foundryApi.localize("splittermond.modifiers.parseMessages.keyHasExpressionFormat"));
    }
    validateNotANumber(key, errors);
    return errors;
}

export function validateReference(propertyPath: string, source: object): ErrorMessage[] {
    const resolvedProperty = new PropertyResolver().resolve(propertyPath, source);
    if (!["string", "number", "boolean"].includes(typeof resolvedProperty) && resolvedProperty !== null) {
        const objectName = hasName(source)
            ? source.name
            : hasId(source)
              ? source.id
              : foundryApi.localize("splittermond.modifiers.parseMessages.unknownObject");
        return [
            foundryApi.format("splittermond.modifiers.parseMessages.referenceNotPrimitive", {
                propertyPath,
                objectName,
            }),
        ];
    }
    return [];
}

function validateNotANumber(input: Value, errors: ErrorMessage[]): void {
    if (typeof input === "number" || /^\d+$/.test(`${input}`)) {
        errors.push(
            foundryApi.format("splittermond.modifiers.parseMessages.shouldNotBeANumber", { input: `${input}` })
        );
    }
}

function validateNotAnExpression(input: Value, errors: ErrorMessage[]): void {
    if (typeof input === "object") {
        errors.push(
            foundryApi.format("splittermond.modifiers.parseMessages.shouldNotBeAnExpression", { input: `${input}` })
        );
    }
}

function hasName(source: object): source is { name: string } {
    return "name" in source && typeof source.name === "string";
}
function hasId(source: object): source is { id: string } {
    return "id" in source && typeof source.id === "string";
}
