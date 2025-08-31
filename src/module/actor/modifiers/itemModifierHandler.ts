import type {ScalarModifier, Value} from "./parsing";
import Modifier, {type IModifier, type ModifierType} from "../modifier";
import {normalizeDescriptor} from "./parsing/normalizer";
import {splittermond} from "../../config";
import {foundryApi} from "../../api/foundryApi";
import type SplittermondItem from "../../item/item";
import {validateDescriptors} from "./parsing/validators";


type ValidMapper = Parameters<ReturnType<typeof normalizeDescriptor>["usingMappers"]>[0];

export class ModifierHandler {

    constructor(private readonly allErrors: string[]) {
    }

    reportMissingDescriptor(descriptorName: string, descriptorValue: string | undefined, itemName: string) {
        this.allErrors.push(foundryApi.format("splittermond.modifiers.parseMessages.unknownDescriptor", {
            descriptor: descriptorName,
            value: descriptorValue ?? "",
            itemName: itemName
        }));
    }

    validateDescriptor(value: Value): value is string {
        const errors = validateDescriptors(value);
        if (errors.length > 0) {
            this.allErrors.push(...errors);
            return false;
        }
        return true;
    }
}

export class ItemModifierHandler extends ModifierHandler {

    constructor(
        allErrors: string[],
        private readonly sourceItem: SplittermondItem,
        private readonly modifierType: ModifierType
    ) {
        super(allErrors)
    }

    convertToDamageModifier(modifier: ScalarModifier, emphasisFromName: string): IModifier {
        const attributes = {
            ...modifier.attributes,
            damageType: this.normalizeDamageType(modifier.attributes.damageType),
            itemType: this.normalizeItemType(modifier.attributes.itemType),
            name: emphasisFromName,
            type: this.modifierType
        };
        return new Modifier(
            "item.damage",
            modifier.value,
            attributes,
            this.sourceItem
        )
    }

    convertToWeaponSpeedModifier(modifier: ScalarModifier, emphasisFromName: string): IModifier {
        const attributes = {
            ...modifier.attributes,
            itemType: this.normalizeItemType(modifier.attributes.itemType),
            name: emphasisFromName,
            type: this.modifierType
        };
        return new Modifier(
            "item.weaponspeed",
            modifier.value,
            attributes,
            this.sourceItem
        )
    }

    convertToItemFeatureModifier(modifier: ScalarModifier, emphasisFromName: string): IModifier {
        const attributes = {
            ...modifier.attributes,
            itemType: this.normalizeItemType(modifier.attributes.itemType),
            name: emphasisFromName,
            type: this.modifierType
        };
        return new Modifier(
            modifier.path, //item.mergeFeature
            modifier.value,
            attributes,
            this.sourceItem
        )
    }

    normalizeAttribute(value: Value | undefined, mapper: ValidMapper): string | undefined {
        if (value === null || value === undefined || !this.validateDescriptor(value)) {
            return undefined;
        } else {
            return normalizeDescriptor(value).usingMappers(mapper).do();

        }
    }

    normalizeDamageType(damageType: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(damageType, "damageTypes");
        if (!normalized) {
            return undefined;
        } else if (!(splittermond.damageTypes as Readonly<string[]>).includes(normalized)) {
            this.reportMissingDescriptor("damageType", normalized, this.sourceItem.name);
            return undefined;
        } else {
            return normalized;
        }
    }

    normalizeItemType(itemType: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(itemType, "itemTypes");
        if (!normalized) {
            return undefined;
        } else if ((splittermond.itemTypes as Readonly<string[]>).includes(normalized)) {
            this.reportMissingDescriptor("itemType", normalized, this.sourceItem.name);
            return normalized;
        } else {
            return normalized;
        }
    }
}