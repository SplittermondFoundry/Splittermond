import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import { NpcDataModel } from "./NpcDataModel";

function NpcAttributeSchema() {
    return {
        value: new fields.NumberField({ required: true, nullable: false, initial: 2 }),
    };
}

export type NpcAttributeType = DataModelSchemaType<typeof NpcAttributeSchema>;

export class NpcAttribute extends SplittermondDataModel<NpcAttributeType, NpcDataModel> {
    static defineSchema = NpcAttributeSchema;

    /**
     * @deprecated
     * Only exists to preserve compatibility with the older attributes class
     */
    get species() {
        return 0;
    }

    /**
     * @deprecated
     * Only exists to preserve compatibility with the older attributes class
     */
    get initial() {
        return this.value;
    }

    /**
     * @deprecated
     * Only exists to preserve compatibility with the older attributes class
     */
    get advances() {
        return 0;
    }
}
