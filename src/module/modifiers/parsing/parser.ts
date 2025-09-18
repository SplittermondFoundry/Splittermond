import { ErrorMessage, ParsedModifier, Value } from "./index";
import { normalizeKey } from "./normalizer";
import { validateAllInputConsumed, validateKeys } from "./validators";
import { foundryApi } from "module/api/foundryApi";

type SingleParseResult = ParsedModifier | ErrorMessage;
type AttributeParseResult = { key: string; value: Value } | ErrorMessage;

interface ParseResult {
    modifiers: ParsedModifier[];
    errors: ErrorMessage[];
}

export function parseModifiers(modifiers: string | null | undefined): ParseResult {
    if (!modifiers) {
        return { modifiers: [], errors: [] };
    }
    const parsedModifiers = splitModifiers(modifiers)
        .map((m) => m.trim())
        .filter((m) => !!m)
        .map(parseModifier);
    return {
        modifiers: parsedModifiers.filter((m) => typeof m !== "string"),
        errors: parsedModifiers.filter((m) => typeof m == "string"),
    };
}

function splitModifiers(modifiers: string): string[] {
    const splitModifiers = [];
    let mode: "TOP" | "ATTRIBUTE" = "TOP";
    let currentDelimiter = null;
    for (let i = 0; i < modifiers.length; i++) {
        const char = modifiers.charAt(i);
        if (mode === "TOP" && ["'", '"'].includes(char)) {
            mode = "ATTRIBUTE";
            currentDelimiter = char;
        } else if (mode === "ATTRIBUTE" && char === currentDelimiter) {
            mode = "TOP";
            currentDelimiter = null;
        } else if (char === "," && mode === "TOP") {
            splitModifiers.push(modifiers.substring(0, i).trim());
            modifiers = modifiers.substring(i + 1).trim();
            i = -1;
        }
    }
    splitModifiers.push(modifiers);
    return splitModifiers;
}

function parseModifier(modifier: string): SingleParseResult {
    const pathPattern = /^\S+(?=\s)/;
    const valuePattern = /(?<=\s)([^\s=}"']|\${[^}]+})+(?=$)/;
    const pathMatch = pathPattern.exec(modifier);
    const attributeMatch = findAttributes(modifier);
    const valueMatch = valuePattern.exec(modifier);
    const allInputConsumed = validateAllInputConsumed(modifier, pathMatch, attributeMatch, valueMatch);
    if (!allInputConsumed || !pathMatch || !(attributeMatch.length > 0 || valueMatch)) {
        return foundryApi.format("splittermond.modifiers.parseMessages.notAModifier", { modifier });
    }

    const parseResult = parsePath(pathMatch[0]);

    const attributeParseResult = parseAttributes(attributeMatch);
    if (typeof attributeParseResult === "string") {
        return attributeParseResult;
    }
    if (parseResult.attributes.emphasis && attributeParseResult.emphasis) {
        return foundryApi.format("splittermond.modifiers.parseMessages.duplicateEmphasis", { modifier });
    }
    parseResult.attributes = { ...parseResult.attributes, ...attributeParseResult };

    const value = valueMatch ? parseValue(valueMatch[0]) : null;
    if (isSet(value) && isSet(attributeParseResult.value)) {
        return foundryApi.format("splittermond.modifiers.parseMessages.duplicateValue", { modifier });
    } else if (!isSet(value) && !isSet(attributeParseResult.value)) {
        return foundryApi.format("splittermond.modifiers.parseMessages.noValue", { modifier });
    } else if (isSet(value)) {
        parseResult.attributes.value = value;
    }
    return parseResult;
}

function isSet(value: unknown) {
    return value !== null && value !== undefined;
}

function findAttributes(modifier: string): string[] {
    const attributePattern = /(?<=\s)[^\s=]+=(?:"[^="]+"|'[^=']+'|[^\s=]*\${[^}=]+}[^\s=]*|[^\s'"=]+)(?=\s|$)/g;
    const attributeMatches = [];
    let match;
    while ((match = attributePattern.exec(modifier)) !== null) {
        attributeMatches.push(match[0]);
    }
    return attributeMatches;
}

function parsePath(path: string): ParsedModifier {
    const pathAndEmphasis = path.split("/");
    return {
        path: pathAndEmphasis[0],
        attributes: { ...(pathAndEmphasis?.[1] ? { emphasis: pathAndEmphasis?.[1] } : {}) },
    };
}

function parseAttributes(attributeMatches: string[]): Record<string, Value> | ErrorMessage {
    const errors: string[] = [];
    const attributes: Record<string, Value> = {};
    for (const attribute of attributeMatches) {
        const parseResult = parseAttribute(attribute.trim());
        if (typeof parseResult == "string") {
            errors.push(parseResult);
            continue;
        }
        if (parseResult.key in attributes) {
            errors.push(
                foundryApi.format("splittermond.modifiers.parseMessages.duplicateAttribute", {
                    attribute: parseResult.key,
                })
            );
        } else {
            const attributeErrors = [...validateKeys(parseResult.key)];
            if (attributeErrors.length > 0) {
                errors.push(...attributeErrors);
            } else {
                attributes[parseResult.key] = parseResult.value;
            }
        }
    }
    return errors.length == 0 ? attributes : errors.join("\n");
}

function parseAttribute(attribute: string): AttributeParseResult {
    const keyMatch = /\S+(?==)/.exec(attribute);
    const valueMatch = /(?<==).+/.exec(attribute);
    if (!keyMatch) {
        return foundryApi.format("splittermond.modifiers.parseMessages.noAttributeKey", { attribute });
    }
    if (!valueMatch) {
        return foundryApi.format("splittermond.modifiers.parseMessages.noAttributeValue", { attribute });
    }
    const validationFailure = validateKeys(keyMatch[0]);
    if (validationFailure.length > 0) {
        return foundryApi.format("splittermond.modifiers.parseMessages.invalidAttributeKey", { attribute });
    }
    const value = parseValue(valueMatch[0]);
    //Only normalize keys here. We don't have enough information to reliably normalize values here.
    const normalizedKey = normalizeKey(keyMatch[0]);
    return { key: normalizedKey, value };
}

function parseValue(value: string) {
    const valueExpressionPattern = /(?<=\$\{)[^}]+(?=})/;
    const numberPattern = /(?<=["']|^)[+-]?\d+(?=["']|$)/;
    const quotedStringPattern = /(?<=["']).*(?=["'])/;
    if (valueExpressionPattern.test(value)) {
        const sign: 1 | -1 = /-(?=\s*\$\{)/.test(value) ? -1 : 1;
        const parsedValue = valueExpressionPattern.exec(value)![0];
        return { propertyPath: parsedValue, sign, original: parsedValue };
    } else if (numberPattern.test(value)) {
        return parseFloat(numberPattern.exec(value)![0]);
    } else if (quotedStringPattern.test(value)) {
        return quotedStringPattern.exec(value)![0];
    } else if (isRoll(value.replace(/[Ww]/g, "d"))) {
        return foundryApi.roll(value.replace(/[Ww]/g, "d"));
    } else {
        return value;
    }
}

function isRoll(value: string): boolean {
    return foundryApi.rollInfra.validate(value);
}
