import SplittermondItemSheet from "./item-sheet";
import { NpcAttackDataModel } from "module/item/dataModel/NpcAttackDataModel.js";
import type SplittermondItem from "module/item/item";

export default class SplittermondAttackSheet extends SplittermondItemSheet {
    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: ["splittermond", "sheet", "item", "npcattack"],
    };

    get item(): SplittermondItem & { system: NpcAttackDataModel } {
        return super.item;
    }

    _getStatBlock() {
        return [
            {
                label: "splittermond.damage",
                value: this.item.system.damage.displayValue,
            },
            {
                label: "splittermond.range",
                value: this.item.system.range,
            },
            {
                label: "splittermond.weaponSpeedAbbrev",
                value: this.item.system.weaponSpeed,
            },
        ];
    }
}
