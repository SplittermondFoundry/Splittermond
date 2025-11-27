import { foundryApi } from "../../api/foundryApi";
import SplittermondActor from "../../actor/actor";
import { Roll } from "module/api/Roll";
import { ChatMessageModel, SplittermondChatMessage } from "../../data/SplittermondChatMessage";
import { FoundryChatMessage } from "../../api/ChatMessage";
import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";

interface ChatMessageConfig {
    type: string;
    mode?: string;
    whisper: string[];
    blind: boolean;
    rolls: Roll[];
}

function SplittermondChatCardModelSchema() {
    return {
        chatOptions: new fields.SchemaField(
            {
                type: new fields.StringField({ required: true, nullable: false }),
                mode: new fields.StringField({ required: false, blank: false, nullable: true }),
                rolls: new fields.ArrayField(new fields.StringField({}), {
                    required: true,
                    nullable: false,
                    initial: [],
                }),
                blind: new fields.BooleanField({ required: true, nullable: false }),
                whisper: new fields.ArrayField(new fields.StringField({}), {
                    required: true,
                    nullable: false,
                    initial: [],
                }),
            },
            { required: true, blank: false, nullable: false }
        ),
        messageId: new fields.StringField({ required: true, blank: false, nullable: true, initial: null }),
        speaker: new fields.ObjectField({ required: true, blank: false }),
    };
}
type SplittermondChatCardType = DataModelSchemaType<typeof SplittermondChatCardModelSchema>;
export class SplittermondChatCard extends SplittermondDataModel<SplittermondChatCardType> {
    static defineSchema() {
        return SplittermondChatCardModelSchema();
    }

    setMessageId(messageId: string) {
        this.updateSource({ messageId: messageId });
    }

    /**
     * @param actor The message inducing actor. Will take a user as speaker if null
     * @param message The message content object
     * @param chatOptions
     */
    static create(
        actor: SplittermondActor | null,
        message: ChatMessageModel,
        chatOptions: ChatMessageConfig
    ): SplittermondChatCard {
        const speaker = foundryApi.getSpeaker({ actor });
        const normalizedChatOptions = {
            ...chatOptions,
            rolls: chatOptions.rolls.map((r) => JSON.stringify(r)),
        };

        return new SplittermondChatCard(
            {
                speaker,
                chatOptions: normalizedChatOptions,
                messageId: null /*We set the ID internally*/,
            },
            message,
            foundryApi
        );
    }

    constructor(
        model: SplittermondChatCardType,
        public readonly system: ChatMessageModel,
        private foundryApiWrapper: typeof foundryApi
    ) {
        super(model);
    }

    async sendToChat() {
        const content = await render(this.system);

        const chatData = {
            blind: this.chatOptions.blind,
            user: this.foundryApiWrapper.currentUser.id,
            speaker: this.speaker,
            rolls: this.chatOptions.rolls,
            whisper: this.chatOptions.whisper,
            type: this.chatOptions.type,
            content,
            system: this.system,
            flags: {
                splittermond: {
                    chatCard: this.toObject(false),
                },
            },
        };

        const message = await this.foundryApiWrapper.createChatMessage(chatData);

        this.updateSource({ messageId: message.id });
    }
}

/**
 * @param data the dataset that was on the invoked element. Should contain an action to execute.
 * @param messageId the chat card message id
 */
export async function handleChatAction(data: unknown, messageId: string): Promise<void> {
    const chatCard = getChatCard(messageId);
    const isObjectWithAction = data && typeof data === "object" && "action" in data;

    if (isObjectWithAction && canBeKey(data.action)) {
        await chatCard.system
            .handleGenericAction({ ...data, action: data.action })
            .catch(() => throwNoActionError(chatCard, data, messageId));
        await updateMessage(chatCard);
    } else {
        throwNoActionError(chatCard, data, messageId);
    }
}

async function updateMessage(chatMessage: SplittermondChatMessage) {
    const content = await render(chatMessage.system);
    return await chatMessage.update({ content });
}

async function render(messageModel: ChatMessageModel) {
    return await foundryApi.renderer(messageModel.template, messageModel.getData());
}

export async function handleLocalChatAction(data: unknown, messageId: string) {
    const chatCard = getChatCard(messageId);
    const isObjectWithAction = data && typeof data === "object" && "localaction" in data;
    if (isObjectWithAction && canBeKey(data.localaction)) {
        return chatCard.system
            .handleGenericAction({ ...data, action: data.localaction })
            .catch(() => throwNoActionError(chatCard, data, messageId));
    } else {
        throwNoActionError(chatCard, data, messageId);
    }
}

function canBeKey(input: unknown): input is string {
    return typeof input === "string";
}

function getChatCard(messageId: string): SplittermondChatMessage {
    const chatMessage = foundryApi.messages.get(messageId);
    if (!chatMessage) {
        foundryApi.warnUser("splittermond.chatCard.messageNotFound");
        throw new Error("Could not find message with id " + messageId);
    }
    if (!isSplittermondChatMessage(chatMessage)) {
        throw new Error(`Message ${messageId} is has the wrong chat Message type`);
    }
    return chatMessage;
}

function isSplittermondChatMessage(chatMessage: FoundryChatMessage): chatMessage is SplittermondChatMessage {
    return (
        chatMessage instanceof SplittermondChatMessage &&
        "getData" in chatMessage.system &&
        "template" in chatMessage.system &&
        "handleGenericAction" in chatMessage.system
    );
}

function throwNoActionError(chatCard: SplittermondChatMessage, data: any, messageId: string) {
    foundryApi.warnUser("splittermond.chatCard.actionNotFound");
    throw new Error(`Action ${data.action} not found on chat card for message ${chatCard.type} with ${messageId}`);
}
