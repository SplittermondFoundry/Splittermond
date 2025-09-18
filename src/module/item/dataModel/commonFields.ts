import { fieldExtensions, fields } from "../../data/SplittermondDataModel";
import { DamageType } from "../../config/damageTypes";
import { splittermond } from "../../config";
import { CostType, costTypes } from "../../util/costs/costTypes";
import { DamageModel } from "./propertyModels/DamageModel";

export function getPhysicalProperties() {
    return {
        quantity: new fields.NumberField({ required: true, nullable: true, initial: 1 }),
        price: new fields.StringField({ required: true, nullable: true }),
        weight: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        hardness: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        complexity: new fields.StringField({ required: true, nullable: true, initial: "U" }),
        availability: new fields.StringField({ required: true, nullable: true, initial: "Dorf" }),
        quality: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        durability: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        damageLevel: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
        sufferedDamage: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    };
}

export function getDescriptorFields() {
    return {
        description: new fields.HTMLField({ required: true, nullable: true }),
        source: new fields.StringField({ required: true, nullable: true }),
    };
}

export function getDefense() {
    return {
        tickMalus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        defenseBonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        handicap: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    };
}

function damageDataField() {
    return new fields.EmbeddedDataField(DamageModel, { required: true, nullable: false });
}
export function damage() {
    return {
        damage: damageDataField(),
        damageType: new fieldExtensions.StringEnumField({
            validate: (x: DamageType) => x == null || splittermond.damageTypes.includes(x),
            required: true,
            trim: true,
            nullable: true,
            blank: false,
            initial: "physical",
        }),
        costType: new fieldExtensions.StringEnumField({
            validate: (x: CostType) => x == null || costTypes.includes(x),
            required: true,
            trim: true,
            nullable: true,
            blank: false,
            initial: "V",
        }),
    };
}

export function validatedBoolean() {
    // noinspection PointlessBooleanExpressionJS
    return new fields.BooleanField({
        required: true,
        nullable: false,
        initial: false,
        //Not pointless, I literally want to check that we only get literal 'true' of 'false' here, no other truthy of falsy value
        validate: (x) => x === true || x === false,
    });
}
