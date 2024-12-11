export interface ChatMessage {
    id: string,
    /** The Ids of the users that are to be addressed by this message*/
    whisper: string[],
    /** the message content, an HTML string*/
    content: string,

    rolls: Roll[],

    update(data: object): Promise<ChatMessage>

    getFlag(scope: string, key: string): object

    deleteDocuments(documentId:string[]):Promise<void>
}

export enum ChatMessageTypes {
    OTHER,
    OOC,
    IC,
    EMOTE
}

export interface User {
    isGM: boolean;
    id: string;
    active: boolean;
}

export interface Socket {
    on: (key: string, callback: (data:unknown) => void) => void;
    emit: (key: string, object: object) => void;
}

export interface Hooks {
    once: (key: string, callback: (...args:any[]) => void) => number;
    on: ((key: string, callback: (...args:any[]) => void) => number);
    off: (key:string, id:number) => void;
}

export interface Die {
    faces: number;
    results: { active: boolean, result: number }[]
}

export interface OperatorTerm {
    operator: string;

}

export interface NumericTerm {
    number: number;
}

export interface Roll {
    evaluate: () => Promise<Roll>;
    _total: number
    readonly total: number
    dice: Die[]
    terms: (Die | OperatorTerm | NumericTerm)[]
}

declare global {
    type Collection<T> = ReadonlyMap<string, T>

    class Actor extends FoundryDocument {
        items: Collection<Item>
    }

    class Item extends FoundryDocument {
        readonly actor: Actor
        name: string;
        type:string;
    }

    class TokenDocument extends FoundryDocument {
        /** this is at least true for all the purposes for which we use {@link TokenDocument}*/
        readonly parent: FoundryDocument;
        actor: Actor;
    }

    class FoundryDocument {
        constructor(data:Object, options?:Record<string, any>);
        readonly id: string
        readonly documentName: string
        readonly parent?: FoundryDocument
    }
}