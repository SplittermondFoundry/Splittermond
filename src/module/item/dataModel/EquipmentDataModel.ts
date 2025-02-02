import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondEquipmentItem from "../equipment";
import {getDescriptorFields, getPhysicalProperties} from "./commonFields";

function ItemEquipmentDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        modifier: new fields.StringField({ required: true, nullable: true}),
    };
}

export type EquipmentDataModelType = DataModelSchemaType<typeof ItemEquipmentDataModelSchema>

export class EquipmentDataModel extends SplittermondDataModel<EquipmentDataModelType,SplittermondEquipmentItem> {
    static defineSchema = ItemEquipmentDataModelSchema;
}
