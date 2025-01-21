import { DataModelSchemaType, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondNpcAttackItem from "../npcattack";
import {getDescriptorFields} from "./commonFields";

function ItemNpcAttackDataModelSchema() {
    return {
        ...getDescriptorFields(),
        damage: new fields.StringField({ required: true, nullable: true }),
        range: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        weaponSpeed: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        skillValue: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        features: new fields.StringField({ required: true, nullable: true }),
    };
}

export type NpcAttackDataModelType = DataModelSchemaType<typeof ItemNpcAttackDataModelSchema>;

export class NpcAttackDataModel extends SplittermondDataModel<NpcAttackDataModelType, SplittermondNpcAttackItem> {
    static defineSchema = ItemNpcAttackDataModelSchema;
}
