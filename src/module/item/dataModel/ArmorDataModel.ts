import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondShieldItem from "../shield";
import {getDefense, getDescriptorFields, getPhysicalProperties} from "./commonFields";

function ItemArmorDataModelSchema() {
    return {
        ...getDescriptorFields(),
        physicalProperties: getPhysicalProperties(),
        defense: getDefense(),
        modifier: new fields.StringField({ required: true, nullable: false }),
        minStr: new fields.NumberField({ required: true, nullable: true}),
        damageReduction: new fields.NumberField({ required: true, nullable: true}),
        features: new fields.StringField({ required: true, nullable: true}),
        equipped: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    };
}
type ArmorDataModelType = DataModelSchemaType<typeof ItemArmorDataModelSchema>

export class ArmorDataModel extends SplittermondDataModel<ArmorDataModelType, SplittermondShieldItem> {
    static defineSchema= ItemArmorDataModelSchema;
}
