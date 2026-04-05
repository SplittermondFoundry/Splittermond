import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import { getDescriptorFields, validatedBoolean } from "./commonFields";
import { from13_5_2_migrate_fo_modifiers, from13_8_8_migrateSkillModifiers } from "./migrations";

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
        source = from13_5_2_migrate_fo_modifiers(source);
        source = from13_8_8_migrateSkillModifiers(source);
        return super.migrateData(source);
    }
}
