import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemEducationDataModelSchema() {
    return {
        ...getDescriptorFields(),
        strength: new fields.StringField({ required: true, nullable: true }),
        resources: new fields.StringField({ required: true, nullable: true }),
        skills: new fields.StringField({ required: true, nullable: true }),
        masteries: new fields.StringField({ required: true, nullable: true }),
    };
}

export type EducationDataModelType = DataModelSchemaType<typeof ItemEducationDataModelSchema>;

export class EducationDataModel extends SplittermondDataModel<EducationDataModelType, SplittermondItem> {
    static defineSchema = ItemEducationDataModelSchema;
}
