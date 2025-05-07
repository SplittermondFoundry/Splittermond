import {Roll} from "./Roll";

export declare class ChatMessage extends FoundryDocument {
    id: string;
    /** The Ids of the users that are to be addressed by this message*/
    whisper: string[];
    /** the message content, an HTML string*/
    content: string;

    rolls: Roll[];

    update(data: object): Promise<ChatMessage>

    getFlag(scope: string, key: string): object

    deleteDocuments(documentId: string[]): Promise<void>
}
export type FoundryChatMessage = ChatMessage;