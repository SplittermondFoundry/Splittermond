import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondSpellItem from "../spell";
import {getDescriptorFields} from "./commonFields";

function SpellDataModelSchema() {
    return {
        ...getDescriptorFields(),
        availableIn: new fields.StringField({ required: true, nullable:true }),
        skill: new fields.StringField({ required: true, nullable:true }),
        skillLevel: new fields.NumberField({ required: true, nullable:true, initial: 0 }),
        spellType: new fields.StringField({ required: true, nullable:true }),
        costs: new fields.StringField({ required: true, nullable:true }),
        difficulty: new fields.StringField({ required: true, nullable:true }),
        damage: new fields.StringField({ required: true, nullable:true }),
        range: new fields.StringField({ required: true, nullable:true }),
        castDuration: new fields.StringField({ required: true, nullable:true }),
        effectDuration: new fields.StringField({ required: true, nullable:true }),
        effectArea: new fields.StringField({ required: true, nullable:true }),
        enhancementDescription: new fields.StringField({ required: true, nullable:true }),
        enhancementCosts: new fields.StringField({ required: true, nullable:true }),
        features: new fields.StringField({ required: true, nullable:true }),
        degreeOfSuccessOptions: new fields.SchemaField({
            castDuration: new fields.BooleanField({ required: true, nullable:true, initial: false }),
            consumedFocus: new fields.BooleanField({ required: true, nullable:true, initial: false }),
            exhaustedFocus: new fields.BooleanField({ required: true, nullable:true, initial: false }),
            channelizedFocus: new fields.BooleanField({ required: true, nullable:true, initial: false }),
            effectDuration: new fields.BooleanField({ required: true, nullable:true, initial: false }),
            damage: new fields.BooleanField({ required: true, nullable:true, initial: false }),
            range: new fields.BooleanField({ required: true, nullable:true, initial: false }),
            effectArea: new fields.BooleanField({ required: true, nullable:true, initial: false }),
        }, { required: true, nullable:false}),
    };
}

export type SpellDataModelType = DataModelSchemaType<typeof SpellDataModelSchema>

export class SpellDataModel extends SplittermondDataModel<SpellDataModelType, SplittermondSpellItem> {
    static defineSchema= SpellDataModelSchema;
}
