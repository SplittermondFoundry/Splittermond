import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import { getDescriptorFields, validatedBoolean } from "./commonFields";
import { migrateModifiers } from "./migrations";

function ItemSpellEffectDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable: true }),
        active: validatedBoolean(),
    };
}

export type SpellEffectDataModelType = DataModelSchemaType<typeof ItemSpellEffectDataModelSchema>;

export class SpellEffectDataModel extends SplittermondDataModel<SpellEffectDataModelType, SplittermondItem> {
    static defineSchema = ItemSpellEffectDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateModifiers(source);
        return super.migrateData(source);
    }
}
