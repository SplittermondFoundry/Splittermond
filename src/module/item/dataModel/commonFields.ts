import {fieldExtensions, fields} from "../../data/SplittermondDataModel";
import {DamageType} from "../../config/damageTypes";
import {splittermond} from "../../config";

export function getPhysicalProperties() {
    return {
        quantity: new fields.NumberField({required: true, nullable: true, initial: 1}),
        price: new fields.StringField({required: true, nullable: true}),
        weight: new fields.NumberField({required: true, nullable: true, initial: 0}),
        hardness: new fields.NumberField({required: true, nullable: true, initial: 0}),
        complexity: new fields.StringField({required: true, nullable: true, initial: "U"}),
        availability: new fields.StringField({required: true, nullable: true, initial: "Dorf"}),
        quality: new fields.NumberField({required: true, nullable: true, initial: 0}),
        durability: new fields.NumberField({required: true, nullable: true, initial: 0}),
        damageLevel: new fields.NumberField({required: true, nullable: true, initial: 0}),
        sufferedDamage: new fields.NumberField({required: true, nullable: true, initial: 0}),
    }
}

export function getDescriptorFields() {
    return {
        description: new fields.HTMLField({required: true, nullable: true}),
        source: new fields.StringField({required: true, nullable: true}),
    }
}

export function getDefense() {
    return {
        tickMalus: new fields.NumberField({required: true, nullable: false, initial: 0}),
        defenseBonus: new fields.NumberField({required: true, nullable: false, initial: 0}),
        handicap: new fields.NumberField({required: true, nullable: false, initial: 0}),
    }
}

export function damageType() {
    return {
        damageType: new fieldExtensions.StringEnumField({
                validate: (x:DamageType) => x == null || splittermond.damageTypes.includes(x),
                required: true,
                trim: true,
                nullable: true,
                blank: false,
                initial: "physical",
            }
        )
    };
}