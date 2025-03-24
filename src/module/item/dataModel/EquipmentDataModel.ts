import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondEquipmentItem from "../equipment";
import {getDescriptorFields, getPhysicalProperties} from "./commonFields";
import {migrateFrom0_12_11, migrateFrom0_12_13} from "./migrations";

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

    static migrateData(source:unknown){
        source = migrateFrom0_12_11(source);
        source = migrateFrom0_12_13(source);
        return super.migrateData(source);
    }
}
