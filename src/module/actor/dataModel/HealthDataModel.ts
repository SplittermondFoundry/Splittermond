import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import {CharacterDataModel} from "./CharacterDataModel";


function HealthSchema() {
    return {
        consumed: new fields.SchemaField({
            value: new fields.NumberField({required: true, nullable: false, initial: 0,validate:(x:number) => x >= 0}),
        }, {required: true, nullable: false}),
        exhausted: new fields.SchemaField({
            value: new fields.NumberField({required: true, nullable: false, initial: 0,validate:(x:number) => x >= 0}),
        }, {required: true, nullable: false}),
        channeled: new fields.SchemaField({
            entries: new fields.ArrayField(
                new fields.SchemaField({
                    description: new fields.StringField({required: true, nullable: false}),
                    costs: new fields.NumberField({required: true, nullable: false}),
                }, {required: true, nullable: false}),
                {required: true, nullable: false, initial: []}),
        }, {required: true, nullable: false}),
    };
}
export type HealthDataModelType = DataModelSchemaType<typeof HealthSchema>


/**
 * The ephermaral values and the overwriting of the toObject method exists, because the actore, upon {@link Actor#_prepareHealthFocus}
 * will extend the values of the health data model. However, Foundry, given a schema will only export values present in that schema.
 */
export class HealthDataModel extends SplittermondDataModel<HealthDataModelType, CharacterDataModel> {
    public max: number | null = null;
    public available = {value: 0, percentage: 0};
    public total = {value: 0, percentage: 0};
    public woundMalus = {max: 0, levelMod: 0, levels: [], mod: 0, nbrLevels: 5, value: 0}

    static defineSchema = HealthSchema;

    toObject() {
        const healthData = super.toObject();
        return {
            ...healthData,
            max: this.max,
            total: this.total,
            available: this.available,
            woundMalus: this.woundMalus,
            consumed: {...healthData.consumed, percentage: (this.consumed as any).percentage},
            exhausted: {...healthData.exhausted, percentage: (this.exhausted as any).percentage},
            channeled: {...healthData.channeled, percentage: (this.channeled as any).percentage}
        }
    }
}