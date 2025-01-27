import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import {NpcDataModel} from "./NpcDataModel";


function NpcAttributeSchema(){
    return {
        value: new fields.NumberField({required: true, nullable: false, initial: 2})
    }
}

export type NpcAttributeType = DataModelSchemaType<typeof NpcAttributeSchema>

export class NpcAttribute extends SplittermondDataModel<NpcAttributeType, NpcDataModel>{
    static defineSchema = NpcAttributeSchema;

    static migrateData(source:unknown){
        source = this.migrateFrom0_12_6(source);
        return super.migrateData(source);
    }

    //Migration from data model at v0.12.6
    static migrateFrom0_12_6(source:unknown){
        //We're disregarding the species attribute, it should have no bearing on npcs in any case.
        console.log("Migrating NPC attribute data", source);
        if(!!source && typeof source === "object" && !("value" in source)){
            if("initial" in source && "advances" in source && typeof source.initial === "number" && typeof source.advances === "number"){
                (source as Record<string,any>)["value"] = source.initial + source.advances;
            }
        }
        return source;
    }

    /**
     * @deprecated
     * Only exists to preserve compatibility with the older attributes class
     */
    get species(){
        return 0
    }

    /**
     * @deprecated
     * Only exists to preserve compatibility with the older attributes class
     */
    get initial(){
        return this.value;
    }

    /**
     * @deprecated
     * Only exists to preserve compatibility with the older attributes class
     */
    get advances(){
        return 0;
    }


}



