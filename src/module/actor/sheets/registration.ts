import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondNPCSheet from "module/actor/sheets/npc-sheet";
import { foundryApi } from "module/api/foundryApi";
import type SplittermondActorSheet from "module/actor/sheets/actor-sheet";

export function registerSheets() {
    [
        {
            type: "character",
            class: SplittermondCharacterSheet,
        },
        {
            type: "npc",
            class: SplittermondNPCSheet,
        },
        //@ts-expect-error -- We cannot type DEFAULT_OPTIONS in actor sheet which causes problems here
    ].forEach((config) => registerSheet(config.class, config.type));
}

function registerSheet(itemClass: typeof SplittermondActorSheet, type: string) {
    foundryApi.sheets.actors.register("splittermond", itemClass, {
        types: [type],
        label: `splittermond.${type}`,
        makeDefault: true,
    });
}
