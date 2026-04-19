import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondWeaponItem from "../weapon";
import { attributeName, damage, getDescriptorFields, getPhysicalProperties, validatedBoolean } from "./commonFields";
import {
    from0_12_20_migrateDamage,
    from0_12_20_migrateFeatures,
    from13_5_2_migrate_fo_modifiers,
    from13_8_8_migrateSkillModifiers,
    migrateFrom0_12_13,
    migrateFrom0_12_20,
} from "./migrations";
import { ItemFeaturesModel } from "./propertyModels/ItemFeaturesModel";

function ItemWeaponDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        modifier: new fields.StringField({ required: true, nullable: true }),
        ...damage(),
        range: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        weaponSpeed: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        skill: new fields.StringField({ required: true, nullable: false }),
        skillMod: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        features: new fields.EmbeddedDataField(ItemFeaturesModel, { required: true, nullable: false }),
        attribute1: attributeName(),
        attribute2: attributeName(),
        minAttributes: new fields.StringField({ required: true, nullable: false }),
        prepared: validatedBoolean(),
        equipped: validatedBoolean(),
        secondaryAttack: new fields.SchemaField(
            {
                skill: new fields.StringField({ required: true, nullable: true, initial: "none" }),
                skillMod: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
                attribute1: attributeName(),
                attribute2: attributeName(),
                ...damage(),
                range: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
                weaponSpeed: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
                minAttributes: new fields.StringField({ required: true, nullable: true }),
                features: new fields.EmbeddedDataField(ItemFeaturesModel, { required: true, nullable: false }),
            },
            { required: false, nullable: false }
        ),
    };
}

export type WeaponDataModelType = DataModelSchemaType<typeof ItemWeaponDataModelSchema>;

export class WeaponDataModel extends SplittermondDataModel<WeaponDataModelType, SplittermondWeaponItem> {
    static defineSchema = ItemWeaponDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateFrom0_12_13(source);
        source = migrateFrom0_12_20(source);
        source = from0_12_20_migrateFeatures(source);
        source = from0_12_20_migrateDamage(source);
        source = from13_5_2_migrate_fo_modifiers(source);
        source = from13_8_8_migrateSkillModifiers(source);
        return super.migrateData(source);
    }
}
