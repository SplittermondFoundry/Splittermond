import SplittermondItemSheet from "./item-sheet.js";
import { foundryApi } from "../../api/foundryApi";

export default class SplittermondArmorSheet extends SplittermondItemSheet {
    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "sheet", "item", "armor"],
        });
    }

    _getStatBlock() {
        return [
            {
                label: "splittermond.defenseBonus",
                value: this.item.system.defenseBonus || 0,
            },
            {
                label: "splittermond.tickMalus",
                value: this.item.system.tickMalus || 0,
            },
            {
                label: "splittermond.handicap",
                value: this.item.system.handicap || 0,
            },
            {
                label: "splittermond.damageReductionAbbrev",
                value: this.item.system.damageReduction || 0,
            },
            {
                label: "splittermond.minStrength",
                value: this.item.system.minStr || "-",
            },
        ];
    }
}
