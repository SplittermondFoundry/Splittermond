import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";

function ItemSpellEffectDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable: true }),
        active: new fields.BooleanField({ required: true, nullable: true, initial: true }),
    };
}

export type SpellEffectDataModelType = DataModelSchemaType<typeof ItemSpellEffectDataModelSchema>;

export class SpellEffectDataModel extends SplittermondDataModel<SpellEffectDataModelType, SplittermondItem> {
    static defineSchema = ItemSpellEffectDataModelSchema;
}
