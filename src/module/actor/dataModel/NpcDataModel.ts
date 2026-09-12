import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondActor from "../actor";
import { actorDataModel, derivedAttribute } from "module/actor/dataModel/commonFields";
import { NpcAttribute } from "module/actor/dataModel/NpcAttribute";

function NpcDataModelSchema() {
    return {
        ...actorDataModel(NpcAttribute),
        derivedAttributes: new fields.SchemaField(
            {
                size: derivedAttribute(),
                speed: derivedAttribute(),
                initiative: derivedAttribute(),
                healthpoints: derivedAttribute(),
                focuspoints: derivedAttribute(),
                defense: derivedAttribute(),
                bodyresist: derivedAttribute(),
                mindresist: derivedAttribute(),
            },
            { required: true, nullable: false }
        ),
        type: new fields.StringField({ required: true, nullable: false }),
        level: new fields.StringField({ required: true, nullable: false }),
        damageReduction: new fields.SchemaField(
            {
                value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            },
            { required: true, nullable: false }
        ),
        attacks: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
            required: true,
            nullable: false,
            initial: [],
        }),
    };
}

export type NpcDataModelType = DataModelSchemaType<typeof NpcDataModelSchema>;

export class NpcDataModel extends SplittermondDataModel<NpcDataModelType, SplittermondActor> {
    static defineSchema = NpcDataModelSchema;

    static migrateData(source: unknown) {
        super.migrateData(source);
    }
}
