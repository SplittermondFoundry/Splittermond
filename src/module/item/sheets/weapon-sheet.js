import SplittermondItemSheet from "./item-sheet";
import { foundryApi } from "../../api/foundryApi";
import { parseFeatures } from "../dataModel/propertyModels/ItemFeaturesModel";

export default class SplittermondWeaponSheet extends SplittermondItemSheet {
    constructor(options) {
        super({
            classes: ["splittermond", "sheet", "item", "weapon"],
            ...options,
        });
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
                value: this.item.system.range,
            });
        }

        data = data.concat([
            {
                label: "splittermond.weaponSpeedAbbrev",
                value: this.item.system.weaponSpeed,
            },
            {
                label: "splittermond.attributes",
                value:
                    game.i18n.localize("splittermond.attribute." + this.item.system.attribute1 + ".short") +
                    " + " +
                    game.i18n.localize("splittermond.attribute." + this.item.system.attribute2 + ".short"),
            },
            {
                label: "splittermond.minAttributes",
                value: this.item.system.minAttributes || "-",
            },
        ]);

        return data;
    }

    _prepareSubmitData(event, form, formData, updateObject = {}) {
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
