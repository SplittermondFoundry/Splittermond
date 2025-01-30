import {foundryApi} from "../api/foundryApi";
import type SplittermondSpellItem from "../item/spell";
import {SplittermondMasterySystemData, SplittermondSpellSystemData} from "module/data/ItemSystemData";
import SplittermondMasteryItem from "../item/mastery";
import SplittermondActor from "../actor/actor";
import {CharacterDataModel} from "../actor/dataModel/CharacterDataModel";
import {NpcDataModelType} from "../actor/dataModel/NpcDataModel";
import {DataModelConstructorInput} from "./SplittermondDataModel";

export const itemCreator = {
    createSpell(data: {type: "spell", system: Partial<SplittermondSpellSystemData>}): Promise<SplittermondSpellItem> {
        return foundryApi.createItem(data) as Promise<SplittermondSpellItem>;
    },

    createMastery(data:{type: "mastery", system: Partial<SplittermondMasterySystemData>}): Promise<SplittermondMasteryItem> {
        return foundryApi.createItem(data) as Promise<SplittermondMasteryItem>;
    }
}

export const actorCreator = {
    createCharacter(data: {type:"character",system: Partial<DataModelConstructorInput<CharacterDataModel>>},options?:Record<string,unknown>): Promise<SplittermondActor> {
        return foundryApi.createActor(data,options) as Promise<SplittermondActor>;
    },
    createNpc(data: {type:"npc",system: Partial<DataModelConstructorInput<NpcDataModelType>>}, options:Record<string,unknown>): Promise<SplittermondActor> {
        return foundryApi.createActor(data,options) as Promise<SplittermondActor>;
    }
}