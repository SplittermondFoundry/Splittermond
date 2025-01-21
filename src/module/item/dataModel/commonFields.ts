import {fields} from "../../data/SplittermondDataModel";

export function getPhysicalProperties(){
    return new fields.SchemaField({
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
    }, { required: true, nullable: false });
}

export function getDescriptorFields(){
    return {
        description: new fields.HTMLField({ required: true, nullable: true}),
        source: new fields.StringField({ required: true, nullable: true}),
    }
}

export function getDefense(){
    return new fields.SchemaField({
        tickMalus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        defenseBonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        handicap: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }, { required: true, nullable: false });
}