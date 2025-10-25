import SplittermondItemSheet from "./item-sheet";
import { parseCastDuration } from "module/item/dataModel/propertyModels/CastDurationModel.js";
import type SplittermondSpellItem from "module/item/spell";

export default class SplittermondSpellSheet extends SplittermondItemSheet {
    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: ["splittermond", "sheet", "item", "spell"],
    };

    get item(): SplittermondSpellItem {
        return super.item as SplittermondSpellItem;
    }

    _getStatBlock() {
        return [
            {
                label: "splittermond.difficulty",
                value: this.item.difficulty,
            },
            {
                label: "splittermond.focusCosts",
                value: this.item.costs,
            },
            {
                label: "splittermond.castDuration",
                value: this.item.castDuration,
            },
            {
                label: "splittermond.range",
                value: this.item.range,
            },
        ];
    }

    _prepareSubmitData(event: SubmitEvent, form: HTMLFormElement, formData: any, updateObject: object = {}): object {
        if (formData.object["system.damageType"] === "null") {
            formData.object["system.damageType"] = null;
        }
        if (formData.object["system.costType"] === "null") {
            formData.object["system.costType"] = null;
        }
        if (formData.object["system.castDuration.innateDuration"] !== undefined) {
            formData.object["system.castDuration"] = parseCastDuration(
                formData.object["system.castDuration.innateDuration"]
            );
            delete formData.object["system.castDuration.innateDuration"];
        }
        return super._prepareSubmitData(event, form, formData, updateObject);
    }
}
