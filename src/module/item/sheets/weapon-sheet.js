import SplittermondItemSheet from "./item-sheet";
import { foundryApi } from "../../api/foundryApi";
import { parseFeatures } from "../dataModel/propertyModels/ItemFeaturesModel";

export default class SplittermondWeaponSheet extends SplittermondItemSheet {
    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "sheet", "item", "weapon"],
        });
    }

    _getStatBlock() {
        let data = [
            {
                label: "splittermond.damage",
                value: this.item.system.damage.displayValue,
            },
        ];

        if (this.item.system.skill == "longrange" || this.item.system.skill == "throwing") {
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

    _updateObject(event, formData) {
        formData["system.secondaryAttack.features.internalFeatureList"] = parseFeatures(
            formData["system.secondaryAttack.features.innateFeatures"]
        );
        delete formData["system.secondaryAttack.features.features"];
        return super._updateObject(event, formData);
    }
}
