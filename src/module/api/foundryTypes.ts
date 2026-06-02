import { DataModel } from "./DataModel";
import type { FoundryApplication } from "./Application";
import { MessageModeKey } from "./ChatMessage";
import type {FoundryActiveEffect} from "module/api/ActiveEffect";
import {foundry} from "module/api/foundry-types";

export type FoundryCombat = foundry.documents.Combat;
export type FoundryCombatant = foundry.documents.Combatant;
export type FoundryScene = foundry.documents.Scene;

export type DataModelUpdateOptions = foundry.abstract.types.DataModelUpdateOptions;
export type DatabaseUpdateOperation = foundry.abstract.types.DatabaseUpdateOperation;


export interface KeybindingActionConfig {
    editable?: KeybindingActionBinding[];
    hint?: string;
    name: string;
    namespace?: string;
    onDown?: Function;
    onUp?: Function;
    order?: number;
    precedence?: number;
    repeat?: boolean;
    reservedModifiers?: string[];
    restricted?: boolean;
    uneditable?: KeybindingActionBinding[];
}

export interface KeybindingActionBinding {
    index?: number;
    key: string;
    modifiers?: string[];
}

export interface Speaker {
    scene: string;
    actor: string | null;
    token: string | null;
    alias: string;
}

export enum ChatMessageStyles {
    OTHER,
    OOC,
    IC,
    EMOTE,
}
export interface ChatMessageMode {
    handler: (data: any) => void;
    icon: string;
    label: string;
}
export interface User {
    isGM: boolean;
    id: string;
    active: boolean;
    name: string;
    get targets(): { user: User; size: number } & Iterable<Token>;
    get character(): Actor | null;
    /** @internal*/
    set character(actor: Actor | null);
}

export interface Socket {
    on: (key: string, callback: (data: unknown) => void) => void;
    emit: (key: string, object: object) => void;
}

export interface Hooks {
    once: (key: string, callback: (...args: any[]) => void) => number;
    on: (key: string, callback: (...args: any[]) => void) => number;
    off: (key: string, id: number) => void;
    callAll(key: string, ...args: any[]): boolean;
    call(key: string, ...args: any[]): boolean;
}

export type SettingTypeMapper<T extends SettingTypes> = T extends typeof Number
    ? number
    : T extends typeof Boolean
      ? boolean
      : T extends typeof String
        ? string
        : T extends new () => object
          ? object
          : never;
export type SettingTypes = NumberConstructor | BooleanConstructor | StringConstructor;
export interface SettingsConfig<T extends SettingTypes> {
    name?: string;
    hint?: string;
    /** defaults to client */
    scope?: "world" | "client";
    /** will default to false if you not configurable. e.g. missing type */
    config: boolean;
    type: T;
    range?: T extends NumberConstructor ? { min: number; max: number; step: number } : never;
    default: InstanceType<T>;
    onChange?: (value: SettingTypeMapper<T>) => void;
    choices?: Record<string, InstanceType<T>>;
}

