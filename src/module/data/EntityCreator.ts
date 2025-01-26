import {foundryApi} from "../api/foundryApi";
import type SplittermondSpellItem from "../item/spell";
import {SplittermondMasterySystemData, SplittermondSpellSystemData} from "module/data/ItemSystemData";
import SplittermondMasteryItem from "../item/mastery";
import SplittermondActor from "../actor/actor";
import {CharacterDataModel} from "../actor/dataModel/CharacterDataModel";
import {NpcDataModel} from "../actor/dataModel/NpcDataModel";

export const itemCreator = {
    createSpell(data: {type: "spell", system: SplittermondSpellSystemData}): Promise<SplittermondSpellItem> {
        return foundryApi.createItem(data) as Promise<SplittermondSpellItem>;
    },

    createMastery(data:{type: "mastery", system: SplittermondMasterySystemData}): Promise<SplittermondMasteryItem> {
        return foundryApi.createItem(data) as Promise<SplittermondMasteryItem>;
    }
}

export const actorCreator = {
    createCharacter(data: {type:"character",system: CharacterDataModel},options?:Record<string,unknown>): Promise<SplittermondActor> {
        return foundryApi.createActor(data,options) as Promise<SplittermondActor>;
    },
    createNpc(data: {type:"npc",system: NpcDataModel}, options:Record<string,unknown>): Promise<SplittermondActor> {
        return foundryApi.createActor(data,options) as Promise<SplittermondActor>;
    }
}