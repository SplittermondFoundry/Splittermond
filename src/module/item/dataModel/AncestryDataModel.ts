import { DataModelSchemaType, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemAncestryDataModelSchema() {
    return {
        ...getDescriptorFields(),
        resources: new fields.StringField({ required: true, nullable: true }),
        skills: new fields.StringField({ required: true, nullable: true }),
    };
}

type AncestryDataModelType = DataModelSchemaType<typeof ItemAncestryDataModelSchema>;

export class AncestryDataModel extends SplittermondDataModel<AncestryDataModelType, SplittermondItem> {
    static defineSchema = ItemAncestryDataModelSchema;
}
