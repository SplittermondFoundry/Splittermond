import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondMasteryItem from "../mastery";
import { getDescriptorFields, validatedBoolean } from "./commonFields";
import { from13_5_2_migrate_fo_modifiers, from13_8_8_migrateSkillModifiers } from "./migrations";

function ItemMasteryDataModelSchema() {
    return {
        ...getDescriptorFields(),
        availableIn: new fields.StringField({ required: true, nullable: true }),
        modifier: new fields.StringField({ required: true, nullable: true }),
        skill: new fields.StringField({ required: true, nullable: false }),
        isGrandmaster: validatedBoolean(),
        isManeuver: validatedBoolean(),
        level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    };
}
export type MasteryDataModelType = DataModelSchemaType<typeof ItemMasteryDataModelSchema>;

export class MasteryDataModel extends SplittermondDataModel<MasteryDataModelType, SplittermondMasteryItem> {
    static defineSchema = ItemMasteryDataModelSchema;

    static migrateData(source: unknown) {
        source = from13_5_2_migrate_fo_modifiers(source);
        source = from13_8_8_migrateSkillModifiers(source);
        return super.migrateData(source);
    }
}
