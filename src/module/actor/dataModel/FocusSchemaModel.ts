import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import {CharacterDataModel} from "./CharacterDataModel";


function FocusSchema() {
    return {
        consumed: new fields.SchemaField({
            value: new fields.NumberField({required: true, nullable: false, initial: 0, validate:(x:number) => x >= 0}),
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
    }
}


export type FocusType = DataModelSchemaType<typeof FocusSchema>;

/**
 * The ephermaral values and the overwriting of the toObject method exists, because the actore, upon {@link Actor#_prepareHealthFocus}
 * will extend the values of the health data model. However, Foundry, given a schema will only export values present in that schema.
 */
export class FocusDataModel extends SplittermondDataModel<FocusType, CharacterDataModel> {
    public max: number | null = null;
    public available = {value: 0, percentage: 0};
    public total = {value: 0, percentage: 0};
    static defineSchema = FocusSchema;

    public toObject() {
        const focusData = super.toObject();
        return {
            ...focusData,
            max: this.max,
            total: this.total,
            available: this.available,
            consumed: {...focusData.consumed, percentage: (this.consumed as any).percentage},
            exhausted: {...focusData.exhausted, percentage: (this.exhausted as any).percentage},
            channeled: {...focusData.channeled, percentage: (this.channeled as any).percentage}
        }
    }


}