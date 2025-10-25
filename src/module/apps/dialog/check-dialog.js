import { foundryApi } from "../../api/foundryApi";
import { FoundryDialog } from "module/api/Application";

export default class CheckDialog extends FoundryDialog {
    constructor(checkData, dialogData = {}, options = {}) {
        super(dialogData, options);

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

    static async create(checkData) {
        checkData.rollMode = game.settings.get("core", "rollMode");
        checkData.rollModes = CONFIG.Dice.rollModes;

        const baseId = `${new Date().toISOString()}${Math.random()}`;
        const html = await renderTemplate("systems/splittermond/templates/apps/dialog/check-dialog.hbs", {
            baseId,
            ...checkData,
        });

        return new Promise((resolve) => {
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
                /**
                 * @param {"risk"|"standard"|"safety"} result
                 * @param {CheckDialog} dialog
                 */
                submit: (result, dialog) => {
                    let fd = CheckDialog._prepareFormData(dialog.element, checkData);
                    fd.rollType = result;
                    resolve(fd);
                },
                close: () => resolve(null),
            });
            dlg.render(true);
        });
    }

    static _prepareFormData(html, checkData) {
        let fd = new FormDataExtended(html.querySelector("form")).object;
        fd.modifierElements = [];
        if (parseInt(fd.modifier) || 0) {
            fd.modifierElements.push({
                value: parseInt(fd.modifier) || 0,
                description: foundryApi.localize("splittermond.modifier"),
            });
        }
        html.querySelectorAll("[name='emphasis']").forEach((el) => {
            if (el.checked) {
                fd.modifierElements.push({
                    value: parseInt(el.value) || 0,
                    description: el.dataset.name,
                });
            }
        });

        fd.maneuvers = [];
        html.querySelectorAll("[name='maneuvers']").forEach((el) => {
            if (el.checked) {
                fd.maneuvers.push(checkData.skill.maneuvers[parseInt(el.value)]);
            }
        });

        fd.modifier = fd.modifierElements.reduce((acc, el) => acc + el.value, 0);

        return fd;
    }

    async _onRender(options) {
        await super._onRender(options);
        const html = $(this.element);

        this.element.querySelector('input[name="difficulty"]').addEventListener("wheel", (event) => {
            if (event.deltaY < 0) {
                CheckDialog.#increaseValue(event, event.target);
            } else {
                CheckDialog.#decreaseValue(event, event.target);
            }
        });
    }

    /**
     * @param {Event} _event
     * @param {HTMLElement} target
     */
    static #setToResistance(_event, target) {
        const input = target.parentElement?.parentElement?.querySelector("input[name='difficulty']");
        if (input) {
            input.value = target.dataset.resistance;
        }
    }

    /**
     * @param {Event} _event
     * @param {HTMLElement} target
     */
    static #increaseBy3(_event, target) {
        CheckDialog.#changeValue((value) => value + 3).for(target);
    }

    /**
     * @param {Event} _event
     * @param {HTMLElement} target
     */
    static #decreaseBy3(_event, target) {
        CheckDialog.#changeValue((value) => value - 3).for(target);
    }
    /**
     * @param {Event} _event
     * @param {HTMLElement} target
     */
    static #increaseValue(_event, target) {
        CheckDialog.#changeValue((value) => value + 1).for(target);
    }

    /**
     * @param {Event} _event
     * @param {HTMLElement} target
     */
    static #decreaseValue(_event, target) {
        CheckDialog.#changeValue((value) => value - 1).for(target);
    }

    /**
     * @param {(a:number)=>number} operation
     * @return {{for(HTMLElement): void}}
     */
    static #changeValue(operation) {
        return {
            for(target) {
                const matchingInput = target.parentElement?.querySelector("input");
                if (!matchingInput) return;

                const newValue = operation(parseInt(matchingInput.value));
                if (isNaN(newValue)) return;
                matchingInput.value = `${newValue}`;
                matchingInput.dispatchEvent(new Event("input", { bubbles: true }));
                matchingInput.dispatchEvent(new Event("change", { bubbles: true }));
            },
        };
    }
}
