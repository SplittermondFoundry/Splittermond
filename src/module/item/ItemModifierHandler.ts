import type { ScalarModifier, Value } from "../modifiers/parsing";
import Modifier from "module/modifiers/impl/modifier";
import { normalizeDescriptor } from "../modifiers/parsing/normalizer";
import { splittermond } from "../config";
import type SplittermondItem from "./item";
import {
    type IModifier,
    makeConfig,
    type ModifierAttributes,
    ModifierHandler,
    type ModifierType,
} from "module/modifiers";
import { type Expression, isZero, pow, times } from "module/modifiers/expressions/scalar";
import { type TimeUnit } from "module/config/timeUnits";
import { isMember } from "module/util/util";

type ValidMapper = Parameters<ReturnType<typeof normalizeDescriptor>["usingMappers"]>[0];

export class ItemModifierHandler extends ModifierHandler<ScalarModifier> {
    constructor(
        logErrors: (...message: string[]) => void,
        private readonly sourceItem: SplittermondItem,
        private readonly modifierType: ModifierType,
        private readonly multiplier: Expression
    ) {
        super(logErrors, ItemModifierHandler.config);
    }

    static config = makeConfig({
        topLevelPath: "item",
        subSegments: {
            damage: {
                optionalAttributes: ["item", "damageType", "itemType", "features", "skill"],
            },
            weaponspeed: {
                optionalAttributes: ["item", "itemType", "skill"],
            },
            mergeFeature: {
                requiredAttributes: ["feature"],
                optionalAttributes: ["item", "itemType", "skill"],
            },
            addFeature: {
                requiredAttributes: ["feature"],
                optionalAttributes: ["item", "itemType", "skill"],
            },
            castDuration: {
                requiredAttributes: ["unit"],
                optionalAttributes: ["item", "itemType", "skill"],
                subSegments: {
                    multiplier: {
                        optionalAttributes: ["item", "itemType", "skill"],
                    },
                },
            },
        },
    });

    protected omitForValue(value: Expression): boolean {
        return isZero(value);
    }

    protected buildModifier(modifier: ScalarModifier): IModifier | null {
        const normalizedAttributes = this.buildAttributes(modifier.path, modifier.attributes);
        const operator = modifier.path.endsWith("multiplier") ? pow : times;
        const adjustedValue = operator(modifier.value, this.multiplier);

        return new Modifier(modifier.path, adjustedValue, normalizedAttributes, this.sourceItem, false);
    }

    buildAttributes(path: string, attributes: Record<string, Value>): ModifierAttributes {
        const normalizedAttributes: ModifierAttributes = {
            name: this.sourceItem.name,
            type: this.modifierType,
        };
        for (const attribute in attributes) {
            normalizedAttributes[attribute] = this.mapAttribute(path, attribute, attributes[attribute]);
        }
        return normalizedAttributes;
    }

    mapAttribute(path: string, attribute: string, value: Value): string | undefined {
        switch (attribute) {
            case "name":
                return this.validatedAttribute(value);
            case "damageType":
                return this.normalizeDamageType(path, value);
            case "itemType":
                return this.normalizeItemType(path, value);
            case "unit":
                return this.normalizeUnit(path, value);
            case "skill":
                return this.normalizeSkill(path, value);
            default:
                return this.validatedAttribute(value);
        }
    }

    validatedAttribute(value: Value | undefined): string | undefined {
        if (value === null || value === undefined || !this.validateDescriptor(value)) {
            return undefined;
        }
        return value;
    }

    normalizeAttribute(value: Value | undefined, mapper: ValidMapper): string | undefined {
        const validated = this.validatedAttribute(value);
        return validated ? normalizeDescriptor(validated).usingMappers(mapper).do() : validated;
    }

    normalizeDamageType(path: string, damageType: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(damageType, "damageTypes");
        if (!normalized) {
            return undefined;
        } else if (!isMember(splittermond.damageTypes, normalized)) {
            this.reportInvalidDescriptor(path, "damageType", normalized);
            return undefined;
        } else {
            return normalized;
        }
    }

    normalizeItemType(path: string, itemType: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(itemType, "itemTypes");
        if (!normalized) {
            return undefined;
        } else if (!isMember(splittermond.itemTypes.all, normalized)) {
            this.reportInvalidDescriptor(path, "itemType", normalized);
            return normalized;
        } else {
            return normalized;
        }
    }

    normalizeSkill(path: string, skill: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(skill, "skills");
        if (!normalized) {
            return undefined;
        } else if (!isMember(splittermond.skillGroups.all, normalized)) {
            this.reportInvalidDescriptor(path, "skill", normalized);
            return normalized;
        } else {
            return normalized;
        }
    }

    normalizeUnit(path: string, unit: Value | undefined): TimeUnit | undefined {
        const validated = this.validatedAttribute(unit);
        if (!validated) {
            return undefined;
        } else if (validated.toLowerCase().startsWith("t")) {
            return "T";
        } else if (validated.toLowerCase().startsWith("min")) {
            return "min";
        } else {
            this.reportInvalidDescriptor(path, "unit", validated);
            return undefined;
        }
    }
}
