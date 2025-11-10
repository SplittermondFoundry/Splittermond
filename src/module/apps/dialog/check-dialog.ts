import Skill from "module/actor/skill";
import { foundryApi } from "../../api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { RollMode } from "module/api/foundryTypes";
import { ApplicationRenderContext, TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { RollType } from "module/config/check";
import { RollDifficultyString } from "module/util/rollDifficultyParser";
import { changeValue } from "module/util/commonHtmlHandlers";

export interface CheckDialogInput {
    title?: string;
    skill: Skill;
    skillTooltip: string;
    modifier: number;
    emphasis: { name: string; label: string; value: unknown; active: boolean }[];
    difficulty: RollDifficultyString;
    rollMode: string;
    rollModes: Record<string, RollMode>;
}

export interface CheckDialogData {
    difficulty: RollDifficultyString;
    maneuvers: Item[];
    modifier: number;
    modifierElements: { value: number; description: string }[];
    rollMode: string;
    rollType: RollType;
}

export default class CheckDialog extends FoundryDialog {
    checkData: CheckDialogInput;

    constructor(checkData: CheckDialogInput, dialogData = {}) {
        super(dialogData);

        this.checkData = checkData;
    }

    static DEFAULT_OPTIONS = {
        classes: ["splittermond", "dialog", "dialog-check"],
        position: {
            width: 450,
        },
        actions: {
            "dec-value": CheckDialog.#decreaseValue,
            "inc-value": CheckDialog.#increaseValue,
            "dec-value-3": CheckDialog.#decreaseBy3,
            "inc-value-3": CheckDialog.#increaseBy3,
            "difficulty-gw": CheckDialog.#setToResistance,
            "difficulty-kw": CheckDialog.#setToResistance,
            "difficulty-vtd": CheckDialog.#setToResistance,
        },
    };

    static async create(checkData: CheckDialogInput): Promise<CheckDialogData | null> {
        const baseId = `${new Date().toISOString()}${Math.random()}`;
        const html = await foundryApi.renderer(`${TEMPLATE_BASE_PATH}/apps/dialog/check-dialog.hbs`, {
            baseId,
            ...checkData,
        });

        return new Promise<CheckDialogData | null>((resolve) => {
            const dlg = new this(checkData, {
                window: {
                    title: checkData.title || foundryApi.localize("splittermond.skillCheck"),
                },
                content: html,
                buttons: [
                    {
                        action: "risk",
                        label: foundryApi.localize("splittermond.rollType.risk"),
                    },
                    {
                        action: "standard",
                        default: true,
                        label: foundryApi.localize("splittermond.rollType.standard"),
                    },
                    {
                        action: "safety",
                        label: foundryApi.localize("splittermond.rollType.safety"),
                    },
                ],
                submit: (result: RollType, dialog: CheckDialog) => {
                    let fd = CheckDialog._prepareFormData(dialog.element, checkData);
                    fd.rollType = result;
                    resolve(fd);
                },
                close: () => resolve(null),
            });
            dlg.render({ force: true });
        });
    }

    static _prepareFormData(html: HTMLElement, checkData: CheckDialogInput) {
        const modifierInput = html.querySelector<HTMLInputElement>("input[name='modifier']")!;
        const difficultyInput = html.querySelector<HTMLInputElement>("input[name='difficulty']")!;
        const rollModeInput = html.querySelector<HTMLSelectElement>("select[name='rollMode']")!;

        const checkDialogData: CheckDialogData = {
            modifier: modifierInput.valueAsNumber,
            /*assuming this is OK; we'll validate in the parser*/
            difficulty: difficultyInput.value as RollDifficultyString,
            rollMode: rollModeInput.value,
            modifierElements: [],
            maneuvers: [],
            rollType: "standard", // gets overwritten in the submit function
        };

        if (checkDialogData.modifier) {
            checkDialogData.modifierElements.push({
                value: checkDialogData.modifier,
                description: foundryApi.localize("splittermond.modifier"),
            });
        }
        html.querySelectorAll<HTMLInputElement>("input[name='emphasis']").forEach((el) => {
            if (el.checked && el.dataset.name) {
                checkDialogData.modifierElements.push({
                    value: parseInt(el.value) || 0,
                    description: el.dataset.name,
                });
            }
        });

        html.querySelectorAll<HTMLInputElement>("input[name='maneuvers']").forEach((el) => {
            if (el.checked) {
                checkDialogData.maneuvers.push(checkData.skill.maneuvers[parseInt(el.value)]);
            }
        });

        checkDialogData.modifier = checkDialogData.modifierElements.reduce((acc, el) => acc + el.value, 0);

        return checkDialogData;
    }

    async _onRender(context: ApplicationRenderContext, options: {}) {
        await super._onRender(context, options);

        this.element.querySelector<HTMLInputElement>('input[name="difficulty"]')?.addEventListener("wheel", (event) => {
            if (!event.target) return;
            if (event.deltaY < 0) {
                CheckDialog.#increaseValue(event, event.target as HTMLElement);
            } else {
                CheckDialog.#decreaseValue(event, event.target as HTMLElement);
            }
        });
    }

    static #setToResistance(_event: Event, target: HTMLElement) {
        const input = target.parentElement?.parentElement?.querySelector<HTMLInputElement>("input[name='difficulty']");
        if (input && target.dataset.resistance) {
            input.value = target.dataset.resistance;
        }
    }

    static #increaseBy3(_event: Event, target: HTMLElement) {
        changeValue((value) => value + 3).for(target);
    }

    static #decreaseBy3(_event: Event, target: HTMLElement) {
        changeValue((value) => value - 3).for(target);
    }

    static #increaseValue(_event: Event, target: HTMLElement) {
        changeValue((value) => value + 1).for(target);
    }

    static #decreaseValue(_event: Event, target: HTMLElement) {
        changeValue((value) => value - 1).for(target);
    }
}
