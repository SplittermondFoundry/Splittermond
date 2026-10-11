import { buildModifier, type ModifierInput } from "./buildModifier";
import type { ModifierDefinition } from "./catalogue";
import { featureAdjustment } from "./featureImprovementRules";

export interface FeatureAdjustmentInput {
    enabled: boolean;
    attributes: Record<string, string>;
}

export function defaultFeatureAdjustment(multiple: boolean): FeatureAdjustmentInput {
    return { enabled: multiple, attributes: { currentLevel: "0", die: "6" } };
}

export function featureAdjustmentDefinition(
    feature: string,
    definitions: readonly ModifierDefinition[]
): ModifierDefinition | undefined {
    const adjustment = featureAdjustment(feature);
    const path =
        adjustment &&
        {
            feature: "item.addFeature",
            sharpness: "item.mergeFeature",
            speed: "item.weaponspeed",
            handicap: "handicap",
            skill: "actor.skills",
            resistance: "resistance",
            manual: "",
        }[adjustment.kind];
    const definition = definitions.find((entry) => entry.path.toLowerCase() === path?.toLowerCase());
    if (!definition) return undefined;
    return adjustment?.kind === "skill" ? { ...definition, requiredAttributes: ["skill", "emphasis"] } : definition;
}

export function buildFeatureAdjustment(
    featureInput: ModifierInput,
    input: FeatureAdjustmentInput,
    definitions: readonly ModifierDefinition[],
    onError: (attribute: string, messageKey: string) => void = () => {}
): string | null {
    const adjustment = featureAdjustment(featureInput.attributes.feature);
    const definition = featureAdjustmentDefinition(featureInput.attributes.feature, definitions);
    if (!adjustment || adjustment.kind === "manual" || !input.enabled) return "";
    if (!definition) {
        onError("enabled", "splittermond.modifierHelper.adjustments.unavailable");
        return null;
    }
    const count = adjustment.countMax ? Number(featureInput.value) : 1;
    const attributes: Record<string, string> = {};
    let value = count;
    if (["feature", "sharpness", "speed"].includes(adjustment.kind)) {
        for (const key of ["item", "itemType", "skill"]) attributes[key] = featureInput.attributes[key] ?? "";
        if (adjustment.target) attributes.feature = adjustment.target;
        value = adjustment.kind === "speed" ? -1 : count * (adjustment.increment ?? 1);
    }
    if (adjustment.kind === "sharpness") {
        const current = Number(input.attributes.currentLevel);
        const die = Number(input.attributes.die);
        if (
            !input.attributes.currentLevel?.trim() ||
            !Number.isInteger(current) ||
            current < 0 ||
            ![6, 10].includes(die) ||
            current >= die / 2
        ) {
            onError("currentLevel", "splittermond.modifierHelper.adjustments.sharpnessLimit");
            return null;
        }
        // Merges are applied before additions. An add(+1) + merge(2) pair would incorrectly yield at least 3.
        value = Math.max(2, current + 1);
    }
    if (adjustment.kind === "skill") {
        attributes.skill = input.attributes.skill ?? "";
        attributes.emphasis = input.attributes.emphasis ?? "";
    }
    if (adjustment.kind === "resistance") attributes.damageType = input.attributes.damageType ?? "";
    return buildModifier(definition, { value: String(value), attributes }, onError);
}
