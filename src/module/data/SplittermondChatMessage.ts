import { ChatMessage } from "module/api/ChatMessage";
import { DataModelSchemaType, fields, SplittermondDataModel } from "./SplittermondDataModel";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";

export interface ChatMessageModel {
    template: string;

    getData(): object;

    handleGenericAction(data: { action: string }): Promise<void>;
}

export class SplittermondChatMessage extends ChatMessage {
    declare readonly system: ChatMessageModel;
}

function SimpleMessageSchema() {
    return {
        body: new fields.StringField({ required: true, trim: true, blank: false, nullable: true }),
        title: new fields.StringField({ required: true, blank: false }),
    };
}

type SplittermondTestRollMessageType = DataModelSchemaType<typeof SimpleMessageSchema>;

export class SimpleMessage
    extends SplittermondDataModel<SplittermondTestRollMessageType, SplittermondChatMessage>
    implements ChatMessageModel
{
    static defineSchema = SimpleMessageSchema;

    get template() {
        return `${TEMPLATE_BASE_PATH}/chat/simpleTemplate.hbs`;
    }

    getData() {
        return this.toObject();
    }

    alterTitle(newTitle: string) {
        this.updateSource({ title: newTitle });
    }

    alterBody(newBody: string) {
        this.updateSource({ body: newBody });
    }

    async handleGenericAction(data: Record<string, unknown>): Promise<void> {
        const action = data.action ?? data.localaction;
        if (action === "alterBody" && typeof data.body === "string") {
            this.alterBody(data.body);
        } else if (typeof data.title === "string") {
            this.alterTitle(data.title);
        }
    }
}
