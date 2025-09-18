import { foundryApi } from "../api/foundryApi";
import type SplittermondSpellItem from "../item/spell";
import SplittermondMasteryItem from "../item/mastery";
import SplittermondActor from "../actor/actor";
import { CharacterDataModel } from "../actor/dataModel/CharacterDataModel";
import { NpcDataModelType } from "../actor/dataModel/NpcDataModel";
import SplittermondArmorItem from "../item/armor";
import { DataModelConstructorInput } from "../api/DataModel";
import { ArmorDataModelType, MasteryDataModelType, SpellDataModelType } from "../item";

interface CommonItemInput {
    name?: string;
    img?: string;
    folder?: string;
}

export const itemCreator = {
    createSpell(
        data: CommonItemInput & { type: "spell"; system: Partial<DataModelConstructorInput<SpellDataModelType>> }
    ): Promise<SplittermondSpellItem> {
        return foundryApi.createItem(data) as Promise<SplittermondSpellItem>;
    },

    createMastery(
        data: CommonItemInput & { type: "mastery"; system: Partial<DataModelConstructorInput<MasteryDataModelType>> }
    ): Promise<SplittermondMasteryItem> {
        return foundryApi.createItem(data) as Promise<SplittermondMasteryItem>;
    },
    createArmor(
        data: CommonItemInput & { type: "armor"; system: Partial<DataModelConstructorInput<ArmorDataModelType>> }
    ): Promise<SplittermondArmorItem> {
        return foundryApi.createItem(data) as Promise<SplittermondArmorItem>;
    },
};

export const actorCreator = {
    createCharacter(
        data: { type: "character"; name: string; system: Partial<DataModelConstructorInput<CharacterDataModel>> },
        options?: Record<string, unknown>
    ): Promise<SplittermondActor> {
        return foundryApi.createActor(data, options) as Promise<SplittermondActor>;
    },
    createNpc(
        data: { type: "npc"; name: string; system: Partial<DataModelConstructorInput<NpcDataModelType>> },
        options?: Record<string, unknown>
    ): Promise<SplittermondActor> {
        return foundryApi.createActor(data, options) as Promise<SplittermondActor>;
    },
};
