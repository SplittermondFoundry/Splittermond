import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemResourceDataModelSchema() {
    return {
        ...getDescriptorFields(),
        value: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
    };
}

type ResourceDataModelType = DataModelSchemaType<typeof ItemResourceDataModelSchema>;

export class ResourceDataModel extends SplittermondDataModel<ResourceDataModelType, SplittermondItem> {
    static defineSchema = ItemResourceDataModelSchema;
}
