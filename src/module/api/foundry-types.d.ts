type AnyConstructor = abstract new (...args: never) => unknown;
type AnyConcreteConstructor = new (...args: never) => unknown;

type Mixin<MixinClass extends AnyConcreteConstructor, BaseClass extends AnyConstructor> = MixinClass & BaseClass;

type DeepPartial<T extends object> = T extends object
    ? T extends readonly unknown[] | ((...args: never) => unknown) | (abstract new (...args: never) => unknown)
        ? T
        : { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }
    : T;

declare const __AppV2RenderContext: unique symbol;
declare const __AppV2Configuration: unique symbol;
declare const __AppV2RenderOptions: unique symbol;

declare const __ApplicationV2Brand: unique symbol;

declare namespace ApplicationV2 {
    namespace Internal {
        const __Configuration: typeof __AppV2Configuration;
        const __RenderOptions: typeof __AppV2RenderOptions;
        const __RenderContext: typeof __AppV2RenderContext;

        type Constructor = (abstract new (...args: never) => Instance.Any) & {
            [__ApplicationV2Brand]: never;
        };

        interface Instance<RenderContext extends object, Configuration extends object, RenderOptions extends object> {
            readonly [__RenderContext]: RenderContext;
            readonly [__Configuration]: Configuration;
            readonly [__RenderOptions]: RenderOptions;
        }

        namespace Instance {
            interface Any extends Instance<any, any, any> {}
        }
    }

    type RenderContextOf<Application extends ApplicationV2.Internal.Instance.Any> =
        Application[typeof ApplicationV2.Internal.__RenderContext];
}

declare class HandlebarsApplication {
    constructor(...args: any[]);

    readonly [__AppV2RenderContext]: {};
    readonly [__AppV2Configuration]: {};
    readonly [__AppV2RenderOptions]: {};

    static PARTS: Record<string, HandlebarsApplicationMixinNS.HandlebarsTemplatePart>;
    static TABS: Record<string, foundry.applications.types.ApplicationTabsConfiguration>;

    protected _prepareContext(
        options: HandlebarsApplicationMixinNS.RenderOptions
    ): Promise<foundry.applications.types.ApplicationRenderContext>;

    protected _preparePartContext(
        partId: string,
        context: ApplicationV2.RenderContextOf<this>,
        options: DeepPartial<HandlebarsApplicationMixinNS.RenderOptions>
    ): Promise<ApplicationV2.RenderContextOf<this>>;

    protected _onRender(
        context: foundry.applications.types.ApplicationRenderContext,
        options: HandlebarsApplicationMixinNS.RenderOptions
    ): Promise<void>;
}

declare function HandlebarsApplicationMixinTyped<BaseClass extends HandlebarsApplicationMixinNS.BaseClass>(
    BaseApplication: BaseClass
): HandlebarsApplicationMixinNS.Mix<BaseClass>;

declare namespace HandlebarsApplicationMixinNS {
    type BaseClass = ApplicationV2.Internal.Constructor;
    type Mix<BaseClass extends HandlebarsApplicationMixinNS.BaseClass> = Mixin<typeof HandlebarsApplication, BaseClass>;

    interface RenderOptions {
        parts: string[];
    }

    interface HandlebarsTemplatePart {
        template: string;
        id?: string | null | undefined;
        root?: boolean | null | undefined;
        classes?: string[] | null | undefined;
        templates?: string[] | null | undefined;
        scrollable?: string[] | null | undefined;
        forms?: Record<string, foundry.applications.types.ApplicationFormConfiguration> | null | undefined;
    }
}

declare namespace foundry {
    import ApplicationFormConfiguration = foundry.applications.types.ApplicationFormConfiguration;
    import ApplicationRenderContext = foundry.applications.types.ApplicationRenderContext;
    import DialogV2 = foundry.applications.api.DialogV2;

    interface DocumentSheetConfiguration {
        canCreate?: boolean;
        document: FoundryDocument;
        editPermission?: number;
        sheetConfig?: boolean;
        viewPermission?: number;
    }

    interface DialogV2Configuration {
        modal: boolean;
        buttons: Partial<DialogV2Button>[];
        content: string;
        submit: (result: unknown, dialog: DialogV2) => Promise<void>;
    }

    interface DialogV2Button {
        action: string;
        label: string;
        icon: string;
        class: string;
        default: boolean;
        callback: (
            event: PointerEvent | SubmitEvent,
            button: HTMLButtonElement,
            dialog: foundry.applications.api.DialogV2
        ) => Promise<unknown>;
    }

