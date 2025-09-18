import { DataModelSchemaType, fields } from "../../data/SplittermondDataModel";

export function DamageFeatureSchema() {
    return {
        active: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        name: new fields.StringField({ required: true, nullable: false }),
        value: new fields.NumberField({ required: true, nullable: false }),
    };
}

export type DamageFeature = DataModelSchemaType<typeof DamageFeatureSchema>;
