import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { getDescriptorFields } from "./commonFields";
import SplittermondItem from "../item";
import { from13_5_2_migrate_fo_modifiers, from13_8_8_migrateSkillModifiers } from "./migrations";

function StatusEffectDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable: true }),
        level: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
        startTick: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        interval: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        times: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    };
}

export type StatusEffectDataModelType = DataModelSchemaType<typeof StatusEffectDataModelSchema>;

export class StatusEffectDataModel extends SplittermondDataModel<StatusEffectDataModelType, SplittermondItem> {
    static defineSchema = StatusEffectDataModelSchema;

    static migrateData(source: unknown) {
        source = from13_5_2_migrate_fo_modifiers(source);
        source = from13_8_8_migrateSkillModifiers(source);
        return super.migrateData(source);
    }
}
