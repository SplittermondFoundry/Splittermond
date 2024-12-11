import {foundryApi} from "../api/foundryApi";
import type SplittermondSpellItem from "../item/spell";
import {SplittermondSpellSystemData} from "module/data/ItemSystemData";

export const itemCreator = {
    createSpell(data: {type: "spell", system: SplittermondSpellSystemData}): Promise<SplittermondSpellItem> {
        return foundryApi.createItem(data) as Promise<SplittermondSpellItem>;
    }
}