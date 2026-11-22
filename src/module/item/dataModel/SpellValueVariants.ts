import { fields, fieldExtensions } from "module/data/SplittermondDataModel";
import { NullableStringField } from "module/api/NullableStringField";
import { damageTypes } from "module/config/damageTypes";
import { costTypes } from "module/util/costs/costTypes";
import { DamageModel } from "./propertyModels/DamageModel";
import { ItemFeaturesModel } from "./propertyModels/ItemFeaturesModel";

export const spellVariantProperties = [
    "damage",
    "features",
    "damageType",
    "costType",
    "range",
    "effectArea",
    "effectDuration",
] as const;
export type SpellVariantProperty = (typeof spellVariantProperties)[number];

const present = { required: true, nullable: false } as const;
const inherited = { required: true, nullable: true, initial: null } as const;

export function spellValueVariantsSchema() {
    return {
        damage: new fields.SchemaField(
            {
                base: new fields.EmbeddedDataField(DamageModel, present),
                enhanced: new fields.EmbeddedDataField(DamageModel, inherited),
            },
            present
        ),
        features: new fields.SchemaField(
            {
                base: new fields.EmbeddedDataField(ItemFeaturesModel, present),
                enhanced: new fields.EmbeddedDataField(ItemFeaturesModel, inherited),
            },
            present
        ),
        damageType: typeVariants(damageTypes, "physical"),
        costType: typeVariants(costTypes, "V"),
        range: textVariants(),
        effectArea: textVariants(),
        effectDuration: textVariants(),
    };
}

function textVariants() {
    return new fields.SchemaField(
        {
            base: new fields.StringField({ required: true, nullable: true }),
            enhanced: new NullableStringField(),
        },
        present
    );
}

function typeVariants<T extends string>(choices: readonly T[], initial: T) {
    return new fields.SchemaField(
        {
            base: new fieldExtensions.StringEnumField<T | "none", true, false>({
                ...present,
                blank: false,
                initial,
                validate: (value: T | "none") => value === "none" || choices.includes(value),
            }),
            enhanced: new fieldExtensions.StringEnumField<T | "none", true, true>({
                ...inherited,
                blank: false,
                validate: (value: T | "none") => value === "none" || choices.includes(value),
            }),
        },
        present
    );
}
