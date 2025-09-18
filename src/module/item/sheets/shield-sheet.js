import SplittermondItemSheet from "./item-sheet.js";
import { foundryApi } from "../../api/foundryApi";

export default class SplittermondShieldSheet extends SplittermondItemSheet {
    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "sheet", "item", "shield"],
        });
    }

    _getStatBlock() {
        return [
            {
                label: "splittermond.defenseBonus",
                value: this.item.system.defenseBonus,
            },
            {
                label: "splittermond.tickMalus",
                value: this.item.system.tickMalus,
            },
            {
                label: "splittermond.handicap",
                value: this.item.system.handicap,
            },
            {
                label: "splittermond.minAttributes",
                value: this.item.system.minAttributes || "-",
            },
        ];
    }
}
