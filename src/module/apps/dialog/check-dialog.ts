import Skill from "module/actor/skill";
import { foundryApi } from "../../api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { ApplicationRenderContext, TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { RollType } from "module/config/check";
import { changeValue } from "module/util/commonHtmlHandlers";
import type { ChatMessageMode } from "module/api/foundryTypes";
import { MessageModeKey } from "module/api/ChatMessage";
import { RollDifficultyType } from "module/util/rollDifficultyParser";
import { of, type Expression } from "module/modifiers/expressions/scalar";

export interface CheckDialogEmphasisEntry {
    name: string;
    label: string;
    value: string;
    numericValue: Expression;
    active: boolean;
}

export interface CheckDialogRollModeEntry {
    label: string;
    selected?: boolean;
}

export interface CheckDialogTemplateContext {
    baseId: string;
    skill: {
        actor: { img: string; name: string };
        label: string;
        maneuvers: { name: string }[];
    };
    skillTooltip: string;
    modifier: number;
    emphasis: CheckDialogEmphasisEntry[];
    difficulty: RollDifficultyType;
    rollModes: Record<string, CheckDialogRollModeEntry>;
}

export interface CheckDialogInput {
    title?: string;
    skill: Skill;
    skillTooltip: string;
    modifier: number;
    emphasis: CheckDialogEmphasisEntry[];
    difficulty: RollDifficultyType;
    messageMode: MessageModeKey;
    rollModes: Record<string, ChatMessageMode>;
    presetRollType?: RollType;
}

export interface CheckDialogData {
    difficulty: string;
    maneuvers: Item[];
    modifierElements: { value: Expression; description: string }[];
    messageMode: MessageModeKey;
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
        const enrichedRollModes = Object.fromEntries(
            Object.entries(checkData.rollModes).map(([key, mode]) => [
                key,
                { ...mode, selected: key === checkData.messageMode },
            ])
        );
        const html = await foundryApi.renderer(`${TEMPLATE_BASE_PATH}/apps/dialog/check-dialog.hbs`, {
            ...checkData,
            baseId,
            rollModes: enrichedRollModes,
        });

        const presetRollType = checkData.presetRollType;
        const presetBase = presetRollType ? (presetRollType.replace(/Grandmaster$/, "") as RollType) : undefined;

        return new Promise<CheckDialogData | null>((resolve) => {
            const dlg = new this(checkData, {
                window: {
                    title: checkData.title || foundryApi.localize("splittermond.skillCheck"),
                },
                content: html,
                form: { closeOnSubmit: false },
                buttons: (["risk", "standard", "safety"] as const).map((action) => ({
                    action,
                    label: foundryApi.localize(`splittermond.rollType.${action}`),
                    ...CheckDialog.#presetButtonState(action, presetBase),
                })),
                submit: (result: RollType, dialog: CheckDialog) => {
                    const fd = CheckDialog._prepareFormData(dialog.element, checkData);
                    fd.rollType = result;
                    if (presetBase && result !== presetBase) {
                        CheckDialog.#openConfirmPreset().then((confirmed) => {
                            if (confirmed) {
                                resolve(fd);
                                dialog.close();
                            }
                        });
                        return;
                    }
                    resolve(fd);
                    dialog.close();
                },
                close: () => resolve(null),
            });
            dlg.render({ force: true });
        });
    }

    static #presetButtonState(
        action: RollType,
        presetBase: RollType | undefined
    ): { default?: boolean; class?: string } {
        if (!presetBase) {
            return action === "standard" ? { default: true } : {};
        }
        return {
            default: action === presetBase,
            class: action === presetBase ? "preset" : "not-preset",
        };
    }

    static async #openConfirmPreset(): Promise<boolean> {
        const result = await FoundryDialog.prompt({
            window: { title: foundryApi.localize("splittermond.check.require.confirmTitle") },
            content: foundryApi.localize("splittermond.check.require.confirmBody"),
            ok: { action: "confirm", label: foundryApi.localize("splittermond.yes") },
            rejectClose: false,
        });
        return result === "confirm";
    }

    static _prepareFormData(html: HTMLElement, checkData: CheckDialogInput) {
        const modifierInput = html.querySelector<HTMLInputElement>("input[name='modifier']")!;
        const difficultyInput = html.querySelector<HTMLInputElement>("input[name='difficulty']")!;
        const rollModeInput = html.querySelector<HTMLSelectElement>("select[name='messageMode']")!;

        const modifierValue = modifierInput.valueAsNumber;
        const checkDialogData: CheckDialogData = {
            /*assuming this is OK; we'll validate in the parser*/
            difficulty: difficultyInput.value,
            messageMode: rollModeInput.value as MessageModeKey,
            modifierElements: [],
            maneuvers: [],
            rollType: "standard", // gets overwritten in the submit function
        };

        if (modifierValue) {
            checkDialogData.modifierElements.push({
                value: of(modifierValue),
                description: foundryApi.localize("splittermond.modifier"),
            });
        }
        html.querySelectorAll<HTMLInputElement>("input[name='emphasis']").forEach((el) => {
            if (el.checked && el.dataset.index != null) {
                const emphasisEntry = checkData.emphasis[parseInt(el.dataset.index)];
                if (emphasisEntry) {
                    checkDialogData.modifierElements.push({
                        value: emphasisEntry.numericValue,
                        description: emphasisEntry.name,
                    });
                }
            }
        });

        html.querySelectorAll<HTMLInputElement>("input[name='maneuvers']").forEach((el) => {
            if (el.checked) {
                checkDialogData.maneuvers.push(checkData.skill.maneuvers[parseInt(el.value)]);
            }
        });

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
