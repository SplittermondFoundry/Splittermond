import { attributeField } from "./attributeField";
import { featureAdjustmentDefinition, type FeatureAdjustmentInput } from "./featureAdjustments";
import { featureAdjustment } from "./featureImprovementRules";
import type { ModifierDefinition } from "./catalogue";
import type { FeatureAdjustmentContext } from "./templateInterface";
import type { FeatureTarget } from "./featureChoices";

export function featureAdjustmentContext(
    feature: string | undefined,
    input: FeatureAdjustmentInput,
    definitions: readonly ModifierDefinition[],
    id: string,
    rowId: string,
    multiple: boolean,
    target?: FeatureTarget
): FeatureAdjustmentContext | undefined {
    const adjustment = featureAdjustment(feature);
    if (!adjustment) return undefined;
    const definition = featureAdjustmentDefinition(feature!, definitions);
    const keys =
        adjustment.kind === "skill" ? ["skill", "emphasis"] : adjustment.kind === "resistance" ? ["damageType"] : [];
    return {
        id,
        rowId,
        hint: adjustment.hint
            ? `splittermond.modifierHelper.adjustments.${adjustment.hint === "defensive" && target?.type === "shield" ? "defensiveShield" : adjustment.hint}`
            : "",
        target: definition?.path ?? "",
        automatic: adjustment.kind !== "manual",
        single: !multiple,
        enabled: input.enabled,
        fields:
            multiple && definition
                ? keys.map((key) => {
                      const field = attributeField(definition, key, input.attributes[key] ?? "", `${id}-${key}`);
                      field.hint = "";
                      field.wide = false;
                      return field;
                  })
                : [],
        sharpness: multiple && adjustment.kind === "sharpness",
        currentLevel: input.attributes.currentLevel ?? "0",
        die: input.attributes.die ?? "6",
        errorId: `${id}-enabled-error`,
    };
}

export function featureValueContext(feature: string | undefined, value = "") {
    const adjustment = featureAdjustment(feature);
    const normalizedValue = value && Number.isFinite(Number(value)) ? String(Number(value)) : value;
    const valueChoices = adjustment?.countMax
        ? Array.from({ length: adjustment.countMax }, (_, index) => {
              const choice = String(index + 1);
              return { value: choice, label: choice, selected: choice === normalizedValue };
          })
        : [];
    return {
        valueChoices,
        unsupportedValue: !!valueChoices.length && !!value && !valueChoices.some((choice) => choice.selected),
        valueLabel: adjustment?.countMax
            ? "splittermond.modifierHelper.adjustments.count"
            : "splittermond.modifiers.keys.value",
    };
}