declare global {
    type Collection<T> = ReadonlyMap<string, T> &
        Omit<ReadonlyArray<T>, "length" | "push" | "pop" | "shift" | "unshift" | "splice" | "sort" | "reverse"> & {
            get contents(): T[];
        };

    /**
     * A folder in the Foundry VTT file system. Incomplete typing
     */
    class Folder extends FoundryDocument {
        readonly name: string;
        readonly id: string;
        /**
         * The type of {@link FoundryDocument} this folder contains. Typing is not complete.
         */
        readonly type: "Item" | "Actor" | "Scene";
        readonly children: Folder[];
        readonly ancestors: Folder[];
    }

    class Actor extends FoundryDocument {
        name: string;
        img: string;
        type: string;
        items: Collection<Item>;
        readonly folder: string;
        system: Record<string, any>;
        owner: User;

        get inCombat(): boolean;
        get isToken(): boolean;

        applyActiveEffects(phase:string):void;
        allApplicableEffects():Generator<FoundryActiveEffect,void,void>
    }

    class Item extends FoundryDocument {
        readonly actor: Actor;
        name: string;
        img: string;
        type: string;
        readonly folder: string;
        system: Record<string, any>;
        sort: number; //Yes they are really defined on the Item.
    }

    class Token {
        constructor(...args: any[]);

        document: TokenDocument;

        get controlled(): boolean;

        _onHoverOut(event: any): void;
        _onHoverIn(event: any): void;
        control(options?: { releaseOthers?: boolean }): boolean;
    }

    //This is not quite correct, global Combat is foundry.documents.Combat
    class Combat extends foundry.documents.Combat {}

    class TokenDocument extends FoundryDocument {
        /** this is at least true for all the purposes for which we use {@link TokenDocument}*/
        readonly parent: FoundryDocument;
        actor: Actor;
        x: number;
        y: number;
        get object(): Token;
    }

    class FoundryDocument extends DataModel<any, any> {
        constructor(data: Object, options?: Record<string, any>);

        readonly id: string;
        readonly documentName: string;
        readonly parent: FoundryDocument | undefined;
        readonly uuid: string;
        readonly metadata: foundry.abstract.types.DocumentClassMetadata;
        readonly effects: Collection<FoundryActiveEffect>;
        get sheet(): InstanceType<typeof FoundryApplication>;

        update(
            data: object,
            operation?: Partial<Omit<DatabaseUpdateOperation, "updates">>
        ): Promise<FoundryDocument>;

        createEmbeddedDocuments(embeddedName: string, data: object[], context?: object): Promise<FoundryDocument[]>;

        deleteEmbeddedDocuments(embeddedName: string, ids: string[], context?: object): Promise<FoundryDocument[]>;

        prepareBaseData(): void;

        testUserPermission(user: User, permission: string, options?: { exact?: boolean }): boolean;

        static deleteDocuments(documentId: string[]): Promise<void>;

        static create(data: object, options?: Record<string, any>): Promise<FoundryDocument>;

        /**
         * Computation of values that are not put to the database
         */
        prepareDerivedData(): void;

        getFlag(scope: string, key: string): unknown;

        setFlag(scope: string, key: string, value: unknown): Promise<FoundryDocument>;

        get isOwner(): boolean; //Defined on ClientDocument not the Document itself, but we're only dealing with ClientDocument anyway.
        get visible(): boolean; //Defined on ClientDocument not the Document itself
        get hasPlayerOwner(): boolean; //Defined on ClientDocument, not Document
    }

    const CONFIG: {
        Item: {
            documentClass: Function;
            dataModels: Record<string, unknown>;
        } & Record<string, unknown>;
        Actor: {
            documentClass: Function;
            dataModels: Record<string, unknown>;
        } & Record<string, unknown>;
        ChatMessage: {
            documentClass: Function;
            dataModels: Record<string, unknown>;
            modes: Record<MessageModeKey, ChatMessageMode>;
        } & Record<string, unknown>;
        Combat: {
            documentClass: Function;
            dataModels: Record<string, unknown>;
            fallbackTurnMarker: string;
        } & Record<string, unknown>;
        Dice: Record<string, unknown>;
        ActiveEffect: {
            documentClass: Function;
            dataModels: Record<string, unknown>;
            sheetClasses?: Record<string, Record<string, unknown>>;
        };
        dataModels: Record<string, unknown>;
    } & Record<string, unknown>;
}

export interface MergeObjectOptions {
    insertKeys?: boolean;
    insertValues?: boolean;
    overwrite?: boolean;
    inplace?: boolean;
    enforceTypes?: boolean;
    /* Forces the function to delete keys which are set to an instance of {@link foundry.data.operators.ForcedDeletion}.*/
    applyOperators?: boolean;
    recursive?: boolean;
}
export interface CompendiumPacks extends Collection<foundry.documents.collections.CompendiumCollection> {}

export declare class DataModelValidationFailure {
    public message: string;
}