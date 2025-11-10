import { foundryApi } from "module/api/foundryApi";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import SplittermondSpellSheet from "module/item/sheets/spell-sheet";
import SplittermondWeaponSheet from "module/item/sheets/weapon-sheet";
import SplittermondShieldSheet from "module/item/sheets/shield-sheet";
import SplittermondArmorSheet from "module/item/sheets/armor-sheet";
import SplittermondAttackSheet from "module/item/sheets/attack-sheet";

export function registerSheets() {
    [
        {
            class: SplittermondItemSheet,
        },
        {
            type: "spell",
            class: SplittermondSpellSheet,
        },
        {
            type: "weapon",
            class: SplittermondWeaponSheet,
        },
        {
            type: "shield",
            class: SplittermondShieldSheet,
        },
        {
            type: "armor",
            class: SplittermondArmorSheet,
        },
        {
            type: "npcattack",
            class: SplittermondAttackSheet,
        },
    ].forEach((config) => registerSheet(config.class, config.type));
}

function registerSheet(itemClass: typeof SplittermondItemSheet, type?: string) {
    foundryApi.sheets.items.register("splittermond", itemClass, {
        types: [type],
        label: type ? `splittermond.${type}` : undefined,
        makeDefault: true,
    });
}
