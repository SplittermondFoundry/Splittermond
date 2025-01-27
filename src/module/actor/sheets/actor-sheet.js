import * as Dice from "../../util/dice.js"
import * as Tooltip from "../../util/tooltip.js"
import {splittermond} from "../../config.js";
import {foundryApi} from "../../api/foundryApi";

export default class SplittermondActorSheet extends ActorSheet {
    constructor(...args) {
        super(...args);
        this._hoverOverlays = [];
        this._hideSkills = true;
    }

    static get defaultOptions() {
        return foundryApi.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "sheet", "actor"]
        });
    }

    async getData() {
        const sheetData = super.getData();

        Handlebars.registerHelper('modifierFormat', (data) => parseInt(data) > 0 ? "+" + parseInt(data) : data);

        sheetData.hideSkills = this._hideSkills;
        sheetData.generalSkills = {};
        CONFIG.splittermond.skillGroups.general.filter(s => !sheetData.hideSkills
            || ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(s)
            || this.actor.skills[s].points > 0
            || this.actor.items.find(i => i.type == "mastery" && i.system.skill == s)).forEach(skill => {
                sheetData.generalSkills[skill] = this.actor.skills[skill];
            });
        sheetData.magicSkills = {};
        CONFIG.splittermond.skillGroups.magic.filter(s => !sheetData.hideSkills
            || this.actor.skills[s].points > 0
            || this.actor.items.find(i => i.type == "mastery" && i.system.skill == s)).forEach(skill => {
                sheetData.magicSkills[skill] = this.actor.skills[skill];
            });

        sheetData.fightingSkills = {};
        CONFIG.splittermond.skillGroups.fighting.filter(s => !sheetData.hideSkills
            || (sheetData.data.system.skills[s]?.points || 0) > 0
            || this.actor.items.find(i => i.type === "mastery" && i.system.skill === s)).forEach(skill => {
                if (!sheetData.data.system.skills[skill]) {
                    sheetData.data.system[skill] = {
                        points: 0
                    }
                }
                sheetData.fightingSkills[skill] = duplicate(sheetData.data.system.skills[skill]);
                sheetData.fightingSkills[skill].label = `splittermond.skillLabel.${skill}`;
            });

        sheetData.data.system.biographyHTML = await TextEditor.enrichHTML(sheetData.data.system.biography, {
            relativeTo: this.actor,
            rolls: true,
            links: true,
            documents: true,
            secrets: true,
            async: true
        });

        this._prepareItems(sheetData);



        console.log("getData()");


        return sheetData;
    }

    _prepareItems(sheetData) {

        sheetData.itemsByType = sheetData.items.reduce((result, item) => {
            if (!(item.type in result)) {
                result[item.type] = [];
            }
            result[item.type].push(item);
            return result;
        }, {});

        if (sheetData.itemsByType.mastery) {
            sheetData.masteriesBySkill = sheetData.itemsByType.mastery.reduce((result, item) => {
                let skill = item.system.skill || "none";
                if (!(skill in result)) {
                    result[skill] = {
                        label: `splittermond.skillLabel.${skill}`,
                        masteries: []
                    };
                }
                result[skill].masteries.push(item);
                return result;
            }, {});
        }

        sheetData.spellsBySkill = this.actor.spells.reduce((result, item) => {
            if (!result[item.skill.id]) {
                result[item.skill.id] = {
                    label: `splittermond.skillLabel.${item.skill.id}`,
                    skillValue: item.skill.value,
                    spells: []
                };
            }
            result[item.skill.id].spells.push(item);
            return result;
        }, {});

    }

    _getClosestData(jQObject, dataName, defaultValue = "") {
        let value = jQObject.closest(`[data-${dataName}]`)?.data(dataName);
        return (value) ? value : defaultValue;
    }


    activateListeners(html) {
        html.find('input.autoexpand').on('input', function () {
            let dummyElement = $('<span id="autoexpanddummy"/>').hide();
            $(this).after(dummyElement);
            let text = $(this).val() || $(this).text() || $(this).attr('placeholder');
            $(dummyElement).text(text);
            $(this).css({
                width: dummyElement.width()
            })
            dummyElement.remove();
        }).trigger('input');

        html.find('[data-action="inc-value"]').click((event) => {
            const query = $(event.currentTarget).closestData('input-query');
            let value = parseInt($(html).find(query).val()) || 0;
            $(html).find(query).val(value + 1).change();
        });

        html.find('[data-action="dec-value"]').click((event) => {
            const query = $(event.currentTarget).closestData('input-query');
            let value = parseInt($(html).find(query).val()) || 0;
            $(html).find(query).val(value - 1).change();
        });

        html.find('[data-action="add-item"]').click(event => {
            const itemType = $(event.currentTarget).closestData('item-type');
            const renderSheet = Boolean((event.currentTarget.dataset.renderSheet || "true") === "true");
            let itemData = {
                name: game.i18n.localize("splittermond." + itemType),
                type: itemType
            };

            if (itemType === "mastery") {
                const skill = $(event.currentTarget).closestData('skill');
                if (skill) {
                    itemData.system = {
                        skill: skill
                    }
                }
            }
            return this.actor.createEmbeddedDocuments("Item", [itemData], { renderSheet: renderSheet });
        });


        html.find('[data-action="delete-item"]').click(async event => {
            const itemId = $(event.currentTarget).closestData('item-id');
            let p = new Promise((resolve, reject) => {
                let dialog = new Dialog({
                    title: game.i18n.localize("splittermond.deleteItem"),
                    content: "<p>" + game.i18n.format("splittermond.deleteItemQuestion", { itemName: this.actor.items.get(itemId).name }) + "</p>",
                    buttons: {
                        delete: {
                            label: game.i18n.localize("splittermond.delete"),
                            callback: html => {

                                resolve(true);
                            }
                        },
                        cancel: {
                            label: game.i18n.localize("splittermond.cancel"),
                            callback: html => {
                                resolve(false);
                            }
                        }
                    }
                });
                dialog.render(true);
            });

            if (await p) {
                await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
                await Hooks.call("redraw-combat-tick");
            }


        });

        html.find('[data-action="edit-item"]').click(event => {
            const itemId = $(event.currentTarget).closestData('item-id');
            this.actor.items.get(itemId).sheet.render(true);
        });

        html.find('[data-action="toggle-equipped"]').click(event => {
            const itemId = $(event.currentTarget).closestData('item-id');
            const item = this.actor.items.get(itemId);
            item.update({ "system.equipped": !item.system.equipped });
        });

        html.find('[data-field]').change(event => {
            const element = event.currentTarget;
            let value = element.value;
            if (element.type === "checkbox") {
                value = element.checked;
            }
            const itemId = $(event.currentTarget).closestData('item-id');
            const field = element.dataset.field;
            this.actor.items.get(itemId).update({ [field]: value });
        });

        html.find('[data-array-field]').change(event => {
            const element = event.currentTarget
            const idx = parseInt($(event.currentTarget).closestData('index', "0"));
            const array = $(event.currentTarget).closestData('array');
            const field = $(event.currentTarget).closestData('array-field');
            let newValue = [];
            if (!(idx >= 0 && array !== "")) return;
            if (field) {
                newValue = duplicate(array.split('.').reduce(function (prev, curr) {
                    return prev ? prev[curr] : null
                }, this.actor.toObject()));
                newValue[idx][field] = element.value;
            } else {
                newValue = duplicate(array.split('.').reduce(function (prev, curr) {
                    return prev ? prev[curr] : null
                }, this.actor.toObject()));
                newValue[idx] = element.value;
            }
            this.actor.update({ [array]: newValue });
        });

        html.find('[data-action="delete-array-element"]').click(event => {
            const element = event.currentTarget
            const idx = parseInt($(event.currentTarget).closestData('index', "0"));
            const array = $(event.currentTarget).closestData('array');
            if (!(idx >= 0 && array !== "")) return;
            let arrayData = duplicate(array.split('.').reduce(function (prev, curr) {
                return prev ? prev[curr] : null
            }, this.actor.toObject()));
            let updateData = {}
            if (array === "system.focus.channeled.entries") {
                let tempValue = parseInt(this.actor.system.focus.exhausted.value) + parseInt(arrayData[idx].costs);
                updateData["system.focus.exhausted.value"] = tempValue;
            }

            arrayData.splice(idx, 1);
            updateData[array] = arrayData;
            this.actor.update(updateData);
        });

        html.find('[data-action="add-channeled-focus"]').click(event => {
            let channeledEntries = duplicate(this.actor.system.focus.channeled.entries);
            channeledEntries.push({
                description: game.i18n.localize("splittermond.description"),
                costs: 1
            });
            this.actor.update({ "system.focus.channeled.entries": channeledEntries });
        });

        html.find('[data-action="add-channeled-health"]').click(event => {
            let channeledEntries = duplicate(this.actor.system.health.channeled.entries);
            channeledEntries.push({
                description: game.i18n.localize("splittermond.description"),
                costs: 1
            });
            this.actor.update({ "system.health.channeled.entries": channeledEntries });
        });

        html.find('[data-action="long-rest"]').click(event => {
            this.actor.longRest();
        });

        html.find('[data-action="short-rest"]').click(event => {
            this.actor.shortRest();
        });


        html.find(".rollable").click(event => {
            const type = $(event.currentTarget).closestData('roll-type');
            if (type === "skill") {
                const skill = $(event.currentTarget).closestData('skill');
                this.actor.rollSkill(skill);
            }

            if (type === "attack") {
                const attackId = $(event.currentTarget).closestData('attack-id');
                this.actor.rollAttack(attackId);
            }
            if (type === "spell") {
                const itemId = $(event.currentTarget).closestData('item-id');
                this.actor.rollSpell(itemId);
            }

            if (type === "damage") {
                const damage = event.currentTarget.dataset.damage;
                const features = event.currentTarget.dataset.features;
                const source = event.currentTarget.dataset.source;
                Dice.damage(damage, features, source);
            }

            if (type === "activeDefense") {
                const itemId = $(event.currentTarget).closestData('defense-id');
                const defenseType = $(event.currentTarget).closestData('defense-type');
                this.actor.rollActiveDefense(defenseType, this.actor.activeDefense[defenseType].find(el => el.id === itemId));
            }
        });

        html.find(".add-tick").click(event => {
            let value = $(event.currentTarget).closestData('ticks');
            let message = $(event.currentTarget).closestData('message');

            this.actor.addTicks(value, message);
        })

        html.find(".consume").click(event => {
            const type = $(event.currentTarget).closestData('type');
            const value = $(event.currentTarget).closestData('value');
            if (type === "focus") {
                const description = $(event.currentTarget).closestData('description');
                this.actor.consumeCost(type, value, description);
            }
        })

        html.find(".derived-attribute#defense label").click(event => {
            event.preventDefault();
            event.stopPropagation()

            this.actor.activeDefenseDialog("defense");
        });

        html.find(".derived-attribute#bodyresist label").click(event => {
            event.preventDefault();
            event.stopPropagation()

            this.actor.activeDefenseDialog("bodyresist");
        });

        html.find(".derived-attribute#mindresist label").click(event => {
            event.preventDefault();
            event.stopPropagation()

            this.actor.activeDefenseDialog("mindresist");
        });

        html.find(".item-list .item").on("dragstart", event => {
            html.find('#splittermond-tooltip').remove();
        }).on("dragover", event => {
            event.currentTarget.style.borderTop = "1px solid black";
            event.currentTarget.style.borderImage = "none";
        }).on("dragleave", event => {
            event.currentTarget.style.borderTop = "";
            event.currentTarget.style.borderImage = "";
        });

        html.find(".draggable").on("dragstart", event => {
            const attackId = event.currentTarget.dataset.attackId;
            if (attackId) {
                event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "attack",
                    attackId: attackId,
                    actorId: this.actor.id
                }));
                event.stopPropagation();
                return;
            }

            const skill = event.currentTarget.dataset.skill;
            if (skill) {
                const skill = $(event.currentTarget).closestData('skill');
                event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "skill",
                    skill: skill,
                    actorId: this.actor.id
                }));
                event.stopPropagation();
                return;
            }

            const itemId = event.currentTarget.dataset.itemId;
            if (itemId) {
                const itemData = this.actor.items.find(el => el.id === itemId)?.system;
                event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "Item",
                    system: itemData,
                    actorId: this.actor._id
                }));
                event.stopPropagation();
                return;
            }

        }).attr('draggable', true);

        html.find("[data-item-id], .list.skills [data-skill], .derived-attribute, .damage-reduction, .list.attack .value, .list.active-defense .value").hover(async event => {
            const itemId = event.currentTarget.dataset.itemId;
            let content = "";
            let css = {
                top: $(event.currentTarget).offset().top + $(event.currentTarget).outerHeight(),
                left: $(event.currentTarget).offset().left,
                display: "none"
            }
            if (itemId) {
                const item = this.actor.items.find(el => el.id === itemId);

                if (!item) return;

                if (item.system.description) {
                    content = await TextEditor.enrichHTML(item.system.description, { async: true });
                    if (!content.startsWith("<p>")) {
                        content = `<p>${content}</p>`;
                    }
                }
                if (item.type === "spell") {
                    content += `<p><strong>` + game.i18n.localize("splittermond.enhancementDescription") + ` (${item.system.enhancementCosts}):</strong> ${item.system.enhancementDescription}</p>`;
                }
            }

            const skillId = event.currentTarget.dataset.skill;

            if (skillId && this.actor.skills[skillId]) {
                const skillData = this.actor.skills[skillId];
                content += skillData.tooltip();

                let masteryList = html.find(`.list.masteries li[data-skill="${skillId}"]`);


                if (masteryList.html()) {
                    let posLeft = masteryList.offset().left;
                    let posTop = $(event.currentTarget).offset().top;

                    let width = masteryList.outerWidth();
                    masteryList = masteryList.clone();

                    masteryList.find("button").remove();
                    masteryList = masteryList.wrapAll(`<div class="list splittermond-tooltip masteries"/>`).wrapAll(`<ol class="list-body"/>`).parent().parent();
                    masteryList.css({
                        position: "fixed",
                        left: posLeft,
                        top: posTop,
                        width: width
                    })
                    content += masteryList.wrapAll("<div/>").parent().html();
                }
            }

            if ($(event.currentTarget).closestData('attack-id')) {
                let attackId = $(event.currentTarget).closestData('attack-id');
                if (this.actor.attacks.find(a => a.id === attackId)) {
                    let attack = this.actor.attacks.find(a => a.id === attackId);
                    let skill = attack.skill;
                    content += skill.tooltip();
                }
            }

            if ($(event.currentTarget).closestData('defense-id')) {
                let defenseId = $(event.currentTarget).closestData('defense-id');
                let defenseData = {}
                if (this.actor.activeDefense.defense.find(a => a.id === defenseId)) {
                    defenseData = this.actor.activeDefense.defense.find(a => a.id === defenseId)

                }

                if (this.actor.activeDefense.mindresist.find(a => a.id === defenseId)) {
                    defenseData = this.actor.activeDefense.mindresist.find(a => a.id === defenseId)

                }


                if (this.actor.activeDefense.bodyresist.find(a => a.id === defenseId)) {
                    defenseData = this.actor.activeDefense.bodyresist.find(a => a.id === defenseId)

                }
                if (defenseData) {
                    content += defenseData.tooltip();
                }
            }

            if (event.currentTarget.classList.contains("derived-attribute")) {
                let attribute = event.currentTarget.id;
                if (this.actor.derivedValues[attribute]) {
                    content += this.actor.derivedValues[attribute].tooltip();
                }

            }

            if (event.currentTarget.classList.contains("damage-reduction") && this.actor.damageReduction != 0) {
                let formula = new Tooltip.TooltipFormula();
                this.actor.modifier.static("damagereduction").forEach(e => e.addTooltipFormulaElements(formula));
                content += formula.render();
            }

            if (content) {
                let tooltipElement = $(`<div id="splittermond-tooltip"> ${content}</div>`);
                html.append(tooltipElement);
                if (skillId) {
                    css.left += $(event.currentTarget).outerWidth() - tooltipElement.outerWidth();
                    css.top = $(event.currentTarget).offset().top - $(tooltipElement).outerHeight();
                }

                if (event.currentTarget.classList.contains("attribute") || $(event.currentTarget).closestData('attack-id') || $(event.currentTarget).closestData('defense-id')) {
                    css.left -= tooltipElement.outerWidth() / 2 - $(event.currentTarget).outerWidth() / 2;
                }

                /*
                if (event.currentTarget.classList.contains("attribute")) {
                    css.left += $(event.currentTarget).outerWidth();
                }
                */
                tooltipElement.css(css).fadeIn();

            }
        }, event => {
            html.find("div#splittermond-tooltip").remove();
        })

        html.find('[data-action="show-hide-skills"]').click(event => {
            this._hideSkills = !this._hideSkills;
            $(event.currentTarget).attr("data-action", "hide-skills");
            this.render();
        });


        if (this._hoverOverlays) {
            let el = html.find(this._hoverOverlays.join(", "));
            if (el.length > 0) {
                el.addClass("hover");
                el.hover(function () {
                    $(this).removeClass("hover");
                });
            }
        }


        super.activateListeners(html);
    }

    async _onDropItemCreate(itemData) {
        if (itemData.type === "spell") {
            if (itemData.system.availableIn) {
                let availableIn = itemData.system.availableIn.trim().toLowerCase();
                CONFIG.splittermond.skillGroups.magic.forEach(i => {
                    availableIn = availableIn.replace(game.i18n.localize(`splittermond.skillLabel.${i}`).toLowerCase(), i);
                });
                let selectedSkill = "";
                if (availableIn.split(",").length > 1) {
                    let p = new Promise((resolve, reject) => {
                        let buttons = {};


                        availableIn.split(",").forEach(item => {
                            let data = item.trim().toLowerCase().split(" ");
                            if (CONFIG.splittermond.skillGroups.magic.includes(data[0])) {
                                buttons[data[0]] = {
                                    label: game.i18n.localize(`splittermond.skillLabel.${data[0].trim()}`) + " " + data[1],
                                    callback: html => {
                                        resolve(data[0] + " " + data[1])
                                    }
                                }
                            }
                        });
                        //if the entries from the availableIn are not valid, show all magic skills for all levels
                        //this is fallback prudes hideous GUI, but should prevent errors at item rendering.
                        if (Object.keys(buttons).length === 0) {
                            splittermond.skillGroups.magic.forEach(item => {
                                    buttons[item] = {
                                        label: foundryApi.localize(`splittermond.skillLabel.${item}`),
                                        callback: html => {
                                            resolve(`${item} 0`);
                                        }
                                    };
                            });
                        }
                        buttons["_cancel"] = {
                            label: game.i18n.localize("splittermond.cancel"),
                            callback: html => {
                                resolve("");
                            }
                        }
                        let dialog = new Dialog({
                            title: game.i18n.localize("splittermond.chooseMagicSkill"),
                            content: "",
                            buttons: buttons
                        }, {
                            classes: ["splittermond", "dialog", "selection"]
                        });
                        dialog.render(true);
                    });

                    selectedSkill = await p;
                    if (!selectedSkill.trim())
                        return;
                } else {
                    if (availableIn.trim())
                        selectedSkill = availableIn;
                }


                if (selectedSkill) {
                    let skillData = selectedSkill.split(" ");
                    itemData.system.skill = skillData[0];
                    itemData.system.skillLevel = skillData[1];
                }

                if (!itemData.system.skill) {
                    return;
                }
            }
        }

        if (itemData.type === "mastery") {
            if (itemData.system.availableIn) {
                let availableIn = itemData.system.availableIn.trim().toLowerCase();
                [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic, ...CONFIG.splittermond.skillGroups.fighting].forEach(i => {
                    availableIn = availableIn.replace(game.i18n.localize(`splittermond.skillLabel.${i}`).toLowerCase(), i);
                });
                let selectedSkill = itemData.system.skill;
                if (availableIn.split(",").length > 1) {
                    let p = new Promise((resolve, reject) => {
                        let buttons = {};


                        availableIn.split(",").forEach(item => {
                            let data = item.trim().toLowerCase().split(" ");
                            if (data.length < 2) {
                                data[1] = itemData.system.level;
                            }
                            if ([...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic, ...CONFIG.splittermond.skillGroups.fighting].includes(data[0])) {
                                buttons[data[0]] = {
                                    label: game.i18n.localize(`splittermond.skillLabel.${data[0]}`),
                                    callback: html => {
                                        resolve(data[0] + " " + data[1])
                                    }
                                }
                            }
                        });
                        buttons["_cancel"] = {
                            label: game.i18n.localize("splittermond.cancel"),
                            callback: html => {
                                resolve("");
                            }
                        }
                        let dialog = new Dialog({
                            title: game.i18n.localize("splittermond.chooseSkill"),
                            content: "",
                            buttons: buttons
                        }, {
                            classes: ["splittermond", "dialog", "selection"]
                        });
                        dialog.render(true);
                    });

                    selectedSkill = await p;
                    if (!selectedSkill.trim())
                        return;
                } else {
                    if (availableIn)
                        selectedSkill = availableIn;
                }

                if (selectedSkill === "" || selectedSkill === "none") {
                    return;
                }

                let skillData = selectedSkill.split(" ");
                itemData.system.skill = skillData[0];
                if ([...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic, ...CONFIG.splittermond.skillGroups.fighting].includes(skillData[0])) {
                    itemData.system.skill = skillData[0];
                    if (skillData.length > 1) {
                        itemData.system.level = skillData[1];
                    }
                } else {
                    return;
                }

            }
        }

        var rerenderCombatTracker = false;
        if (itemData.type === "statuseffect") {
            const currentScene = game.scenes.current?.id || null;
            let combats = game.combats.filter(c => (c.scene === null) || (c.scene.id === currentScene));
            if (combats.length > 0) {
                var activeCombat = combats.find(e => e.combatants.find(f => f.actor.id == this.actor.id));
                if (activeCombat != null) {
                    var currentTick = activeCombat.current.round;
                    //check if this status is already present
                    var hasSameStatus = this.actor.items
                        .filter(e => {
                            return e.type == "statuseffect" && e.name == itemData.name && e.system.startTick;
                        })
                        .map(e => {
                            var ticks = [];
                            for (let index = 0; index < parseInt(e.system.times); index++) {
                                ticks.push(parseInt(e.system.startTick) + (index * parseInt(e.system.interval)));
                            }
                            return {
                                ticks: ticks.filter(f => f >= currentTick),
                                status: e
                            };
                        })
                        .filter(e => e.ticks.length > 0);
                    if (hasSameStatus.length > 0) {
                        //there is already an status with the same type so the new one will start always at the next tick
                        itemData.data.startTick = hasSameStatus[0].ticks[0];
                    }
                    else {
                        itemData.system.startTick = parseInt(activeCombat.round) + parseInt(itemData.system.interval);
                    }
                    rerenderCombatTracker = true;
                }
            }
        }

        await super._onDropItemCreate(itemData);
        if (rerenderCombatTracker) {
            Hooks.call("redraw-combat-tick");
        }
    }


    render(force = false, options = {}) {
        if (this.options.overlays) {
            let html = this.element;
            this._hoverOverlays = [];
            for (let sel of this.options.overlays) {
                let el = html.find(sel + ":hover");
                if (el.length === 1) {
                    this._hoverOverlays.push(sel);
                }
            }
        }
        return super.render(force, options);
    }


}