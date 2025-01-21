import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";

function ItemMoonsignDataModelSchema() {
    return {
        description: new fields.HTMLField({required: true, nullable: true}),
        source: new fields.StringField({required: true, nullable: true}),
        enhancement: new fields.StringField({required: true, nullable: true}),
        secretGift: new fields.StringField({required: true, nullable: true}),
    };
}

type MoonsignDataModelType = DataModelSchemaType<typeof ItemMoonsignDataModelSchema>;

export class MoonsignDataModel extends SplittermondDataModel<MoonsignDataModelType, SplittermondItem> {
    static defineSchema = ItemMoonsignDataModelSchema;
}
