import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondWeaponItem from "../weapon";

function ItemWeaponDataModelSchema() {
    return {
        description: new fields.HTMLField({required: true, nullable: false}),
        source: new fields.StringField({required: true, nullable: false}),
        physicalProperties: new fields.SchemaField({
            quantity: new fields.NumberField({required: true, nullable: true, initial: 1}),
            price: new fields.StringField({required: true, nullable: true}),
            weight: new fields.NumberField({required: true, nullable: true, initial: 0}),
            hardness: new fields.NumberField({required: true, nullable: true, initial: 0}),
            complexity: new fields.StringField({required: true, nullable: true}),
            availability: new fields.StringField({required: true, nullable: true}),
            quality: new fields.NumberField({required: true, nullable: true, initial: 0}),
            durability: new fields.NumberField({required: true, nullable: true, initial: 0}),
            damageLevel: new fields.NumberField({required: true, nullable: true, initial: 0}),
            sufferedDamage: new fields.NumberField({required: true, nullable: true, initial: 0}),
        }, {required: true, nullable: false}),
        modifier: new fields.StringField({required: true, nullable: true}),
        damage: new fields.StringField({required: true, nullable: true}),
        range: new fields.NumberField({required: true, nullable: true, initial: 0}),
        weaponSpeed: new fields.NumberField({required: true, nullable: true, initial: 0}),
        skill: new fields.StringField({required: true, nullable: false}),
        skillMod: new fields.NumberField({required: true, nullable: false, initial: 0}),
        features: new fields.StringField({required: true, nullable: false}),
        attribute1: new fields.StringField({required: true, nullable: false}),
        attribute2: new fields.StringField({required: true, nullable: false}),
        minAttributes: new fields.StringField({required: true, nullable: false}),
        prepared: new fields.BooleanField({required: true, nullable: false, initial: false}),
        equipped: new fields.BooleanField({required: true, nullable: false, initial: false}),
        secondaryAttack: new fields.SchemaField({
            skill: new fields.StringField({required: true, nullable: true, initial: "none"}),
            skillMod: new fields.NumberField({required: true, nullable: true, initial: 0}),
            attribute1: new fields.StringField({required: true, nullable: true}),
            attribute2: new fields.StringField({required: true, nullable: true}),
            damage: new fields.StringField({required: true, nullable: true}),
            range: new fields.NumberField({required: true, nullable: true, initial: 0}),
            weaponSpeed: new fields.NumberField({required: true, nullable: true, initial: 0}),
            minAttributes: new fields.StringField({required: true, nullable: true}),
            features: new fields.StringField({required: true, nullable: true}),
        }, {required: false, nullable: false}),
    };
}

export type WeaponDataModelType = DataModelSchemaType<typeof ItemWeaponDataModelSchema>

export class WeaponDataModel extends SplittermondDataModel<WeaponDataModelType, SplittermondWeaponItem> {
    static defineSchema = ItemWeaponDataModelSchema;
}
