import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";

function ItemProjectileDataModelSchema() {
    return {
        description: new fields.HTMLField({ required: true, nullable: true}),
        source: new fields.StringField({ required: true, nullable: false }),
        physicalProperties: new fields.SchemaField({
            quantity: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
            price: new fields.StringField({ required: true, nullable: true}),
            weight: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
            hardness: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
            complexity: new fields.StringField({ required: true, nullable: true}),
            availability: new fields.StringField({ required: true, nullable: true}),
            quality: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
            durability: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
            damageLevel: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
            sufferedDamage: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        }, { required: true, nullable: false }),
        skill: new fields.StringField({ required: true, nullable: false, initial: "craftmanship" }),
        subSkill: new fields.StringField({ required: true, nullable: false }),
        weapon: new fields.StringField({ required: true, nullable: true}),
        features: new fields.StringField({ required: true, nullable: true}),
    };
}

type ProjectileDataModelType = DataModelSchemaType<typeof ItemProjectileDataModelSchema>

export class ProjectileDataModel extends SplittermondDataModel<ProjectileDataModelType,SplittermondItem> {
    static defineSchema = ItemProjectileDataModelSchema;
}
