import {DataModel} from "./DataModel";

export interface ChatMessage {
    id: string,
    /** The Ids of the users that are to be addressed by this message*/
    whisper: string[],
    /** the message content, an HTML string*/
    content: string,

    rolls: Roll[],

    update(data: object): Promise<ChatMessage>

    getFlag(scope: string, key: string): object

    deleteDocuments(documentId: string[]): Promise<void>
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
    on: (key: string, callback: (data: unknown) => void) => void;
    emit: (key: string, object: object) => void;
}

export interface Hooks {
    once: (key: string, callback: (...args: any[]) => void) => number;
    on: ((key: string, callback: (...args: any[]) => void) => number);
    off: (key: string, id: number) => void;
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

export type SettingTypeMapper<T extends SettingTypes> = T extends typeof Number ? number:T extends typeof Boolean?boolean:T extends typeof String?string:never;
export type SettingTypes = NumberConstructor|BooleanConstructor|StringConstructor;
export interface SettingsConfig<T extends SettingTypes> {
    name?: string;
    hint?: string;
    /** defaults to client */
    scope?: "world" | "client";
    /** will default to false if you not configurable. e.g. missing type */
    config: boolean;
    type: T;
    range?: T extends NumberConstructor ? {min: number, max:number, step:number}: never;
    default: InstanceType<T>;
    onChange?: (value: SettingTypeMapper<T>) => void;
    choices?: Record<string, InstanceType<T>>
}

declare global {
    type Collection<T> = ReadonlyMap<string, T> & ReadonlyArray<T>

    class Actor extends FoundryDocument {
        items: Collection<Item>
        system: Record<string, any>
    }

    class Item extends FoundryDocument {
        readonly actor: Actor
        name: string;
        type: string;
        system: Record<string, any>
    }

    class TokenDocument extends FoundryDocument {
        /** this is at least true for all the purposes for which we use {@link TokenDocument}*/
        readonly parent: FoundryDocument;
        actor: Actor;
    }

    class FoundryDocument extends DataModel<any,any>{
        constructor(data: Object, options?: Record<string, any>);

        readonly id: string
        readonly documentName: string
        readonly parent: FoundryDocument|undefined
        updateSource(data: object): void;

        prepareBaseData(): void;

        /**
         * Computation of values that are not put to the database
         */
        prepareDerivedData(): void;
    }

    const CONFIG:{
        Item: {documentClass: Function, dataModels:Record<string, unknown>} & Record<string, unknown>
        Actor: {documentClass: Function, dataModels:Record<string, unknown>} & Record<string, unknown>
    } & Record<string, unknown>
}

export interface MergeObjectOptions {
    insertKeys?: boolean;
    insertValues?: boolean;
    overwrite?: boolean;
    inplace?: boolean;
    enforceTypes?: boolean;
    /** <p>Forces the function to interpret keys that start with -= as deletion instructions.
     *  E.g. If  set to <em> true</em> {"-=k1": null} will delete k1 from the object.</p>
     *  <p><strong>DO NOT USE THIS.</strong> if this prop is set to false, "-=k1" will be added to the object. </p>
     */
    performDeletions?: boolean;
}
