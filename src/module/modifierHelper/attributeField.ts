import { foundryApi } from "module/api/foundryApi";
import { leveledItemFeatures } from "module/config/itemFeatures";
import { skillGroups } from "module/config/skillGroups";
import { allowsCustomAttribute, attributeChoices, type ModifierDefinition } from "./catalogue";
import type { ModifierHelperField } from "./templateInterface";
import { isUnscaledFeature } from "./featureValue";
import { isFeatureAvailable, type FeatureTarget } from "./featureChoices";

export function attributeField(
    definition: ModifierDefinition,
    key: string,
    value: string,
    listId: string,
    target?: FeatureTarget
): ModifierHelperField {
    const choices = attributeChoices(definition, key)
        .filter(({ value: choice }) => key !== "feature" || isFeatureAvailable(choice, target?.type))
        .map(({ value: choice, label }) => ({
            value: choice,
            label:
                ["feature", "features"].includes(key) && leveledItemFeatures.some((feature) => feature === choice)
                    ? `${foundryApi.localize(label)} [${foundryApi.localize("splittermond.modifierHelper.featureLevel")}]`
                    : foundryApi.localize(label),
            selected: value === choice,
        }));
    // Existing modifiers may use translated values or values supplied by an extension.
    if (value && choices.length && !allowsCustomAttribute(key) && !choices.some((choice) => choice.selected)) {
        choices.push({ value, label: value, selected: true });
    }
    const presentation = definition.helperAttributes?.[key];
    if (key === "skill" && presentation?.groupChoices === false)
        choices.sort((a, b) => a.label.localeCompare(b.label, "de"));
    const hintKey =
        presentation?.hint ??
        (definition.pathSelection?.attribute === key
            ? "splittermond.modifierHelper.pathDamageType"
            : `splittermond.modifierHelper.attributes.${key}`);
    const hint = foundryApi.localize(hintKey);
    const labelKey = presentation?.label ?? `splittermond.modifiers.keys.${key}`;
    const label = foundryApi.localize(labelKey);
    const choiceGroups =
        key === "skill" && presentation?.groupChoices !== false
            ? (["general", "fighting", "magic"] as const).map((category) => ({
                  category,
                  label: `splittermond.modifierHelper.categories.${category}`,
                  choices: choices
                      .filter((choice) => skillGroups[category].some((skill) => skill === choice.value))
                      .sort((a, b) => a.label.localeCompare(b.label, "de")),
              }))
            : [];
    return {
        key,
        label: label === labelKey ? key : label,
        hint: hint === hintKey ? "" : hint,
        required: definition.requiredAttributes.includes(key),
        value,
        select: choices.length > 0 && !allowsCustomAttribute(key),
        searchable: ["feature", "skill"].includes(key) && choices.length > 0,
        isFeature: key === "feature",
        valueAfter: key === "feature" && definition.requiresValue,
        suggestions: key === "features" && choices.length > 0,
        choiceLabel:
            choices.find((choice) => choice.selected)?.label ??
            foundryApi.localize("splittermond.modifierHelper.unspecified"),
        wide:
            ["item", "features", "emphasis"].includes(key) ||
            (key === "feature" && isUnscaledFeature(definition, value)),
        listId,
        choices,
        choiceGroups,
        ungroupedChoices: choices.filter((choice) => !choiceGroups.some((group) => group.choices.includes(choice))),
        noResults:
            key === "skill"
                ? "splittermond.modifierHelper.noSkillResults"
                : "splittermond.modifierHelper.noFeatureResults",
    };
}
