import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { getDescriptorFields } from "./commonFields";
import SplittermondItem from "../item";
import { migrateFrom0_12_13, migrateFrom0_12_20 } from "./migrations";

function CultureLoreDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable: true }),
    };
}

export type CultureLoreDataModelType = DataModelSchemaType<typeof CultureLoreDataModelSchema>;

export class CultureLoreDataModel extends SplittermondDataModel<CultureLoreDataModelType, SplittermondItem> {
    static defineSchema = CultureLoreDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateFrom0_12_13(source);
        source = migrateFrom0_12_20(source);
        return super.migrateData(source);
    }
}
