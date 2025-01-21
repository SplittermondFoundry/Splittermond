import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemNpcFeatureDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable: true }),
    };
}

type NpcFeatureDataModelType = DataModelSchemaType<typeof ItemNpcFeatureDataModelSchema>;

export class NpcFeatureDataModel extends SplittermondDataModel<NpcFeatureDataModelType, SplittermondItem> {
    static defineSchema = ItemNpcFeatureDataModelSchema;
}
