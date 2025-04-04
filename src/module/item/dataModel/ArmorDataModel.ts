import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondShieldItem from "../shield";
import {getDefense, getDescriptorFields, getPhysicalProperties, validatedBoolean} from "./commonFields";
import {migrateFrom0_12_11, migrateFrom0_12_13} from "./migrations";

function ItemArmorDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        ...getDefense(),
        modifier: new fields.StringField({ required: true, nullable: false }),
        minStr: new fields.NumberField({ required: true, nullable: true}),
        damageReduction: new fields.NumberField({ required: true, nullable: true}),
        features: new fields.StringField({ required: true, nullable: true}),
        equipped: validatedBoolean()
    };
}
export type ArmorDataModelType = DataModelSchemaType<typeof ItemArmorDataModelSchema>

export class ArmorDataModel extends SplittermondDataModel<ArmorDataModelType, SplittermondShieldItem> {
    static defineSchema= ItemArmorDataModelSchema;

    static migrateData(source:unknown){
        source = migrateFrom0_12_11(source);
        source = migrateFrom0_12_13(source);
        return super.migrateData(source);
    }
}
