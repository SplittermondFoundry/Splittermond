import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemWeaknessDataModelSchema() {
    return {
        ...getDescriptorFields()
    };
}

export type WeaknessDataModelType = DataModelSchemaType<typeof ItemWeaknessDataModelSchema>;

export class WeaknessDataModel extends SplittermondDataModel<WeaknessDataModelType, SplittermondItem> {
    static defineSchema = ItemWeaknessDataModelSchema;
}
