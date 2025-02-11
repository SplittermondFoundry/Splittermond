import {addToRegistry} from "../../../module/util/chat/chatMessageRegistry";
import {
    DataModelSchemaType,
    fields,
    SplittermondDataModel
} from "../../../module/data/SplittermondDataModel.js";
import {SplittermondChatMessage} from "../../../module/data/SplittermondChatCardModel";
import {DataModelConstructorInput} from "../../../module/api/DataModel";

const constructorRegistryKey = "SplittermondTestRollMessage";

function SplittermondTestRollMessageSchema(){
    return {
        constructorKey: new fields.StringField({required: true, trim:true, blank: false, nullable:false}),
        title: new fields.StringField({required: true, blank: false}),
    }
}

type SplittermondTestRollMessageType = DataModelSchemaType<typeof SplittermondTestRollMessageSchema>;

export class SplittermondTestRollMessage extends SplittermondDataModel<SplittermondTestRollMessageType> implements SplittermondChatMessage{

    static defineSchema = SplittermondTestRollMessageSchema;

    constructor(data: Omit<DataModelConstructorInput<SplittermondTestRollMessageType>,"constructorKey">) {
        super({...data, constructorKey : constructorRegistryKey});
    }


    get template(){
        return "systems/splittermond/templates/__tests__/integration/resources/testTemplate.hbs";
    }

    getData(){
        return {
            title: this.title,
        }
    }

    alterTitle(){
        this.updateSource({title: this.title + "2"});
    }

    handleGenericAction(){
        this.alterTitle();
        return Promise.resolve();
    }
}

addToRegistry(constructorRegistryKey, SplittermondTestRollMessage);