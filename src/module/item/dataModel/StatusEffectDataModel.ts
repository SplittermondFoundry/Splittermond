import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { getDescriptorFields } from "./commonFields";
import SplittermondItem from "../item";
import {
    from13_5_2_migrate_fo_modifiers,
    from13_8_8_migrateSkillModifiers,
    from14_2_6_migrateCombatEvent,
    migrateFrom0_12_13,
    migrateFrom0_12_20,
} from "./migrations";

function StatusEffectDataModelSchema() {
    return {
        ...getDescriptorFields(),
        // Responsibility B — ActiveEffect carrier (unchanged)
        modifier: new fields.StringField({ required: true, nullable: true }),
        level: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
        // Responsibility A — combat-event timer (new grouped shape)
        combatEvent: new fields.SchemaField(
            {
                startTick: new fields.NumberField({ required: true, nullable: true, initial: null }),
                interval: new fields.NumberField({
                    required: true,
                    nullable: true,
                    initial: null,
                    validate: (x) => x > 0 || x == null,
                }),
                repeats: new fields.NumberField({ required: true, nullable: true, initial: null }),
                macroRef: new fields.SchemaField(
                    {
                        name: new fields.StringField({ required: true, nullable: true, initial: null }),
                        uuid: new fields.StringField({ required: true, nullable: true, initial: null }),
                    },
                    { required: true, nullable: false }
                ),
                postDescription: new fields.BooleanField({ required: true, nullable: false, initial: true }),
            },
            { required: true, nullable: false }
        ),
    };
}

export type StatusEffectDataModelType = DataModelSchemaType<typeof StatusEffectDataModelSchema>;

export class StatusEffectDataModel extends SplittermondDataModel<StatusEffectDataModelType, SplittermondItem> {
    static defineSchema = StatusEffectDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateFrom0_12_13(source);
        source = migrateFrom0_12_20(source);
        source = from13_5_2_migrate_fo_modifiers(source);
        source = from13_8_8_migrateSkillModifiers(source);
        source = from14_2_6_migrateCombatEvent(source);
        return super.migrateData(source);
    }
}
