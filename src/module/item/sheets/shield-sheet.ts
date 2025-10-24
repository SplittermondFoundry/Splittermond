import SplittermondItemSheet from "./item-sheet";

export default class SplittermondShieldSheet extends SplittermondItemSheet {
    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: ["splittermond", "sheet", "item", "shield"],
    };

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
