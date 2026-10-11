import type { Config, ConfigSegment } from "module/modifiers/ModifierConfig";
import { modifierChoices, type ModifierChoice } from "module/modifiers/ModifierConfig";
import { attributes, derivedAttributes } from "module/config/attributes";
import { skillGroups } from "module/config/skillGroups";
import { damageTypes } from "module/config/damageTypes";
import { itemTypes } from "module/config/itemTypes";
import { time } from "module/config/timeUnits";
import { itemFeatures } from "module/config/itemFeatures";
import { foundryApi } from "module/api/foundryApi";
import { isFeatureAvailable } from "./featureChoices";

export interface ModifierDefinition extends ConfigSegment {
    path: string;
    cost: boolean;
    pathSelection?: { attribute: string; variants: (ModifierChoice & { definition: ModifierDefinition })[] };
}

export function modifierCatalogue(
    scalarConfigs: readonly Config[],
    costConfigs: readonly Config[]
): ModifierDefinition[] {
    const definitions = new Map<string, ModifierDefinition>();
    function visit(path: string, segment: ConfigSegment, cost: boolean, inheritedAlias?: string) {
        const helperAlias = segment.helperAlias ?? inheritedAlias;
        if (!segment.hideInHelper)
            definitions.set(path.toLowerCase(), {
                ...segment,
                path,
                cost,
                helperAlias,
                optionalAttributes: segment.optionalAttributes.filter(
                    (key) => segment.helperAttributes?.[key]?.hidden !== "always"
                ),
            });
        for (const [name, child] of Object.entries(segment.subSegments ?? {})) {
            visit(`${path}.${name}`, child, cost, helperAlias ? `${helperAlias}.${name}` : undefined);
        }
    }
    const bySpecificity = (a: Config, b: Config) => a.topLevelPath.split(".").length - b.topLevelPath.split(".").length;
    [...scalarConfigs].sort(bySpecificity).forEach((config) => visit(config.topLevelPath, config, false));
    [...costConfigs].sort(bySpecificity).forEach((config) => visit(config.topLevelPath, config, true));
    return groupDefinitions([...definitions.values()]);
}

function groupDefinitions(definitions: ModifierDefinition[]): ModifierDefinition[] {
    const result = new Map<string, ModifierDefinition>();
    for (const definition of definitions) {
        const group = definition.helperGroup;
        if (!group) {
            result.set(definition.path, definition);
            continue;
        }
        const grouped = result.get(group.path) ?? {
            ...definition,
            path: group.path,
            requiredAttributes: [group.attribute, ...definition.requiredAttributes],
            pathSelection: { attribute: group.attribute, variants: [] },
        };
        grouped.pathSelection!.variants.push({ ...group.choice, definition });
        result.set(group.path, grouped);
    }
    return [...result.values()];
}

export function modifierLabel(path: string): string {
    const slug = path.replace(/^actor\./, "").split(".")[0];
    if (skillGroups.all.some((skill) => skill === slug)) return foundryApi.localize(`splittermond.skillLabel.${slug}`);
    if (derivedAttributes.some((attribute) => attribute === slug)) {
        return foundryApi.localize(`splittermond.derivedAttribute.${slug}.long`);
    }
    return path;
}

export function modifierDescription(definition: ModifierDefinition): string {
    const description = definition.description;
    const key =
        description && foundryApi.localize(description) !== description
            ? description
            : "splittermond.modifierHelper.unknownDescription";
    return foundryApi.format(key, {
        target: modifierLabel(definition.path),
    });
}

export function attributeChoices(definition: ModifierDefinition, attribute: string): readonly ModifierChoice[] {
    if (definition.pathSelection?.attribute === attribute) return definition.pathSelection.variants;
    const configured = definition.attributeChoices?.[attribute];
    if (configured) return configured;
    switch (attribute) {
        case "skill":
            return modifierChoices(skillGroups.all, (value) => `splittermond.skillLabel.${value}`);
        case "attribute1":
        case "attribute2":
            return modifierChoices(attributes, (value) => `splittermond.attribute.${value}.long`);
        case "damageType":
            return modifierChoices(damageTypes, (value) => `splittermond.damageTypes.long.${value}`);
        case "itemType":
            return modifierChoices(itemTypes, (value) => `TYPES.Item.${value}`);
        case "defenseType":
            return modifierChoices(
                ["defense", "bodyresist", "mindresist"],
                (value) => `splittermond.derivedAttribute.${value}.long`
            );
        case "unit":
            return modifierChoices(time.timeUnits, (value) => `splittermond.modifierHelper.units.${value}`);
        case "feature":
        case "features":
            return modifierChoices(
                itemFeatures.filter((feature) => isFeatureAvailable(feature)),
                (value) => value
            );
        default:
            return [];
    }
}

export function allowsCustomAttribute(attribute: string): boolean {
    return attribute === "features";
}
