import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondSpellItem from "../spell";
import {damage, getDescriptorFields, validatedBoolean} from "./commonFields";

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
        castDuration: new fields.StringField({ required: true, nullable:true }),
        effectDuration: new fields.StringField({ required: true, nullable:true }),
        effectArea: new fields.StringField({ required: true, nullable:true }),
        enhancementDescription: new fields.StringField({ required: true, nullable:true }),
        enhancementCosts: new fields.StringField({ required: true, nullable:true }),
        features: new fields.StringField({ required: true, nullable:true }),
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
}
