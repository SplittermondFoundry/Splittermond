import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import { getDescriptorFields } from "./commonFields";
import { migrateModifiers } from "./migrations";

function ItemNpcFeatureDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable: true }),
    };
}

export type NpcFeatureDataModelType = DataModelSchemaType<typeof ItemNpcFeatureDataModelSchema>;

export class NpcFeatureDataModel extends SplittermondDataModel<NpcFeatureDataModelType, SplittermondItem> {
    static defineSchema = ItemNpcFeatureDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateModifiers(source);
        return super.migrateData(source);
    }
}
