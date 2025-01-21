import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemLanguageDataModelSchema() {
    return {
        ...getDescriptorFields()
    };
}

type LanguageDataModelType = DataModelSchemaType<typeof ItemLanguageDataModelSchema>;

export class LanguageDataModel extends SplittermondDataModel<LanguageDataModelType, SplittermondItem> {
    static defineSchema = ItemLanguageDataModelSchema;
}
