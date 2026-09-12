import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondActor from "../actor";
import { splittermond } from "module/config";
import { actorDataModel } from "module/actor/dataModel/commonFields";
import { CharacterAttribute } from "module/actor/dataModel/CharacterAttribute";

function CharacterDataModelSchema() {
    return {
        ...actorDataModel(CharacterAttribute),
        splinterpoints: new fields.SchemaField(
            {
                max: new fields.NumberField({
                    required: true,
                    nullable: false,
                    initial: splittermond.splinterpoints.max,
                }),
                value: new fields.NumberField({
                    required: true,
                    nullable: false,
                    initial: splittermond.splinterpoints.max,
                }),
            },
            { required: true, nullable: false }
        ),
        experience: new fields.SchemaField(
            {
                heroLevel: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
                free: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                spent: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                nextLevelValue: new fields.NumberField({ required: true, nullable: false, initial: 100 }),
            },
            { required: true, nullable: false }
        ),
        species: new fields.SchemaField(
            {
                value: new fields.StringField({ required: true, nullable: false }),
                size: new fields.NumberField({ required: true, nullable: false, initial: 5 }),
            },
            { required: true, nullable: false }
        ),
        ancestry: new fields.StringField({ required: true, nullable: false }),
        culture: new fields.StringField({ required: true, nullable: false }),
        education: new fields.StringField({ required: true, nullable: false }),
    };
}

export type CharacterDataModelType = DataModelSchemaType<typeof CharacterDataModelSchema>;

export class CharacterDataModel extends SplittermondDataModel<CharacterDataModelType, SplittermondActor> {
    static defineSchema = CharacterDataModelSchema;
}
