import { DataModelSchemaType, fieldExtensions, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondSpellItem from "../spell";
import { damage, getDescriptorFields, validatedBoolean } from "./commonFields";
import { ItemFeaturesModel } from "./propertyModels/ItemFeaturesModel";
import { CastDurationModel, parseCastDuration } from "./propertyModels/CastDurationModel";
import { from0_12_20_migrateDamage, from0_12_20_migrateFeatures } from "./migrations";
import type { SplittermondSkill } from "module/config/skillGroups";
import { splittermond } from "module/config";
import { enhancedSpellValuesSchema } from "./EnhancedSpellValues";

function SpellDataModelSchema() {
    return {
        ...getDescriptorFields(),
        availableIn: new fields.StringField({ required: true, nullable: true }),
        skill: new fieldExtensions.StringEnumField({
            required: true,
            nullable: false,
            initial: "arcanelore",
            validate(x: SplittermondSkill) {
                return splittermond.skillGroups.all.includes(x);
            },
        }),
        skillLevel: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        spellType: new fields.StringField({ required: true, nullable: true }),
        costs: new fields.StringField({ required: true, nullable: true }),
        difficulty: new fields.StringField({ required: true, nullable: true }),
        ...damage(),
        range: new fields.StringField({ required: true, nullable: true }),
        castDuration: new fields.EmbeddedDataField(CastDurationModel, { required: true, nullable: false }),
        effectDuration: new fields.StringField({ required: true, nullable: true }),
        effectArea: new fields.StringField({ required: true, nullable: true }),
        enhancementDescription: new fields.StringField({ required: true, nullable: true }),
        enhancementCosts: new fields.StringField({ required: true, nullable: true }),
        features: new fields.EmbeddedDataField(ItemFeaturesModel, { required: true, nullable: false }),
        enhanced: new fields.SchemaField(enhancedSpellValuesSchema(), { required: true, nullable: false }),
        degreeOfSuccessOptions: new fields.SchemaField(
            {
                castDuration: validatedBoolean(true),
                consumedFocus: validatedBoolean(),
                exhaustedFocus: validatedBoolean(),
                channelizedFocus: validatedBoolean(),
                effectDuration: validatedBoolean(),
                damage: validatedBoolean(),
                range: validatedBoolean(),
                effectArea: validatedBoolean(),
            },
            { required: true, nullable: false }
        ),
    };
}

export type SpellDataModelType = DataModelSchemaType<typeof SpellDataModelSchema>;

export class SpellDataModel extends SplittermondDataModel<SpellDataModelType, SplittermondSpellItem> {
    static defineSchema = SpellDataModelSchema;

    static migrateData(source: unknown) {
        source = from0_12_20_migrateDamage(source);
        source = from0_12_20_migrateFeatures(source);
        source = from13_40_0_migrateCastDuration(source);
        source = from13_7_2_initSkill(source);
        source = from14_3_0_migrateEnhancedSpellTextValues(source);
        return super.migrateData(source);
    }
}

export function from14_3_0_migrateEnhancedSpellTextValues(source: unknown): unknown {
    if (!source || typeof source !== "object" || !("enhanced" in source)) return source;
    const enhanced = source.enhanced;
    if (!enhanced || typeof enhanced !== "object") return source;
    for (const key of ["range", "effectArea", "effectDuration"] as const) {
        if (!(key in enhanced)) continue;
        const value: unknown = Reflect.get(enhanced, key);
        if (typeof value !== "string") continue;
        // The preview schema turned inherited text values into empty strings.
        Reflect.set(enhanced, key, value ? { value } : null);
    }
    return source;
}

export function from13_40_0_migrateCastDuration(source: unknown): unknown {
    if (!source || typeof source !== "object") {
        return source;
    }
    if (!("castDuration" in source)) {
        return source;
    }
    if (!source.castDuration) {
        source.castDuration = { value: 1, unit: "T" };
    } else if (typeof source.castDuration === "string") {
        source.castDuration = parseCastDuration(source.castDuration);
    } else if (
        typeof source.castDuration === "object" &&
        "value" in source.castDuration &&
        !(source.castDuration as Record<string, unknown>).value
    ) {
        (source.castDuration as Record<string, unknown>).value = 1;
    } else if (
        typeof source.castDuration === "object" &&
        typeof (source.castDuration as Record<string, unknown>).value === "string"
    ) {
        source.castDuration = parseCastDuration((source.castDuration as Record<string, string>).value);
    }
    return source;
}

export function from13_7_2_initSkill<T = unknown>(source: T): T {
    if (!source || !(typeof source === "object")) {
        return source;
    }
    if ("skill" in source && !source.skill) {
        source.skill = "arcanelore";
    }
    return source;
}
