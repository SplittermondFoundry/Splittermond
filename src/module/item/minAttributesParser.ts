import { splittermond } from "module/config";
import { foundryApi } from "module/api/foundryApi";

export interface ParsedMinAttribute {
    attr: string;
    threshold: number;
}

/**
 * Parse a `minAttributes` string (e.g. `"BE 13, GE 12"`) into a list of canonical
 * attribute keys with numeric thresholds. The user-typed token is matched against the
 * localized short/long forms; the OUTPUT is language-independent (canonical key +
 * threshold). Used by the shield's runtime `attributeMalus` getter and by the
 * property-effect builder (which constructs live `ReferenceExpression`s per entry).
 */
export function parseShieldMinAttributes(minAttributes: string | null | undefined): ParsedMinAttribute[] {
    const result: ParsedMinAttribute[] = [];
    (minAttributes || "").split(",").forEach((aStr) => {
        const temp = aStr.match(/([^ ]+)\s+([0-9]+)/);
        if (!temp) return;
        const attr = splittermond.attributes.find((a) => {
            return (
                temp[1].toLowerCase() === foundryApi.localize(`splittermond.attribute.${a}.short`).toLowerCase() ||
                temp[1].toLowerCase() === foundryApi.localize(`splittermond.attribute.${a}.long`).toLowerCase()
            );
        });
        if (attr) {
            result.push({ attr, threshold: parseInt(temp[2] || "0", 10) });
        }
    });
    return result;
}
