import { fields } from "module/data/SplittermondDataModel";
import { damage } from "./commonFields";
import { DamageModel } from "./propertyModels/DamageModel";
import { ItemFeaturesModel } from "./propertyModels/ItemFeaturesModel";

export const enhancedSpellProperties = [
    "damage",
    "features",
    "damageType",
    "costType",
    "range",
    "effectArea",
    "effectDuration",
] as const;
export type EnhancedSpellProperty = (typeof enhancedSpellProperties)[number];

export function enhancedSpellValuesSchema() {
    const inherited = { required: true, nullable: true, initial: null } as const;
    const damageFields = damage();
    return {
        damage: new fields.EmbeddedDataField(DamageModel, inherited),
        features: new fields.EmbeddedDataField(ItemFeaturesModel, inherited),
        // Wrappers preserve inheritance even when Foundry normalizes a null StringField to an empty string.
        damageType: new fields.SchemaField({ value: damageFields.damageType }, inherited),
        costType: new fields.SchemaField({ value: damageFields.costType }, inherited),
        range: new fields.SchemaField(
            { value: new fields.StringField({ required: true, nullable: false }) },
            inherited
        ),
        effectArea: new fields.SchemaField(
            { value: new fields.StringField({ required: true, nullable: false }) },
            inherited
        ),
        effectDuration: new fields.SchemaField(
            { value: new fields.StringField({ required: true, nullable: false }) },
            inherited
        ),
    };
}
