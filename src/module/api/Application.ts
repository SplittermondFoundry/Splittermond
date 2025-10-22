/**
 * All types Straight from the foundry V13 API
 */
export interface DialogV2RenderOptions {
    force: boolean;
}

export interface DialogV2ConstructorInput
    extends foundry.applications.types.ApplicationConfiguration,
        foundry.DialogV2Configuration {}

declare namespace foundry {
    import ApplicationV2 = foundry.applications.api.ApplicationV2;
    import ApplicationFormConfiguration = foundry.applications.types.ApplicationFormConfiguration;
    import ApplicationRenderContext = foundry.applications.types.ApplicationRenderContext;
    import ApplicationTabsConfiguration = foundry.applications.types.ApplicationTabsConfiguration;
    import DialogV2 = foundry.applications.api.DialogV2;

    interface DialogV2Configuration {
        modal: boolean;
        buttons: Partial<DialogV2Button>[];
        content: string;
        submit: (result: unknown) => Promise<void>;
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

            /**
             * Type declarations for applications. incomplete, copied at V13
             * @see https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html
             */
            export class DialogV2 extends ApplicationV2<DialogV2ConstructorInput> {
                constructor(config: Partial<DialogV2ConstructorInput>);

                static confirm(config: { content: string; rejectClose: boolean; modal: true }): Promise<boolean>;

                static prompt(
                    config: Partial<ApplicationConfiguration & DialogV2Configuration & DialogV2WaitOptions>
                ): Promise<unknown>;

                render(options?: DialogV2RenderOptions): Promise<this>;
            }

            /**
             * Type declarations for applications. incomplete, copied at V13
             * @see https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html
             */
            export class ApplicationV2<
                CONFIGURATION extends ApplicationConfiguration = ApplicationConfiguration,
                RENDER_OPTIONS = ApplicationRenderOptions,
            > {
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
            export class DocumentSheetV2 extends foundry.applications.api.ApplicationV2 {
                _prepareSubmitData(
                    event: SubmitEvent,
                    form: HTMLFormElement,
                    formData: FormDataExtended,
                    updateData?: object
                ): object;
            }

            export function HandlebarsApplicationMixin<T extends ApplicationV2>(
                BaseApplication: new (...args: any[]) => T
            ): new (...args: ConstructorParameters<typeof HandlebarsApplication>) => HandlebarsApplication & T;
        }

        namespace ux {
            class DragDrop {
                constructor(config: Partial<DragDropConfiguration>);
                permissions: Record<"dragstart" | "drop", (selector: string) => boolean>;
                bind(html: HTMLElement): this;
            }

            class FormDataExtended {
                //This class is a stub. Doc found https://foundryvtt.com/api/classes/foundry.applications.ux.FormDataExtended.html
            }
        }

        namespace sheets {
            import DocumentSheetV2 = foundry.applications.api.DocumentSheetV2;

            class ItemSheetV2 extends DocumentSheetV2 {
                get actor(): Actor | null;
                get item(): Item;
            }
            class ActorSheetV2 extends DocumentSheetV2 {}
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

    interface HandlebarsRenderOptions {
        parts: string[];
    }

    interface HandlebarsTemplatePart {
        classes?: string[];
        forms?: Record<string, ApplicationFormConfiguration>;
        id?: string;
        root?: boolean;
        scrollable?: string[];
        template: string;
        templates?: string[];
    }

    /**
     * Adds Handlebars rendering capabilities to an Application.
     * @see https://foundryvtt.com/api/classes/foundry.HandlebarsApplication.html
     */
    class HandlebarsApplication extends ApplicationV2 {
        static TABS: Record<string, ApplicationTabsConfiguration>;
        static PARTS: Record<string, HandlebarsTemplatePart>;

        tabGroups: Record<string, null | string>;

        protected _preparePartContext(
            partId: string,
            context: ApplicationRenderContext,
            options: HandlebarsRenderOptions
        ): Promise<ApplicationRenderContext>;

        changeTab(
            tab: string,
            group: string,
            options?: {
                event?: Event;
                force?: boolean;
                navElement?: HTMLElement;
                updatePosition?: boolean;
            }
        ): void;

        protected _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext>;

        protected _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

        _configureRenderOptions(options: unknown): void;
    }
}

export const FoundryDialog = foundry.applications.api.DialogV2;
export const FoundryApplication = foundry.applications.api.ApplicationV2;
export const FoundryItemSheet = foundry.applications.sheets.ItemSheetV2;
export const FoundryActorSheet = foundry.applications.sheets.ActorSheetV2;
export const FoundryHandlebarsMixin = foundry.applications.api.HandlebarsApplicationMixin;

export class FoundryDragDrop extends foundry.applications.ux.DragDrop {}
