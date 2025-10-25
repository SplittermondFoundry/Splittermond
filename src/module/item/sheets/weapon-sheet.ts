import SplittermondItemSheet from "./item-sheet.js";
import { foundryApi } from "../../api/foundryApi";
import { parseFeatures } from "../dataModel/propertyModels/ItemFeaturesModel";
import type SplittermondWeaponItem from "module/item/weapon";

export default class SplittermondWeaponSheet extends SplittermondItemSheet {
    constructor(options: any) {
        super({
            classes: ["splittermond", "sheet", "item", "weapon"],
            ...options,
        });
    }

    get item(): SplittermondWeaponItem {
        return super.item as SplittermondWeaponItem;
    }

    _getStatBlock() {
        let data = [
            {
                label: "splittermond.damage",
                value: this.item.system.damage.displayValue,
            },
        ];

        if (this.item.system.skill === "longrange" || this.item.system.skill === "throwing") {
            data.push({
                label: "splittermond.range",
                value: `${this.item.system.range}`,
            });
        }

        data = data.concat([
            {
                label: "splittermond.weaponSpeedAbbrev",
                value: `${this.item.system.weaponSpeed}`,
            },
            {
                label: "splittermond.attributes",
                value:
                    this.localizer.localize("splittermond.attribute." + this.item.system.attribute1 + ".short") +
                    " + " +
                    this.localizer.localize("splittermond.attribute." + this.item.system.attribute2 + ".short"),
            },
            {
                label: "splittermond.minAttributes",
                value: this.item.system.minAttributes || "-",
            },
        ]);

        return data;
    }

    _prepareSubmitData(event: SubmitEvent, form: HTMLFormElement, formData: any, updateObject: object = {}): object {
        const featureAddress = "system.secondaryAttack.features.innateFeatures";
        const secondaryAttackFeatures = formData.object[featureAddress];
        delete formData.object[featureAddress];
        /**@type {?name:string, system:Partial<DataModelConstructorInput<WeaponDataModel>>} */
        const mappedFormData = {
            system: {
                secondaryAttack: {
                    features: {
                        internalFeatureList: parseFeatures(secondaryAttackFeatures),
                    },
                },
            },
        };
        const submitObject = foundryApi.utils.mergeObject(updateObject, mappedFormData);
        return super._prepareSubmitData(event, form, formData, submitObject);
    }
}
