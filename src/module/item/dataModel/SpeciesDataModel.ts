import { DataModelSchemaType, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemSpeciesDataModelSchema() {
    return {
        ...getDescriptorFields(),
        size: new fields.NumberField({ required: true, nullable: true, initial: 5 }),
        attributeMod: new fields.StringField({ required: true, nullable: true }),
        strengths: new fields.StringField({ required: true, nullable: true }),
    };
}

type SpeciesDataModelType = DataModelSchemaType<typeof ItemSpeciesDataModelSchema>;

export class SpeciesDataModel extends SplittermondDataModel<SpeciesDataModelType, SplittermondItem> {
    static defineSchema = ItemSpeciesDataModelSchema;
}
