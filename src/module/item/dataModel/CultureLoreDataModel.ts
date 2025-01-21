import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import {getDescriptorFields} from "./commonFields";
import SplittermondItem from "../item";

function CultureLoreDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable:true }),
    };
}

export type CultureLoreDataModelType = DataModelSchemaType<typeof CultureLoreDataModelSchema>

export class CultureLoreDataModel extends SplittermondDataModel<CultureLoreDataModelType, SplittermondItem> {
    static defineSchema = CultureLoreDataModelSchema;
}