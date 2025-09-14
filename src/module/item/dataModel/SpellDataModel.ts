import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondSpellItem from "../spell";
import {damage, getDescriptorFields, validatedBoolean} from "./commonFields";
import {ItemFeaturesModel} from "./propertyModels/ItemFeaturesModel";
import {CastDurationModel} from "./propertyModels/CastDurationModel";
import {from0_12_20_migrateDamage, from0_12_20_migrateFeatures} from "./migrations";

function SpellDataModelSchema() {
    return {
        ...getDescriptorFields(),
        availableIn: new fields.StringField({ required: true, nullable:true }),
        skill: new fields.StringField({ required: true, nullable:true }),
        skillLevel: new fields.NumberField({ required: true, nullable:true, initial: 0 }),
        spellType: new fields.StringField({ required: true, nullable:true }),
        costs: new fields.StringField({ required: true, nullable:true }),
        difficulty: new fields.StringField({ required: true, nullable:true }),
        ...damage(),
        range: new fields.StringField({ required: true, nullable:true }),
        castDuration: new fields.EmbeddedDataField(CastDurationModel, { required: true, nullable: false }),
        effectDuration: new fields.StringField({ required: true, nullable:true }),
        effectArea: new fields.StringField({ required: true, nullable:true }),
        enhancementDescription: new fields.StringField({ required: true, nullable:true }),
        enhancementCosts: new fields.StringField({ required: true, nullable:true }),
        features: new fields.EmbeddedDataField(ItemFeaturesModel,{ required: true, nullable: false}),
        degreeOfSuccessOptions: new fields.SchemaField({
            castDuration: validatedBoolean(),
            consumedFocus: validatedBoolean(),
            exhaustedFocus: validatedBoolean(),
            channelizedFocus: validatedBoolean(),
            effectDuration: validatedBoolean(),
            damage: validatedBoolean(),
            range: validatedBoolean(),
            effectArea: validatedBoolean(),
        }, { required: true, nullable:false}),
    };
}

export type SpellDataModelType = DataModelSchemaType<typeof SpellDataModelSchema>

export class SpellDataModel extends SplittermondDataModel<SpellDataModelType, SplittermondSpellItem> {
    static defineSchema= SpellDataModelSchema;

    static migrateData(source:unknown){
        source = from0_12_20_migrateDamage(source);
        source = from0_12_20_migrateFeatures(source);
        source = from13_40_0_migrateCastDuration(source);
        return super.migrateData(source);
    }
}

function from13_40_0_migrateCastDuration(source: any): any {
    if (source && typeof source.castDuration === "string") {
        source.castDuration = { value: source.castDuration, unit: "T" };
    }
    return source;
}
