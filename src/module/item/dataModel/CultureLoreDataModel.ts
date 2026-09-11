import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { getDescriptorFields } from "./commonFields";
import SplittermondItem from "../item";
import { from13_5_2_migrate_fo_modifiers, from13_8_8_migrateSkillModifiers } from "./migrations";

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
        source = from13_5_2_migrate_fo_modifiers(source);
        source = from13_8_8_migrateSkillModifiers(source);
        return super.migrateData(source);
    }
}
