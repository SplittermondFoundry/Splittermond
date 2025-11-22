import type { ScalarModifier, Value } from "../modifiers/parsing";
import Modifier from "module/modifiers/impl/modifier";
import { splittermond } from "../config";
import type SplittermondItem from "./item";
import { type IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import { type Expression, isZero, pow, times } from "module/modifiers/expressions/scalar";
import { type TimeUnit } from "module/config/timeUnits";
import { isMember } from "module/util/util";
import { ByAttributeHandler } from "module/modifiers/impl/ByAttributeHandler";

export class ItemModifierHandler extends ByAttributeHandler(ModifierHandler<ScalarModifier>) {
    constructor(
        logErrors: (...message: string[]) => void,
        sourceItem: SplittermondItem,
        modifierType: ModifierType,
        private readonly multiplier: Expression
    ) {
        super(logErrors, ItemModifierHandler.config, sourceItem, modifierType);
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

    protected buildModifier(modifier: ScalarModifier): IModifier[] {
        const normalizedAttributes = this.buildAttributes(modifier.path, modifier.attributes);
        const operator = modifier.path.endsWith("multiplier") ? pow : times;
        const adjustedValue = operator(modifier.value, this.multiplier);

        return [new Modifier(modifier.path, adjustedValue, normalizedAttributes, this.sourceItem, false)];
    }

    mapAttribute(path: string, attribute: string, value: Value): string | undefined {
        switch (attribute) {
            case "name":
                return this.commonNormalizers.validatedAttribute(value);
            case "damageType":
                return this.normalizeDamageType(path, value);
            case "itemType":
                return this.normalizeItemType(path, value);
            case "unit":
                return this.normalizeUnit(path, value);
            case "skill":
                return this.commonNormalizers.normalizeSkill(path, value);
            default:
                return this.commonNormalizers.validatedAttribute(value);
        }
    }

    normalizeDamageType(path: string, damageType: Value | undefined): string | undefined {
        const normalized = this.commonNormalizers.normalizeAttribute(damageType, "damageTypes");
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
        const normalized = this.commonNormalizers.normalizeAttribute(itemType, "itemTypes");
        if (!normalized) {
            return undefined;
        } else if (!isMember(splittermond.itemTypes.all, normalized)) {
            this.reportInvalidDescriptor(path, "itemType", normalized);
            return normalized;
        } else {
            return normalized;
        }
    }

    normalizeUnit(path: string, unit: Value | undefined): TimeUnit | undefined {
        const validated = this.commonNormalizers.validatedAttribute(unit);
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
