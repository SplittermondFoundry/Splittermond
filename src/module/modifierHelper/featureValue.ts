import { itemFeatures, leveledItemFeatures } from "module/config/itemFeatures";
import { featureAdjustment } from "./featureImprovementRules";
import type { ModifierDefinition } from "./catalogue";

export function isUnscaledFeature(definition: ModifierDefinition | undefined, feature: string | undefined): boolean {
    if (!definition || !/^item\.(addFeature|mergeFeature)$/i.test(definition.path)) return false;
    const name = itemFeatures.find((name) => name.toLowerCase() === feature?.trim().toLowerCase());
    return name !== undefined && !leveledItemFeatures.includes(name) && !featureAdjustment(name)?.countMax;
}
