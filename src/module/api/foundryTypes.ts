import { DataModel } from "./DataModel";
import type { FoundryApplication } from "./Application";

export type FoundryCombat = foundry.documents.Combat;
export type FoundryCombatant = foundry.documents.Combatant;
export type FoundryScene = foundry.documents.Scene;

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

export enum ChatMessageTypes {
    OTHER,
    OOC,
    IC,
    EMOTE,
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
        items: Collection<Item>;
        readonly folder: string;
        system: Record<string, any>;
        owner: User;
        sheet: InstanceType<typeof FoundryApplication>; //true in the future, now we're still on AppV1

        get inCombat(): boolean;
    }

    class Item extends FoundryDocument {
        readonly actor: Actor;
        name: string;
        img: string;
        type: string;
        readonly folder: string;
        system: Record<string, any>;
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

        updateSource(data: object): void;

        update(data: object, context?: any): Promise<FoundryDocument>;

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
    }

    const CONFIG: {
        Item: { documentClass: Function; dataModels: Record<string, unknown> } & Record<string, unknown>;
        Actor: { documentClass: Function; dataModels: Record<string, unknown> } & Record<string, unknown>;
        ChatMessage: { documentClass: Function; dataModels: Record<string, unknown> } & Record<string, unknown>;
    } & Record<string, unknown>;
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
export interface CompendiumPacks extends Collection<foundry.documents.collections.CompendiumCollection> {}

declare namespace foundry {
    namespace documents {
        import CombatHistoryData = foundry.documents.types.CombatHistoryData;

        class Scene extends FoundryDocument {}

        class Combat extends FoundryDocument {
            readonly turns: Combatant[];
            readonly current: CombatHistoryData;
            combatants: Collection<Combatant>; //defineSchema field. not actually part of the API
            /**The scene this {@link Combat} is linked to. Is `null` when the combat is globally available */
            readonly scene: Scene | null; //defineSchema field. not actually part of the API
            readonly turn: number; //defineSchema field. not actually part of the API
            get isActive(): boolean;
            get started(): boolean;

            startCombat(): Promise<this>;
        }

        class Combatant extends FoundryDocument {
            get isDefeated(): boolean;
            get combat(): Combat;
            get visible(): boolean;
            get token(): TokenDocument | null;

            initiative: number | null; //defineSchema field. not actually part of the API
            tokenId: string | null; //defineSchema field. not actually part of the API
            actorId: string | null; //defineSchema field. not actually part of the API
            sceneId: string | null; //defineSchema field. not actually part of the API
        }

        namespace types {
            interface CombatHistoryData {
                combatantId: string | null;
                round: number | null;
                tokenId: string | null;
                turn: number | null;
            }
        }
        namespace collections {
            class CompendiumCollection {
                metadata: Record<string | symbol | number, unknown>;
                /**
                 * The index of the compendium collection. That is, the reduced data set
                 */
                index: Collection<Record<string | symbol | number, unknown>>;
                documentName: string;
                name: string;
                getIndex<T extends string>(options?: { fields?: T[] }): Promise<Collection<Record<T, unknown>>>;
            }
        }
    }
    namespace abstract {
        namespace types {
            interface DocumentClassMetadata {
                collection: string;
                compendiumIndexFields: string[];
                coreTypes: string[];
                embedded: Record<string, string>;
                hasTypeData: boolean;
                indexed: boolean;
                label: string;
                name: string;
                permissions: Record<
                    "update" | "delete" | "view" | "create",
                    | "INHERIT"
                    | "NONE"
                    | "LIMITED"
                    | "OBSERVER"
                    | "OWNER"
                    | "PLAYER"
                    | "TRUSTED"
                    | "ASSISTANT"
                    | "GAMEMASTER"
                    | DocumentPermissionTest
                >;
                preserveOnImport: string[];
                schemaVersion?: string;
            }
            type DocumentPermissionTest = (
                user: unknown, //actually BaseUser but I did not want to continue typing
                document: Document,
                data?: object
            ) => boolean;
        }
    }
}
