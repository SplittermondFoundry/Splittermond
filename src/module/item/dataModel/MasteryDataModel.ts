import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondMasteryItem from "../mastery";
import {getDescriptorFields} from "./commonFields";
import {migrateFrom0_12_10} from "./migrations";

function ItemMasteryDataModelSchema() {
    return {
        ...getDescriptorFields(),
        availableIn: new fields.StringField({ required: true, nullable:true }),
        modifier: new fields.StringField({ required: true, nullable: true}),
        skill: new fields.StringField({ required: true, nullable: false }),
        isGrandmaster: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        isManeuver: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    };
}
export type MasteryDataModelType = DataModelSchemaType<typeof ItemMasteryDataModelSchema>

export class MasteryDataModel extends SplittermondDataModel<MasteryDataModelType, SplittermondMasteryItem> {
    static defineSchema= ItemMasteryDataModelSchema;

    static migrateData(source:unknown){
        source = migrateFrom0_12_10(source);
        return super.migrateData(source);
    }
}
