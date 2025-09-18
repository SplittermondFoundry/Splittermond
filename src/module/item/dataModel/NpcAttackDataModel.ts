import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondNpcAttackItem from "../npcattack";
import { damage, getDescriptorFields } from "./commonFields";
import { ItemFeaturesModel } from "./propertyModels/ItemFeaturesModel";
import { from0_12_20_migrateDamage, from0_12_20_migrateFeatures, migrateFrom0_12_20 } from "./migrations";

function ItemNpcAttackDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...damage(),
        range: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        weaponSpeed: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        skillValue: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        features: new fields.EmbeddedDataField(ItemFeaturesModel, { required: true, nullable: false }),
    };
}

export type NpcAttackDataModelType = DataModelSchemaType<typeof ItemNpcAttackDataModelSchema>;

export class NpcAttackDataModel extends SplittermondDataModel<NpcAttackDataModelType, SplittermondNpcAttackItem> {
    static defineSchema = ItemNpcAttackDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateFrom0_12_20(source);
        source = from0_12_20_migrateDamage(source);
        source = from0_12_20_migrateFeatures(source);
        return super.migrateData(source);
    }
}
