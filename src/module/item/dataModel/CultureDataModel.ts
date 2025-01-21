import { DataModelSchemaType, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemCultureDataModelSchema() {
    return {
        ...getDescriptorFields(),
        typicalSpecies: new fields.StringField({ required: true, nullable: true }),
        typicalAncestries: new fields.StringField({ required: true, nullable: true }),
        cultureLore: new fields.StringField({ required: true, nullable: true }),
        language: new fields.StringField({ required: true, nullable: true }),
        strength: new fields.StringField({ required: true, nullable: true }),
        skills: new fields.StringField({ required: true, nullable: true }),
        mastery: new fields.StringField({ required: true, nullable: true }),
    };
}

type CultureDataModelType = DataModelSchemaType<typeof ItemCultureDataModelSchema>;

export class CultureDataModel extends SplittermondDataModel<CultureDataModelType, SplittermondItem> {
    static defineSchema = ItemCultureDataModelSchema;
}