    interface DialogV2WaitOptions {
        close?: (event: Event, dialog: DialogV2) => unknown;
        rejectClose?: boolean;
        render?: (event: Event, dialog: DialogV2) => unknown;
    }

    namespace abstract {
        namespace types {
            interface DataModelCleaningOptions {
                fields?: boolean;
                joint?: boolean;
                partial?: boolean;
                source?: boolean;
                strict?: boolean;
            }

            interface DataModelUpdateOptions {
                clean?: boolean | Omit<DataModelCleaningOptions, "partial">;
                dryRun?: boolean;
                fallback?: boolean;
                recursive?: boolean;
                restoreDelta?: boolean;
                user?: unknown;
            }

            interface DatabaseUpdateOperation {
                _result?: (string | object)[];
                _updateData?: Record<string, object>;
                action: "update";
                broadcast: boolean;
                diff?: boolean;
                documentName: string;
                dryRun?: boolean;
                extractedImages?: Record<string, string>;
                modifiedTime?: number;
                noHook?: boolean;
                pack: string | null;
                parent?: FoundryDocument | null;
                parentUuid?: string | null;
                recursive?: boolean;
                render?: boolean;
                updates: object[];
            }

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

    namespace applications {
        namespace types {
            type ApplicationClickAction = (event: PointerEvent, target: HTMLElement) => Promise<void>;
            /**
             * Not a foundry type
             */
            type ApplicationAction =
                | string
                | ApplicationClickAction
                | {
                      buttons: number[];
                      handler: ApplicationClickAction;
                  };

            interface ApplicationTabsConfiguration {
                initial?: string;
                labelPrefix?: string;
                tabs: {
                    cssClass?: string;
                    icon?: string;
                    id: string;
                    label?: string;
                    tooltip?: string;
                }[];
            }

            interface ApplicationConfiguration {
                id: string;
                uniqueId: string;
                classes: string[];
                tag: string;
                window: Partial<ApplicationWindowConfiguration>;
                actions: Record<string, ApplicationAction>;
                form: Partial<ApplicationFormConfiguration>;
                position: Partial<ApplicationPosition>;

                [x: string]: unknown;
            }

            interface ApplicationWindowConfiguration {
                frame?: boolean;
                positioned?: boolean;
                title?: string;
                icon?: string | false;
                controls: ApplicationHeaderControlsEntry[];
                minimizable?: boolean;
                resizable?: boolean;
                contentTag?: string;
                contentClasses?: string[];
            }

            interface ApplicationFormConfiguration {
                handler: (event: Event, form: unknown, formData: unknown) => void;
                submitOnChange: boolean;
                closeOnSubmit: boolean;
            }

            interface ApplicationHeaderControlsEntry {
                icon: string;
                label: string;
                action: string;
                visible: boolean;
                ownership: string | number;
            }

            interface ApplicationPosition {
                top: number;
                left: number;
                width: number | "auto";
                height: number | "auto";
                scale: number;
                zIndex: number;
            }

            interface ApplicationRenderOptions {
                force?: boolean;
                isFirstRender?: boolean;
                parts?: string[];
                position?: ApplicationPosition;
                tab?: string | Record<string, string>;
                window?: ApplicationWindowRenderOptions;
            }

            interface ApplicationWindowRenderOptions {
                controls: boolean;
                icon: string | false;
                title: string;
            }

            interface ApplicationRenderContext {
                tabs?: Record<string, ApplicationTab>;

                [x: string]: unknown;
            }

            interface ApplicationTab {
                active: boolean;
                cssClass: string;
                group: string;
                icon?: string;
                id: string;
                label?: string;
                tooltip?: string;
            }
        }

        namespace api {
            import ApplicationConfiguration = foundry.applications.types.ApplicationConfiguration;
            import ApplicationRenderOptions = foundry.applications.types.ApplicationRenderOptions;
            import ApplicationRenderContext = foundry.applications.types.ApplicationRenderContext;
            import FormDataExtended = foundry.applications.ux.FormDataExtended;
            import ApplicationTab = foundry.applications.types.ApplicationTab;
            type FullDialogV2Config = foundry.applications.types.ApplicationConfiguration &
                foundry.DialogV2Configuration;

