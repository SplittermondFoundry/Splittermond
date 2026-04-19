import { ApplicationRenderContext, TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { foundryApi } from "module/api/foundryApi";
import { changeValue } from "module/util/commonHtmlHandlers";
import { splittermond } from "module/config";
import { FoundryDialog, type FoundryDialogType } from "module/api/Application";

interface RequestCheckFormData {
    skill?: string;
    difficulty?: number;
    skills?: { key: string; label: string }[];
}

export default class RequestCheckDialog extends FoundryDialog {
    static DEFAULT_OPTIONS = {
        classes: ["splittermond", "dialog", "dialog-request-check"],
        actions: {
            "inc-value": RequestCheckDialog.#increaseValue,
            "dec-value": RequestCheckDialog.#decreaseValue,
            "inc-value-3": RequestCheckDialog.#increaseBy3,
            "dec-value-3": RequestCheckDialog.#decreaseBy3,
        },
    };

    static async create(formData: RequestCheckFormData): Promise<void> {
        const enrichedFormData: RequestCheckFormData = {
            ...formData,
            skills: [...splittermond.skillGroups.general, ...splittermond.skillGroups.magic].map((skill: string) => ({
                key: skill,
                label: foundryApi.localize(`splittermond.skillLabel.${skill}`),
            })),
        };
        const html = await foundryApi.renderer(
            `${TEMPLATE_BASE_PATH}/apps/dialog/request-check-dialog.hbs`,
            enrichedFormData
        );

        const dlg = new this({
            window: {
                title: foundryApi.localize("splittermond.requestSkillCheck"),
            },
            content: html,
            buttons: [
                {
                    action: "cancel",
                    icon: '<i class="fas fa-times"></i>',
                    label: foundryApi.localize("splittermond.cancel"),
                },
                {
                    action: "ok",
                    default: true,
                    icon: '<i class="fas fa-check"></i>',
                    label: "OK",
                },
            ],
            submit: async (_result: unknown, dialog: FoundryDialogType) => {
                const skill = dialog.element.querySelector<HTMLSelectElement>('[name="skill"]')?.value ?? "";
                const difficulty = parseInt(
                    dialog.element.querySelector<HTMLInputElement>('[name="difficulty"]')?.value ?? ""
                );
                const skillLabel = foundryApi.localize(`splittermond.skillLabel.${skill}`);
                const versus = foundryApi.localize("splittermond.versus");
                const content = difficulty
                    ? `@SkillCheck[${skillLabel} ${versus} ${difficulty}]`
                    : `@SkillCheck[${skillLabel}]`;
                return foundryApi
                    .createChatMessage({
                        user: foundryApi.currentUser.id,
                        speaker: foundryApi.getSpeaker({}),
                        content,
                    })
                    .then(() => {});
            },
        });
        dlg.render({ force: true });
    }

    protected async _onRender(context: ApplicationRenderContext, options: {}): Promise<void> {
        await super._onRender(context, options);

        this.element.querySelector<HTMLInputElement>('input[name="difficulty"]')?.addEventListener("wheel", (event) => {
            if (!event.target) return;
            if (event.deltaY < 0) {
                RequestCheckDialog.#increaseValue(event, event.target as HTMLElement);
            } else {
                RequestCheckDialog.#decreaseValue(event, event.target as HTMLElement);
            }
        });
    }

    static #increaseValue(_event: Event, target: HTMLElement): void {
        changeValue((value) => value + 1).for(target);
    }

    static #decreaseValue(_event: Event, target: HTMLElement): void {
        changeValue((value) => value - 1).for(target);
    }

    static #increaseBy3(_event: Event, target: HTMLElement): void {
        changeValue((value) => value + 3).for(target);
    }

    static #decreaseBy3(_event: Event, target: HTMLElement): void {
        changeValue((value) => value - 3).for(target);
    }
}
