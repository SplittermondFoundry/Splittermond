import { DataModelSchemaType, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";

function ItemStrengthDataModelSchema() {
    return {
        description: new fields.HTMLField({ required: true, nullable: true }),
        source: new fields.StringField({ required: true, nullable: true }),
        modifier: new fields.StringField({ required: true, nullable: true }),
        origin: new fields.StringField({ required: true, nullable: true }),
        level: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
        quantity: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
        multiSelectable: new fields.BooleanField({ required: true, nullable: true, initial: false }),
        onCreationOnly: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    };
}

export type StrengthDataModelType = DataModelSchemaType<typeof ItemStrengthDataModelSchema>;

export class StrengthDataModel extends SplittermondDataModel<StrengthDataModelType, SplittermondItem> {
    static defineSchema = ItemStrengthDataModelSchema;
}
