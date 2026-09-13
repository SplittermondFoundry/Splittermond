import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import { migrateModifiers } from "./migrations";
import { validatedBoolean } from "./commonFields";

function ItemStrengthDataModelSchema() {
    return {
        description: new fields.HTMLField({ required: true, nullable: true }),
        source: new fields.StringField({ required: true, nullable: true }),
        modifier: new fields.StringField({ required: true, nullable: true }),
        origin: new fields.StringField({ required: true, nullable: true }),
        level: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
        quantity: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
        multiSelectable: validatedBoolean(),
        onCreationOnly: validatedBoolean(),
    };
}

export type StrengthDataModelType = DataModelSchemaType<typeof ItemStrengthDataModelSchema>;

export class StrengthDataModel extends SplittermondDataModel<StrengthDataModelType, SplittermondItem> {
    static defineSchema = ItemStrengthDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateModifiers(source);
        return super.migrateData(source);
    }
}
