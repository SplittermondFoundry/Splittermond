import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondShieldItem from "../shield";
import { getDefense, getDescriptorFields, getPhysicalProperties, validatedBoolean } from "./commonFields";
import { from0_12_20_migrateFeatures, migrateFrom0_12_13, migrateFrom0_12_20 } from "./migrations";
import { SplittermondAttribute } from "../../config/attributes";
import { ItemFeaturesModel } from "./propertyModels/ItemFeaturesModel";
import { DamageModel } from "./propertyModels/DamageModel";

function ItemShieldDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        ...getDefense(),
        modifier: new fields.StringField({ required: true, nullable: false }),
        skill: new fields.StringField({ required: true, nullable: false }),
        features: new fields.EmbeddedDataField(ItemFeaturesModel, { required: true, nullable: false }),
        minAttributes: new fields.StringField({ required: true, nullable: false }),
        equipped: validatedBoolean(),
    };
}
export type ShieldDataModelType = DataModelSchemaType<typeof ItemShieldDataModelSchema>;

export class ShieldDataModel extends SplittermondDataModel<ShieldDataModelType, SplittermondShieldItem> {
    static defineSchema = ItemShieldDataModelSchema;

    static migrateData(source: unknown) {
        source = migrateFrom0_12_13(source);
        source = migrateFrom0_12_20(source);
        source = from0_12_20_migrateFeatures(source);
        return super.migrateData(source);
    }

    get attribute1(): SplittermondAttribute {
        return "agility";
    }

    get attribute2(): SplittermondAttribute {
        return "strength";
    }

    //all shields have a damage value of 1W6+1
    get damage(): DamageModel {
        return new DamageModel({ stringInput: "1W6+1" });
    }

    get weaponSpeed(): number {
        return 7;
    }
}
