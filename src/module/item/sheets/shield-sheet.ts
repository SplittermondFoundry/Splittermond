import SplittermondItemSheet from "./item-sheet";
import type SplittermondShieldItem from "module/item/shield";

export default class SplittermondShieldSheet extends SplittermondItemSheet {
    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: ["splittermond", "sheet", "item", "shield"],
    };

    get item(): SplittermondShieldItem {
        return super.item as SplittermondShieldItem;
    }

    _getStatBlock() {
        return [
            {
                label: "splittermond.defenseBonus",
                value: `${this.item.system.defenseBonus}`,
            },
            {
                label: "splittermond.tickMalus",
                value: `${this.item.system.tickMalus}`,
            },
            {
                label: "splittermond.handicap",
                value: `${this.item.system.handicap}`,
            },
            {
                label: "splittermond.minAttributes",
                value: `${this.item.system.minAttributes}` || "-",
            },
        ];
    }
}
