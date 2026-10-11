import { parseModifiers } from "module/modifiers/parsing";
import type { ModifierDefinition } from "./catalogue";
import { isRoll } from "module/api/Roll";
import { normalizeValue } from "module/modifiers/parsing/normalizer";
import { parseCostString } from "module/util/costs/costParser";
import { foundryApi } from "module/api/foundryApi";
import { isUnscaledFeature } from "./featureValue";

export interface ModifierInput {
    value: string;
    attributes: Record<string, string>;
}

export function buildModifier(
    definition: ModifierDefinition,
    input: ModifierInput,
    onError: (attribute: string, messageKey: string) => void = () => {}
): string | null {
    const invalid = (attribute: string, reason: string) => {
        onError(attribute, `splittermond.modifierHelper.errors.${reason}`);
        return null;
    };
    if (definition.pathSelection) {
        const { attribute, variants } = definition.pathSelection;
        const variant = variants.find((entry) => entry.value === input.attributes[attribute]);
        if (!variant) return invalid(attribute, "required");
        const attributes = { ...input.attributes };
        delete attributes[attribute];
        return buildModifier(variant.definition, { ...input, attributes }, onError);
    }
    const fragments = [definition.path];
    const keys = [...new Set([...definition.requiredAttributes, ...definition.optionalAttributes])];
    for (const key of keys) {
        const value = input.attributes[key]?.trim() ?? "";
        if (!value) {
            if (definition.requiredAttributes.includes(key)) return invalid(key, "required");
            continue;
        }
        const quoted = quoteAttribute(value);
        if (!quoted) return invalid(key, "attributeSyntax");
        fragments.push(`${key}=${quoted}`);
    }
    if (definition.requiresValue) {
        // Feature modifiers need a positive value internally, including features without a level.
        const value = isUnscaledFeature(definition, input.attributes.feature) ? "1" : input.value.trim();
        if (!value) return invalid("value", "required");
        if (/[=,\r\n]/.test(value)) return invalid("value", "valueSyntax");
        const numeric = Number(value);
        if (
            /^item\.(addFeature|mergeFeature)$/i.test(definition.path) &&
            Number.isFinite(numeric) &&
            (!Number.isInteger(numeric) || numeric <= 0)
        )
            return invalid("value", "featureLevel");
        const normalizedValue = Number.isFinite(numeric) ? String(numeric) : value;
        if (
            definition.valueChoices?.length &&
            !definition.valueChoices.some((choice) => choice.value === normalizedValue)
        )
            return invalid("value", "valueChoice");
        const explicitSign = !definition.cost && !definition.path.toLowerCase().endsWith(".multiplier") && numeric >= 0;
        const compactValue = value.replace(/\s+/g, "");
        const rollValue =
            /\s/.test(value) && foundryApi.rollInfra.validate(value.replace(/[Ww]/g, "d")) ? compactValue : value;
        fragments.push(Number.isFinite(numeric) ? `${explicitSign ? "+" : ""}${numeric}` : rollValue);
    }
    const result = fragments.join(" ");
    const parsed = parseModifiers(result);
    if (parsed.errors.length || parsed.modifiers.length !== 1) return invalid("value", "valueSyntax");
    const modifier = parsed.modifiers[0];
    if (definition.cost && typeof modifier.attributes.value === "string") {
        const value = normalizeValue(modifier.attributes.value);
        // The cost parser represents malformed cost strings as zero instead of reporting an error.
        if (typeof value === "string" && parseCostString(value).toString() === "0")
            return invalid("value", "costSyntax");
    }
    const expectedKeys = keys.filter((key) => input.attributes[key]?.trim());
    if (definition.requiresValue) expectedKeys.push("value");
    if (Object.keys(modifier.attributes).length !== expectedKeys.length) return invalid("value", "valueSyntax");
    if (expectedKeys.some((key) => !(key in modifier.attributes))) return invalid("value", "valueSyntax");
    const invalidAttribute = keys.find(
        (key) => input.attributes[key]?.trim() && modifier.attributes[key] !== input.attributes[key].trim()
    );
    if (invalidAttribute) return invalid(invalidAttribute, "attributeSyntax");
    return result;
}

function quoteAttribute(value: string): string | null {
    if (value.includes("=") || /[\r\n]/.test(value)) return null;
    const quote = value.includes('"') ? "'" : '"';
    if (value.includes(quote)) return null;
    return `${quote}${value}${quote}`;
}

export function readModifierInput(
    raw: string,
    definitions: readonly ModifierDefinition[]
): { definition: ModifierDefinition; input: ModifierInput } | null {
    const parsed = parseModifiers(raw);
    if (parsed.errors.length || parsed.modifiers.length !== 1) return null;
    const modifier = parsed.modifiers[0];
    const pathMatches = (entry: ModifierDefinition) => entry.path.toLowerCase() === modifier.path.toLowerCase();
    const definition = definitions.find((entry) =>
        entry.pathSelection
            ? entry.pathSelection.variants.some((variant) => pathMatches(variant.definition))
            : pathMatches(entry)
    );
    if (!definition) return null;
    const attributes: Record<string, string> = {};
    if (definition.pathSelection) {
        const { attribute, variants } = definition.pathSelection;
        attributes[attribute] = variants.find((variant) => pathMatches(variant.definition))!.value;
    }
    let value = "";
    for (const [key, parsedValue] of Object.entries(modifier.attributes)) {
        const text =
            typeof parsedValue === "object"
                ? isRoll(parsedValue)
                    ? parsedValue.formula.replace(/\s+/g, "")
                    : `${parsedValue.sign < 0 ? "-" : ""}\${${parsedValue.propertyPath}}`
                : String(parsedValue);
        if (key === "value") value = text;
        else attributes[key] = text;
    }
    return { definition, input: { value, attributes } };
}
