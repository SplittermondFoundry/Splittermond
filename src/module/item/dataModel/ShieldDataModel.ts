import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondShieldItem from "../shield";
import {getDefense, getDescriptorFields, getPhysicalProperties} from "./commonFields";

function ItemShieldDataModelSchema() {
    return {
        ...getDescriptorFields(),
        physicalProperties: getPhysicalProperties(),
        defense: getDefense(),
        modifier: new fields.StringField({ required: true, nullable: false }),
        skill: new fields.StringField({ required: true, nullable: false }),
        features: new fields.StringField({ required: true, nullable: false }),
        minAttributes: new fields.StringField({ required: true, nullable: false }),
        equipped: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    };
}
export type ShieldDataModelType = DataModelSchemaType<typeof ItemShieldDataModelSchema>

export class ShieldDataModel extends SplittermondDataModel<ShieldDataModelType, SplittermondShieldItem> {
    static defineSchema= ItemShieldDataModelSchema;
}