            /**
             * Type declarations for applications. incomplete, copied at V13
             * @see https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html
             */
            class DialogV2 extends ApplicationV2<FullDialogV2Config> {
                constructor(config: Partial<FullDialogV2Config>);

                static confirm(config: { content: string; rejectClose: boolean; modal: true }): Promise<boolean>;

                static prompt(config: Partial<FullDialogV2Config & DialogV2WaitOptions>): Promise<unknown>;

                render(options?: boolean | ApplicationRenderOptions): Promise<this>;

                get form(): null | HTMLFormElement;
            }

            /**
             * Type declarations for applications. incomplete, copied at V13
             * @see https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html
             */
            class ApplicationV2<
                CONFIGURATION extends ApplicationConfiguration = ApplicationConfiguration,
                RENDER_OPTIONS = ApplicationRenderOptions,
            > {
                static [__ApplicationV2Brand]: never;

                [__AppV2RenderContext]: ApplicationRenderContext;
                [__AppV2Configuration]: CONFIGURATION;
                [__AppV2RenderOptions]: RENDER_OPTIONS;

                constructor(options?: Partial<CONFIGURATION>);

                options: Readonly<CONFIGURATION>;

                get classList(): DOMTokenList;

                get element(): HTMLElement;

                get form(): HTMLFormElement | null;

                get rendered(): boolean;

                protected _prepareContext(options: RENDER_OPTIONS): Promise<ApplicationRenderContext>;

                render(options?: boolean | ApplicationRenderOptions): Promise<this>;

                submit(submitOptions?: object): Promise<any>;

                addEventListener(type: string, listener: (event: Event) => void): void;

                close(): void;
                _preClose(options: ApplicationRenderOptions): Promise<void>;

                protected _onRender(context: ApplicationRenderContext, options: RENDER_OPTIONS): Promise<void>;

                protected _onSubmitForm(
                    formConfig: ApplicationFormConfiguration,
                    event: Event | SubmitEvent
                ): Promise<void>;

                protected _prepareTabs(group: string): Record<string, ApplicationTab>;
            }

            class DocumentSheetV2 extends foundry.applications.api.ApplicationV2 {
                constructor(options: any, ...args: any[]);
                options: ApplicationConfiguration & DocumentSheetConfiguration;
                get document(): FoundryDocument;
                _prepareSubmitData(
                    event: SubmitEvent,
                    form: HTMLFormElement,
                    formData: FormDataExtended,
                    updateData?: object
                ): object;
            }

            const HandlebarsApplicationMixin: typeof HandlebarsApplicationMixinTyped;
        }

        namespace ux {
            class DragDrop {
                constructor(config: Partial<DragDropConfiguration>);
                permissions: Record<"dragstart" | "drop", (selector: string) => boolean>;
                bind(html: HTMLElement): this;
            }

            class FormDataExtended {
                //This class is a stub. Doc found https://foundryvtt.com/api/classes/foundry.applications.ux.FormDataExtended.html
                constructor(form: HTMLFormElement, options?: object);
                object: Record<string, unknown>;
            }
        }

        namespace sheets {
            import DocumentSheetV2 = foundry.applications.api.DocumentSheetV2;
            import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;

            class ItemSheetV2 extends DocumentSheetV2 {
                get actor(): Actor | null;
                get item(): Item;
                _onDragStart(event: DragEvent): Promise<void>;
            }

            class ActorSheetV2 extends DocumentSheetV2 {
                get actor(): Actor;

                _onDropDocument<T extends FoundryDocument>(
                    event: DragEvent,
                    document: FoundryDocument
                ): Promise<null | T>;

                _onDragStart(event: DragEvent): Promise<void>;

                _canDragStart(selector: string): boolean;
                _onDrop(event: DragEvent): Promise<void>;
            }

            class ActiveEffectConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
                _preparePartContext(
                    partId: string,
                    context: object,
                    options: object
                ): Promise<ApplicationRenderContext>;
                _processFormData(event: Event, form: HTMLFormElement, formData: unknown): object;
            }
        }
    }

    interface DragDropConfiguration {
        callbacks?: Record<
            "dragstart" | "drop" | "dragover" | "dragenter" | "dragleave" | "dragend",
            (event: DragEvent) => void
        >;
        dragSelector?: null | string;
        dropSelector?: null | string;
        permissions?: Record<"dragstart" | "drop", (selector: string) => boolean>;
    }
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
            readonly round: number; //defineSchema field. not actually part of the API
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
                get visible(): boolean;
            }
        }
    }
}
