import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondShieldItem from "../shield";
import { getDefense, getDescriptorFields, getPhysicalProperties, validatedBoolean } from "./commonFields";
import { from0_12_20_migrateFeatures, migrateModifiers } from "./migrations";
import { ItemFeaturesModel } from "./propertyModels/ItemFeaturesModel";

function ItemArmorDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        ...getDefense(),
        modifier: new fields.StringField({ required: true, nullable: false }),
        minStr: new fields.NumberField({ required: true, nullable: true }),
        damageReduction: new fields.NumberField({ required: true, nullable: true }),
        features: new fields.EmbeddedDataField(ItemFeaturesModel, { required: true, nullable: false }),
        equipped: validatedBoolean(),
    };
}
export type ArmorDataModelType = DataModelSchemaType<typeof ItemArmorDataModelSchema>;

export class ArmorDataModel extends SplittermondDataModel<ArmorDataModelType, SplittermondShieldItem> {
    static defineSchema = ItemArmorDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateModifiers(source);
        source = from0_12_20_migrateFeatures(source);
        return super.migrateData(source);
    }
}
