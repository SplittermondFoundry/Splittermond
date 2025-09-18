export default class RequestCheckDialog extends Dialog {
    constructor(dialogData = {}, options = {}) {
        super(dialogData, options);
        this.options.classes = ["splittermond", "dialog", "dialog-request-check"];
    }

    static async create(formData) {
        formData.skills = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].map(
            (skill) => {
                return {
                    key: skill,
                    label: game.i18n.localize(`splittermond.skillLabel.${skill}`),
                };
            }
        );
        const html = await renderTemplate(
            "systems/splittermond/templates/apps/dialog/request-check-dialog.hbs",
            formData
        );

        const dlg = new this({
            title: game.i18n.localize(`splittermond.requestSkillCheck`),
            content: html,
            buttons: {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                },
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "OK",
                    callback: (html) => {
                        let skill = html.find('[name="skill"]')[0].value;
                        let difficulty = parseInt(html.find('[name="difficulty"]')[0].value);
                        let skillLabel = game.i18n.localize(`splittermond.skillLabel.${skill}`);
                        if (difficulty) {
                            ChatMessage.create({
                                user: game.user._id,
                                speaker: ChatMessage.getSpeaker(),
                                content: `@SkillCheck[${skillLabel} ${game.i18n.localize(`splittermond.versus`)} ${difficulty}]`,
                            });
                        } else {
                            ChatMessage.create({
                                user: game.user._id,
                                speaker: ChatMessage.getSpeaker(),
                                content: `@SkillCheck[${skillLabel}]`,
                            });
                        }
                    },
                },
            },
            default: "ok",
        });
        dlg.render(true);
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

        super.activateListeners(html);
    }
}
