
export interface DialogV2RenderOptions {
    force: boolean
}

export interface DialogV2ConstructorInput extends Partial<foundry.abstract.types.ApplicationConfiguration>, Partial<foundry.DialogV2Configuration> {

}


declare namespace foundry {

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
        callback: ((event: PointerEvent | SubmitEvent, button: HTMLButtonElement, dialog: foundry.applications.api.DialogV2) => Promise<unknown>);
    }

    namespace abstract {
        /** All types Straight from the foundry V12 API */
        namespace types {
            interface ApplicationConfiguration {
                id: string;
                uniqueId: string;
                classes: string[];
                tag: string;
                window: Partial<ApplicationWindowConfiguration>;
                actions: Record<string, (event: Event, target: unknown) => Promise<void> | {
                    handler: (event: Event, target: unknown) => Promise<void>;
                    buttons: number[];
                }>;
                form: Partial<ApplicationFormConfiguration>;
                position: Partial<ApplicationPosition>;
            }

            interface ApplicationWindowConfiguration {
                frame: boolean;
                positioned: boolean;
                title: string;
                icon: string | false;
                controls: ApplicationHeaderControlsEntry[];
                minimizable: boolean;
                resizable: boolean;
                contentTag: string;
                contentClasses: string[];
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
        }
    }
    namespace applications {
        namespace api {
            export class DialogV2 {
                protected element: HTMLElement;

                constructor(config: Partial<DialogV2ConstructorInput>);

                static confirm(config: { content: string, rejectClose: boolean, modal: true }): Promise<boolean>;

                //To lazy to actually type this right now.
                static prompt(config: unknown): Promise<unknown>;

                render(options?: DialogV2RenderOptions): Promise<this>;

                addEventListener(type: "close", listener: (event: Event) => void): void;
                close():void;
            }
        }
    }
}


export const FoundryDialog = foundry.applications.api.DialogV2
