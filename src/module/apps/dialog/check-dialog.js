import { foundryApi } from "../../api/foundryApi";

export default class CheckDialog extends Dialog {
    constructor(checkData, dialogData = {}, options = {}) {
        super(dialogData, options);

        this.checkData = checkData;
    }

    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "dialog", "dialog-check"],
            width: 450,
        });
    }

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
                title: checkData.title || game.i18n.localize("splittermond.skillCheck"),
                content: html,
                buttons: {
                    risk: {
                        //icon: "<img src='../../icons/dice/d10black.svg' style='border: none; opacity: 0.5' width=18 height=18/><img src='../../icons/dice/d10black.svg'   style='border: none; opacity: 0.5' width=18 height=18/><img src='../../icons/dice/d10black.svg' style='border: none' width=18 height=18/><img src='../../icons/dice/d10black.svg' style='border: none' width=18 height=18/>",
                        label: game.i18n.localize("splittermond.rollType.risk"),
                        callback: (html) => {
                            let fd = CheckDialog._prepareFormData(html, checkData);
                            fd.rollType = "risk";
                            resolve(fd);
                        },
                    },
                    normal: {
                        //icon: "<img src='../../icons/dice/d10black.svg' style='border: none' width=18 height=18/><img src='../../icons/dice/d10black.svg'  style='border: none' width=18 height=18/>",
                        label: game.i18n.localize("splittermond.rollType.standard"),
                        callback: (html) => {
                            let fd = CheckDialog._prepareFormData(html, checkData);
                            fd.rollType = "standard";
                            resolve(fd);
                        },
                    },
                    safety: {
                        //icon: "<img src='../../icons/dice/d10black.svg' style='border: none; opacity: 0.5' width=18 height=18/><img src='../../icons/dice/d10black.svg'  style='border: none' width=18 height=18/>",
                        label: game.i18n.localize("splittermond.rollType.safety"),
                        callback: (html) => {
                            let fd = CheckDialog._prepareFormData(html, checkData);
                            fd.rollType = "safety";
                            resolve(fd);
                        },
                    },
                },
                default: "normal",
                close: () => resolve(null),
            });
            dlg.render(true);
        });
    }

    static _prepareFormData(html, checkData) {
        let fd = new FormDataExtended(html[0].querySelector("form")).object;
        fd.modifierElements = [];
        if (parseInt(fd.modifier) || 0) {
            fd.modifierElements.push({
                value: parseInt(fd.modifier) || 0,
                description: game.i18n.localize("splittermond.modifier"),
            });
        }
        $(html)
            .find("[name='emphasis']")
            .each(function () {
                if (this.checked) {
                    fd.modifierElements.push({
                        value: parseInt(this.value) || 0,
                        description: this.dataset.name,
                    });
                }
            });
        fd.maneuvers = [];
        $(html)
            .find("[name='maneuvers']")
            .each(function () {
                if (this.checked) {
                    fd.maneuvers.push(checkData.skill.maneuvers[parseInt(this.value)]);
                }
            });

        fd.modifier = fd.modifierElements.reduce((acc, el) => acc + el.value, 0);

        return fd;
    }

    activateListeners(html) {
        html.find('[data-action="inc-value"]').click((event) => {
            const query = $(event.currentTarget).closestData("input-query");
            let value = parseInt($(html).find(query).val()) || 0;
            $(html)
                .find(query)
                .val(value + 1)
                .change();
        });

        html.find('[data-action="dec-value"]').click((event) => {
            const query = $(event.currentTarget).closestData("input-query");
            let value = parseInt($(html).find(query).val()) || 0;
            $(html)
                .find(query)
                .val(value - 1)
                .change();
        });

        html.find('[data-action="inc-value-3"]').click((event) => {
            const query = $(event.currentTarget).closestData("input-query");
            let value = parseInt($(html).find(query).val()) || 0;
            $(html)
                .find(query)
                .val(value + 3)
                .change();
        });

        html.find('[data-action="dec-value-3"]').click((event) => {
            const query = $(event.currentTarget).closestData("input-query");
            let value = parseInt($(html).find(query).val()) || 0;
            $(html)
                .find(query)
                .val(value - 3)
                .change();
        });

        html.find('input[name="difficulty"]').on("wheel", (event) => {
            let value = parseInt($(html).find('input[name="difficulty"]').val()) || 0;
            if (event.originalEvent.deltaY < 0) {
                $(html)
                    .find('input[name="difficulty"]')
                    .val(value + 1)
                    .change();
            } else {
                $(html)
                    .find('input[name="difficulty"]')
                    .val(value - 1)
                    .change();
            }
        });

        html.find('[data-action="difficulty-vtd"]').click((event) => {
            $(html).find('input[name="difficulty"]').val("VTD").change();
        });

        html.find('[data-action="difficulty-kw"]').click((event) => {
            $(html).find('input[name="difficulty"]').val("KW").change();
        });

        html.find('[data-action="difficulty-gw"]').click((event) => {
            $(html).find('input[name="difficulty"]').val("GW").change();
        });

        super.activateListeners(html);
    }
}
