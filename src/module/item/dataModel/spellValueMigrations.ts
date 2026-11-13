import { hasKey } from "./migrations";
import { spellVariantProperties, type SpellVariantProperty } from "./SpellValueVariants";

export function from14_3_1_migrateSpellVariants(source: unknown): unknown {
    if (!source || typeof source !== "object") return source;
    const legacyEnhanced = hasKey(source, "enhanced") ? source.enhanced : undefined;
    for (const key of spellVariantProperties) {
        if (hasKey(source, key)) {
            const value = source[key];
            if (isLegacyValue(key, value)) {
                Reflect.set(source, key, { base: isType(key) && value === null ? "none" : value });
            }
        }
        if (!hasKey(legacyEnhanced, key)) continue;
        const current = hasKey(source, key) ? source[key] : {};
        if (hasKey(current, "enhanced")) continue;
        const enhanced = migrateOverride(key, legacyEnhanced[key]);
        Reflect.set(source, key, { ...(typeof current === "object" ? current : {}), enhanced });
    }
    if (hasKey(source, "enhanced")) delete source.enhanced;
    return source;
}

function isLegacyValue(key: SpellVariantProperty, value: unknown): boolean {
    if (hasKey(value, "base") || hasKey(value, "enhanced")) return false;
    return (
        value === null ||
        typeof value !== "object" ||
        (key === "damage" && hasKey(value, "stringInput")) ||
        (key === "features" && hasKey(value, "internalFeatureList"))
    );
}

function migrateOverride(key: SpellVariantProperty, value: unknown): unknown {
    if (key === "damage" || key === "features") return value;
    if (hasKey(value, "value")) return isType(key) && value.value === null ? "none" : value.value;
    // Empty strings in the first preview represented inheritance, unlike wrapped empty overrides.
    return value === "" ? null : value;
}

function isType(key: SpellVariantProperty): boolean {
    return key === "damageType" || key === "costType";
}
