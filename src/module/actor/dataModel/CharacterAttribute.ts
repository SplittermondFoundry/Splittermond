import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { CharacterDataModel } from "./CharacterDataModel";

function CharacterAttributeSchema() {
    return {
        species: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        initial: new fields.NumberField({ required: true, nullable: false, initial: 2 }),
        advances: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    };
}

type CharacterAttributeType = DataModelSchemaType<typeof CharacterAttributeSchema>;

export class CharacterAttribute extends SplittermondDataModel<CharacterAttributeType, CharacterDataModel> {
    static defineSchema = CharacterAttributeSchema;

    get value() {
        return this.initial + this.advances;
    }
}
