import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { IllegalStateException } from "module/data/exceptions";
import type { FumbledCheckData, FumbleDialogResult } from "module/actor/fumble/DataTypes";

interface FumbleDialogOptions extends Omit<FumbledCheckData, "askUser"> {
    isPriest: boolean;
    lowerFumbleResult: number;
}

type PromiseResolve<T> = Parameters<ConstructorParameters<typeof Promise<T>>[0]>[0];
type PromiseReject<T> = Parameters<ConstructorParameters<typeof Promise<T>>[0]>[1];

export class FumbleDialog extends FoundryDialog {
    constructor(
        resolve: PromiseResolve<FumbleDialogResult>,
        reject: PromiseReject<FumbleDialogResult>,
        fumbleData: FumbleDialogOptions
    ) {
        super({
            window: { title: "splittermond.magicFumble" },
            content: populateHtml(`${fumbleData.eg}`, fumbleData.costs, `${fumbleData.lowerFumbleResult}`),
            position: {
                width: 400,
            },
            buttons: [
                {
                    action: "cancel",
                    icon: '<i class="fas fa-times"></i>',
                    label: foundryApi.localize("splittermond.cancel"),
                },
                {
                    action: "priest",
                    default: fumbleData.isPriest,
                    icon: '<i class="fas fa-check"></i>',
                    label: foundryApi.localize("splittermond.priest"),
                },
                {
                    action: "sorcerer",
                    default: !fumbleData.isPriest,
                    icon: '<i class="fas fa-check"></i>',
                    label: foundryApi.localize("splittermond.sorcerer"),
                },
            ],
            submit: async (result: unknown, dialog: FumbleDialog) => {
                if (typeof result !== "string") {
                    throw new IllegalStateException("Result should be a string here");
                }
                if (!result) reject();
                const form = getForm(dialog);
                const egValue = selectInput(form, "eg").value;
                const lowerFumbleResultValue = selectInput(form, "lowerFumbleResult").value;

                const eg = parseInt(egValue ?? "NaN");
                const costs = selectInput(form, "costs").value;
                const lowerFumbleResult = parseInt(lowerFumbleResultValue ?? "NaN");
                resolve({
                    skill: fumbleData.skill,
                    eg: isNaN(eg) ? fumbleData.eg : eg,
                    costs: costs || fumbleData.costs,
                    lowerFumbleResult: isNaN(lowerFumbleResult) ? fumbleData.lowerFumbleResult : lowerFumbleResult,
                });
            },
        });
    }
}

function populateHtml(eg: string, costs: string, lowerFumbleResult: string) {
    return `
    <form>
        <div class="properties-editor">
            <label for="eg">
                ${foundryApi.localize("splittermond.negativeDegreeOfSuccess")}
            </label>
            <input name='eg' type='text' value='${eg}' data-dtype='Number'>
            <label for='costs'>
                ${foundryApi.localize("splittermond.focusCosts")}
            </label>
            <input name='costs' type='text' value='${costs}' data-dtype='Number'>
            <label for="lowerFumbleResult" title="${foundryApi.localize("splittermond.lowerFumbleResultHelp")}">
                ${foundryApi.localize("splittermond.lowerFumbleResult")}
            </label>
            <input title="${foundryApi.localize("splittermond.lowerFumbleResultHelp")}"name='lowerFumbleResult' type='text' value='${lowerFumbleResult}' data-dtype='Number'>
        </div>
    </form>
    `;
}

function getForm(dialog: FumbleDialog): HTMLFormElement {
    const form = dialog.element.querySelector("form");
    if (!form) {
        throw new IllegalStateException("Form not found in fumble dialog");
    }
    return form;
}

function selectInput(form: HTMLFormElement, name: string): HTMLInputElement {
    const element = form.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
    if (!element) {
        throw new IllegalStateException(`Input element with name ${name} not found in fumble dialog form`);
    }
    return element;
}
