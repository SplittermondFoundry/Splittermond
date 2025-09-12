import type {ScalarModifier, Value} from "../modifiers/parsing";
import Modifier from "../actor/modifier";
import {normalizeDescriptor} from "../modifiers/parsing/normalizer";
import {splittermond} from "../config";
import type SplittermondItem from "./item";
import type {IModifier, ModifierAttributes, ModifierType} from "../actor/modifier-manager";
import {ModifierHandler} from "module/modifiers/ModiferHandler";
import {Expression, isZero} from "module/modifiers/expressions/scalar";
import {makeConfig} from "module/modifiers/ModifierConfig";


type ValidMapper = Parameters<ReturnType<typeof normalizeDescriptor>["usingMappers"]>[0];

export class ItemModifierHandler extends ModifierHandler {
    constructor(
        logErrors: (...message: string[]) => void,
        private readonly sourceItem: SplittermondItem,
        private readonly modifierType: ModifierType
    ) {
        super(logErrors, ItemModifierHandler.config)
    }

    static config = makeConfig({
        topLevelPath: "item",
        subSegments: {
            damage: {
                optionalAttributes: ["item", "damageType", "itemType"]
            },
            weaponspeed: {
                optionalAttributes: ["item", "itemType"]
            },
            mergeFeature: {
                optionalAttributes: ["item", "itemType"]
            },
            addFeature: {
                optionalAttributes: ["item", "itemType"]
            }
        }
    })

    protected omitForValue(value: Expression): boolean {
        return isZero(value)
    }

    protected buildModifier(modifier: ScalarModifier): IModifier | null {
        const normalizedAttributes = this.buildAttributes(modifier.path, modifier.attributes);

        return new Modifier(modifier.path, modifier.value, normalizedAttributes, this.sourceItem, false);
    }

    buildAttributes(path: string, attributes: Record<string, Value>): ModifierAttributes {
        const normalizedAttributes: ModifierAttributes = {
            name: this.sourceItem.name,
            type: this.modifierType
        }
        for (const attribute in attributes) {
            normalizedAttributes[attribute] = this.mapAttribute(path, attribute, attributes[attribute]);
        }
        return normalizedAttributes
    }

    mapAttribute(path:string, attribute: string, value: Value): string | undefined {
        switch (attribute) {
            case "name":
                return this.validatedAttribute(value);
            case "damageType":
                return this.normalizeDamageType(path, value);
            case "itemType":
                return this.normalizeItemType(path, value);
            default:
                return this.validatedAttribute(value);
        }
    }

    validatedAttribute(value: Value | undefined):
        string | undefined {
        if (value === null || value === undefined || !this.validateDescriptor(value)) {
            return undefined;
        }
        return value;
    }

    normalizeAttribute(value: Value | undefined, mapper: ValidMapper):
        string | undefined {
        const validated = this.validatedAttribute(value);
        return validated ? normalizeDescriptor(validated).usingMappers(mapper).do() : validated;
    }

    normalizeDamageType(path: string, damageType: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(damageType, "damageTypes");
        if (!normalized) {
            return undefined;
        } else if (!(splittermond.damageTypes as Readonly<string[]>).includes(normalized)) {
            this.reportInvalidDescriptor(path, "damageType", normalized);
            return undefined;
        } else {
            return normalized;
        }
    }

    normalizeItemType(path: string, itemType: Value | undefined):
        string | undefined {
        const normalized = this.normalizeAttribute(itemType, "itemTypes");
        if (!normalized) {
            return undefined;
        } else if (!(splittermond.itemTypes as Readonly<string[]>).includes(normalized)) {
            this.reportInvalidDescriptor(path, "itemType", normalized);
            return normalized;
        } else {
            return normalized;
        }
    }
}