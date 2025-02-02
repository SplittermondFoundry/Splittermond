import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields, getPhysicalProperties} from "./commonFields";

function ItemProjectileDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        skill: new fields.StringField({ required: true, nullable: false, initial: "craftmanship" }),
        subSkill: new fields.StringField({ required: true, nullable: false }),
        weapon: new fields.StringField({ required: true, nullable: true}),
        features: new fields.StringField({ required: true, nullable: true}),
    };
}

export type ProjectileDataModelType = DataModelSchemaType<typeof ItemProjectileDataModelSchema>

export class ProjectileDataModel extends SplittermondDataModel<ProjectileDataModelType,SplittermondItem> {
    static defineSchema = ItemProjectileDataModelSchema;
}
