import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import {fields} from "../../data/SplittermondDataModel";
import SplittermondActor from "../actor";

function NpcDataModelSchema() {
    return {
        derivedAttributes: new fields.SchemaField({
            size: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            speed: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            initiative: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            healthpoints: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            focuspoints: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            defense: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            bodyresist: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            mindresist: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
        }, {required: true, nullable: false}),
        sex: new fields.StringField({required: true, nullable: false}),
        type: new fields.StringField({required: true, nullable: false}),
        level: new fields.StringField({required: true, nullable: false}),
        damageReduction: new fields.SchemaField({
            value: new fields.NumberField({required: true, nullable: false, initial: 0}),
        }, {required: true, nullable: false}),
        attacks: new fields.ArrayField(
            new fields.ObjectField({required: true, nullable: false}),
            {required: true, nullable: false, initial: []}),
        biography: new fields.StringField({required: true, nullable: false}),
        attributes: new fields.SchemaField({
            charisma: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            agility: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            intuition: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            constitution: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            mystic: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            strength: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            mind: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            willpower: new fields.SchemaField({
                species: new fields.NumberField({required: true, nullable: false, initial: 0}),
                initial: new fields.NumberField({required: true, nullable: false, initial: 2}),
                advances: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
        }, {required: true, nullable: false}),
        skills: new fields.SchemaField({
            melee: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            slashing: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            chains: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            blades: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            longrange: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            staffs: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            throwing: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            acrobatics: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            alchemy: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            leadership: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            arcanelore: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            athletics: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            performance: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            diplomacy: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            clscraft: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            empathy: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            determination: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            dexterity: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            history: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            craftmanship: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            heal: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            stealth: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            hunting: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            countrylore: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            nature: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            eloquence: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            locksntraps: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            swim: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            seafaring: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            streetlore: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            animals: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            survival: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            perception: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            endurance: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            antimagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            controlmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            motionmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            insightmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            stonemagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            firemagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            healmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            illusionmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            combatmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            lightmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            naturemagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            shadowmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            fatemagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            protectionmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            enhancemagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            deathmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            transformationmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            watermagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            windmagic: new fields.SchemaField({
                points: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
        }, {required: true, nullable: false}),
        health: new fields.SchemaField({
            consumed: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            exhausted: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            channeled: new fields.SchemaField({
                entries: new fields.ArrayField(
                    new fields.SchemaField({
                        description: new fields.StringField({required: true, nullable: false}),
                        costs: new fields.NumberField({required: true, nullable: false}),
                    }, {required: true, nullable: false}),
                    {required: true, nullable: false, initial: []}),
            }, {required: true, nullable: false}),
        }, {required: true, nullable: false}),
        focus: new fields.SchemaField({
            consumed: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            exhausted: new fields.SchemaField({
                value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            }, {required: true, nullable: false}),
            channeled: new fields.SchemaField({
                entries: new fields.ArrayField(
                    new fields.SchemaField({
                        description: new fields.StringField({required: true, nullable: false}),
                        costs: new fields.NumberField({required: true, nullable: false}),
                    }, {required: true, nullable: false}),
                    {required: true, nullable: false, initial: []}),
            }, {required: true, nullable: false}),
        }, {required: true, nullable: false}),
        currency: new fields.SchemaField({
            S: new fields.NumberField({required: true, nullable: false, initial: 0}),
            L: new fields.NumberField({required: true, nullable: false, initial: 0}),
            T: new fields.NumberField({required: true, nullable: false, initial: 0}),
        }, {required: true, nullable: false}),
    };
}

type NpcDataModelSchemaType = DataModelSchemaType<typeof NpcDataModelSchema>

export class NpcDataModel extends SplittermondDataModel<NpcDataModelSchemaType, SplittermondActor> {
    static defineSchema = NpcDataModelSchema;
}