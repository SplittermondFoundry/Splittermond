import * as Tooltip from "../../util/tooltip.js";
import { splittermond } from "../../config";
import { foundryApi } from "../../api/foundryApi";
import { DamageInitializer } from "../../util/chat/damageChatMessage/initDamage";
import { ItemFeaturesModel } from "../../item/dataModel/propertyModels/ItemFeaturesModel.js";
import { DamageRoll } from "../../util/damage/DamageRoll.js";
import { CostBase } from "../../util/costs/costTypes.js";
import { parseAvailableIn, selectFromAllSkills, selectFromParsedSkills } from "./parseAvailableIn";
import { userConfirmsItemDeletion } from "module/actor/sheets/askUserForItemDeletion.js";
import { autoExpandInputs, changeValue } from "module/util/commonHtmlHandlers.ts";
import { closestData } from "module/data/ClosestDataMixin.js";

export default class SplittermondActorSheet extends foundry.appv1.sheets.ActorSheet {
    constructor(...args) {
        super(...args);
        this._hoverOverlays = [];
        this._hideSkills = true;
    }

    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "sheet", "actor"],
        });
    }

    async getData() {
        const sheetData = super.getData();

        Handlebars.registerHelper("modifierFormat", (data) => (parseInt(data) > 0 ? "+" + parseInt(data) : data));

        sheetData.hideSkills = this._hideSkills;
        sheetData.generalSkills = {};
        CONFIG.splittermond.skillGroups.general
            .filter(
                (s) =>
                    !sheetData.hideSkills ||
                    ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(s) ||
                    this.actor.skills[s].points > 0 ||
                    this.actor.items.find((i) => i.type === "mastery" && i.system.skill === s)
            )
            .forEach((skill) => {
                sheetData.generalSkills[skill] = this.actor.skills[skill];
            });
        sheetData.magicSkills = {};
        CONFIG.splittermond.skillGroups.magic
            .filter(
                (s) =>
                    !sheetData.hideSkills ||
                    this.actor.skills[s].points > 0 ||
                    this.actor.items.find((i) => i.type === "mastery" && i.system.skill === s)
            )
            .forEach((skill) => {
                sheetData.magicSkills[skill] = this.actor.skills[skill];
            });

        sheetData.fightingSkills = {};
        CONFIG.splittermond.skillGroups.fighting
            .filter(
                (s) =>
                    !sheetData.hideSkills ||
                    (sheetData.data.system.skills[s]?.points || 0) > 0 ||
                    this.actor.items.find((i) => i.type === "mastery" && i.system.skill === s)
            )
            .forEach((skill) => {
                if (!sheetData.data.system.skills[skill]) {
                    sheetData.data.system[skill] = {
                        points: 0,
                    };
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
            async: true,
        });

        this._prepareItems(sheetData);
        sheetData.attacks = mapAttacks(sheetData.actor);
        sheetData.activeDefense = sheetData.actor.activeDefense;

        console.debug("Splittermond | got actor data");

        return sheetData;
    }

    _prepareItems(sheetData) {
        const items = sheetData.items;
        if (!items) {
            console.error(
                `Splittermond | Item property of actor ${this.actor.name} is undefined. Cannot prepare items.`
            );
            return;
        }
        sheetData.itemsByType = items.reduce((result, item) => {
            if (!(item.type in result)) {
                result[item.type] = [];
            }
            result[item.type].push(item);
            return result;
        }, {});

        if (sheetData.itemsByType.weapon) {
            sheetData.itemsByType.weapon.forEach((item) => {
                item.system.features = this.actor.items.get(item._id).system.features.features;
                item.system.damage = this.actor.items.get(item._id).system.damage.displayValue;
            });
        }
        if (sheetData.itemsByType.shield) {
            sheetData.itemsByType.shield.forEach((item) => {
                item.system.features = this.actor.items.get(item._id).system.features.features;
            });
        }
        if (sheetData.itemsByType.armor) {
            sheetData.itemsByType.armor.forEach((item) => {
                item.system.features = this.actor.items.get(item._id).system.features.features;
            });
        }
        if (sheetData.itemsByType.mastery) {
            sheetData.masteriesBySkill = sheetData.itemsByType.mastery.reduce((result, item) => {
                let skill = item.system.skill || "none";
                if (!(skill in result)) {
                    result[skill] = {
                        label: `splittermond.skillLabel.${skill}`,
                        masteries: [],
                    };
                }
                result[skill].masteries.push(item);
                return result;
            }, {});
        }

        const spells = this.actor.spells;
        if (!spells) {
            console.error(
                `Splittermond | Spell property of actor ${this.actor.name} is undefined. Cannot prepare spells.`
            );
            return;
        }

        sheetData.spellsBySkill = this.actor.spells.reduce((result, item) => {
            if (!result[item.skill.id]) {
                result[item.skill.id] = {
                    label: `splittermond.skillLabel.${item.skill.id}`,
                    skillValue: item.skill.value,
                    spells: [],
                };
            }
            result[item.skill.id].spells.push(item);
            return result;
        }, {});
    }

    _getClosestData(jQObject, dataName, defaultValue = "") {
        let value = jQObject.closest(`[data-${dataName}]`)?.data(dataName);
        return value ? value : defaultValue;
    }

    /**
     * Increase a numeric value
     * @param {Event} _event - The event object
     * @param {HTMLElement} target - The target element
     */
    static #increaseValue(_event, target) {
        changeValue((input) => input + 1).for(target);
    }

    /**
     * Decrease a numeric value
     * @param {Event} _event - The event object
     * @param {HTMLElement} target - The target element
     */
    static #decreaseValue(_event, target) {
        changeValue((input) => input - 1).for(target);
    }

    /**
     * Handle adding a new item
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleAddItem(event, target) {
        const itemType = target.closest("[data-item-type]")?.getAttribute("data-item-type") || "";
        const renderSheet = Boolean((target.dataset.renderSheet || "true") === "true");
        let itemData = {
            name: foundryApi.localize("splittermond." + itemType),
            type: itemType,
        };

        if (itemType === "mastery") {
            const skill = target.closest("[data-skill]")?.getAttribute("data-skill");
            if (skill) {
                itemData.system = {
                    skill: skill,
                };
            }
        }
        this.actor.createEmbeddedDocuments("Item", [itemData], { renderSheet: renderSheet });
    }

    /**
     * Handle deleting an item
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     * @returns {Promise<void>}
     */
    async #handleDeleteItem(event, target) {
        const itemId = closestData(target, "item-id");
        if (!itemId) return;

        const itemName = this.actor.items.get(itemId).name;
        const userConfirmedDeletion = await userConfirmsItemDeletion(itemName);
        if (userConfirmedDeletion) {
            await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
        }
    }

    /**
     * Handle editing an item
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleEditItem(event, target) {
        const itemId = closestData(target, "item-id");
        if (!itemId) return;

        this.actor.items.get(itemId).sheet.render(true);
    }

    /**
     * Handle toggling equipped status
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleToggleEquipped(event, target) {
        const itemId = closestData(target, "item-id");
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        item.update({ "system.equipped": !item.system.equipped });
    }

    /**
     * Handle adding a channeled focus entry
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleAddChanneledFocus(event, target) {
        const channeledEntries = duplicate(this.actor.system.focus.channeled.entries);
        channeledEntries.push({
            description: foundryApi.localize("splittermond.description"),
            costs: 1,
        });
        return this.actor.update({ "system.focus.channeled.entries": channeledEntries });
    }

    /**
     * Handle adding a channeled health entry
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleAddChanneledHealth(event, target) {
        const channeledEntries = duplicate(this.actor.system.health.channeled.entries);
        channeledEntries.push({
            description: foundryApi.localize("splittermond.description"),
            costs: 1,
        });
        return this.actor.update({ "system.health.channeled.entries": channeledEntries });
    }

    /**
     * Handle long rest action
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleLongRest(event, target) {
        return this.actor.longRest();
    }

    /**
     * Handle short rest action
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleShortRest(event, target) {
        return this.actor.shortRest();
    }

    /**
     * Handle deleting an array element (focus/health channeled entries)
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleDeleteArrayElement(event, target) {
        const idx = parseInt(closestData(target, "index", "0"));
        const { value, address } = this.#getArray(target);

        if (!(idx >= 0 && address !== "") || !Array.isArray(value)) return;

        let updateData = {};
        if (address === "system.focus.channeled.entries") {
            let tempValue = parseInt(this.actor.system.focus.exhausted.value) + parseInt(value[idx].costs);
            updateData["system.focus.exhausted.value"] = tempValue;
        }

        value.splice(idx, 1);
        updateData[address] = value;
        return this.actor.update(updateData);
    }

    /**
     * Handle showing/hiding skills
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleShowHideSkills(event, target) {
        this._hideSkills = !this._hideSkills;
        target.setAttribute("data-action", "hide-skills");
        return this.render();
    }

    /**
     * Handle rolling a skill check
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleRollSkill(event, target) {
        const skill = closestData(target, "skill");
        if (!skill) return;
        return this.actor.rollSkill(skill);
    }

    /**
     * Handle rolling an attack
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleRollAttack(event, target) {
        const attackId = closestData(target, "attack-id");
        if (!attackId) return;
        return this.actor.rollAttack(attackId);
    }

    /**
     * Handle rolling a spell
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleRollSpell(event, target) {
        const itemId = closestData(target, "item-id");
        if (!itemId) return;
        return this.actor.rollSpell(itemId);
    }

    /**
     * Handle rolling damage
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleRollDamage(event, target) {
        const serializedImplementsParsed = JSON.parse(closestData(target, "damageimplements"));
        if (!serializedImplementsParsed) return;

        const implementsAsArray = [
            serializedImplementsParsed.principalComponent,
            ...serializedImplementsParsed.otherComponents,
        ];
        const damageImplements = implementsAsArray.map((i) => {
            const features = ItemFeaturesModel.from(i.features);
            const damageRoll = DamageRoll.from(i.formula, features);
            //the modifier we 'reflected' from inside damage roll already accounted for "Wuchtig" so, if we reapply modifiers,
            //we have to make sure we don't double damage by accident
            const modifier = features.hasFeature("Wuchtig") ? Math.floor(i.modifier * 0.5) : i.modifier;
            damageRoll.increaseDamage(modifier);
            return {
                damageRoll,
                damageType: i.damageType,
                damageSource: i.damageSource,
            };
        });

        const costType = closestData(target, "costtype") ?? "V";
        const actorId = closestData(target, "actorid");
        const actor = foundryApi.getActor(actorId) ?? null; //May fail if ID refers to a token
        /** @type DamageRollOptions */
        const rollOptions = {
            costBase: CostBase.create(costType),
            grazingHitPenalty: 0,
        };
        return DamageInitializer.rollFromDamageRoll(damageImplements, rollOptions, actor).then((message) =>
            message.sendToChat()
        );
    }

    /**
     * Handle rolling active defense
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleRollActiveDefense(event, target) {
        const itemId = closestData(target, "defense-id");
        const defenseType = closestData(target, "defense-type");
        if (!itemId || !defenseType) return;

        const defenseItem = this.actor.activeDefense[defenseType].find((el) => el.id === itemId);
        if (!defenseItem) return;

        return this.actor.rollActiveDefense(defenseType, defenseItem);
    }

    /**
     * Handle adding ticks
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleAddTick(event, target) {
        const value = closestData(target, "ticks");
        const message = closestData(target, "message");
        this.actor.addTicks(value, message);
    }

    /**
     * Handle consuming resources (focus/health)
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleConsume(event, target) {
        const type = closestData(target, "type");
        const value = closestData(target, "value");
        if (type === "focus") {
            const description = closestData(target, "description");
            this.actor.consumeCost(type, value, description);
        }
    }

    /**
     * Handle opening defense dialog
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The target element
     */
    #handleOpenDefenseDialog(event, target) {
        event.preventDefault();
        event.stopPropagation();

        const defenseType = target.getAttribute("data-defense-type");
        if (defenseType && ["defense", "bodyresist", "mindresist"].includes(defenseType)) {
            this.actor.activeDefenseDialog(defenseType);
        }
    }

    /** @param {JQuery} html*/
    activateListeners(html) {
        autoExpandInputs(html[0]);
        const element = html[0];

        element.querySelectorAll('[data-action="inc-value"]').forEach((el) => {
            el.addEventListener("click", (event) => {
                SplittermondActorSheet.#increaseValue(event, event.currentTarget);
            });
        });

        element.querySelectorAll('[data-action="dec-value"]').forEach((el) => {
            el.addEventListener("click", (event) => {
                SplittermondActorSheet.#decreaseValue(event, event.currentTarget);
            });
        });

        // Add item handler
        element.querySelectorAll('[data-action="add-item"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleAddItem(event, event.currentTarget));
        });

        // Delete item handler
        element.querySelectorAll('[data-action="delete-item"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleDeleteItem(event, event.currentTarget));
        });

        // Edit item handler
        element.querySelectorAll('[data-action="edit-item"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleEditItem(event, event.currentTarget));
        });

        // Toggle equipped handler
        element.querySelectorAll('[data-action="toggle-equipped"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleToggleEquipped(event, event.currentTarget));
        });

        // Delete array element handler
        element.querySelectorAll('[data-action="delete-array-element"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleDeleteArrayElement(event, event.currentTarget));
        });

        // Add channeled focus handler
        element.querySelectorAll('[data-action="add-channeled-focus"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleAddChanneledFocus(event, event.currentTarget));
        });

        // Add channeled health handler
        element.querySelectorAll('[data-action="add-channeled-health"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleAddChanneledHealth(event, event.currentTarget));
        });

        // Long rest handler
        element.querySelectorAll('[data-action="long-rest"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleLongRest(event, event.currentTarget));
        });

        // Short rest handler
        element.querySelectorAll('[data-action="short-rest"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleShortRest(event, event.currentTarget));
        });

        // Show/hide skills handler
        element.querySelectorAll('[data-action="show-hide-skills"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleShowHideSkills(event, event.currentTarget));
        });

        element.querySelectorAll("input[data-field]").forEach((el) => {
            el.addEventListener("change", (event) => {
                const element = event.currentTarget;
                let value = element.value;
                if (element.type === "checkbox") {
                    value = element.checked;
                }

                const itemId = closestData(element, "item-id");
                const field = element.dataset.field;
                return this.actor.items.get(itemId).update({ [field]: value });
            });
        });

        element.querySelectorAll("[data-array-field]").forEach((el) => {
            el.addEventListener("change", (event) => {
                const element = event.currentTarget;
                const idx = parseInt(closestData(element, "index", "0"));
                /**@type string*/
                const field = element.dataset.arrayField;
                const { value, address } = this.#getArray(element);
                if (!(idx >= 0 && address !== "") || !Array.isArray(value)) return;
                if (field) {
                    //single field update in property
                    value[idx][field] = element.value;
                } else {
                    value[idx] = element.value;
                }
                this.actor.update({ [address]: value });
            });
        });

        // Roll skill handler
        element.querySelectorAll('[data-action="roll-skill"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleRollSkill(event, event.currentTarget));
        });

        // Roll attack handler
        element.querySelectorAll('[data-action="roll-attack"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleRollAttack(event, event.currentTarget));
        });

        // Roll spell handler
        element.querySelectorAll('[data-action="roll-spell"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleRollSpell(event, event.currentTarget));
        });

        // Roll damage handler
        element.querySelectorAll('[data-action="roll-damage"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleRollDamage(event, event.currentTarget));
        });

        // Roll active defense handler
        element.querySelectorAll('[data-action="roll-active-defense"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleRollActiveDefense(event, event.currentTarget));
        });

        // Add tick handler
        element.querySelectorAll('[data-action="add-tick"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleAddTick(event, event.currentTarget));
        });

        // Consume handler
        element.querySelectorAll('[data-action="consume"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleConsume(event, event.currentTarget));
        });

        // Open defense dialog handler
        element.querySelectorAll('[data-action="open-defense-dialog"]').forEach((el) => {
            el.addEventListener("click", (event) => this.#handleOpenDefenseDialog(event, event.currentTarget));
        });

        html.find(".item-list .item")
            .on("dragstart", (event) => {
                html.find("#splittermond-tooltip").remove();
            })
            .on("dragover", (event) => {
                event.currentTarget.style.borderTop = "1px solid black";
                event.currentTarget.style.borderImage = "none";
            })
            .on("dragleave", (event) => {
                event.currentTarget.style.borderTop = "";
                event.currentTarget.style.borderImage = "";
            });

        html.find(".draggable")
            .on("dragstart", (event) => {
                const attackId = event.currentTarget.dataset.attackId;
                if (attackId) {
                    event.originalEvent.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                            type: "attack",
                            attackId: attackId,
                            actorId: this.actor.id,
                        })
                    );
                    event.stopPropagation();
                    return;
                }

                const skill = event.currentTarget.dataset.skill;
                if (skill) {
                    const skill = $(event.currentTarget).closestData("skill");
                    event.originalEvent.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                            type: "skill",
                            skill: skill,
                            actorId: this.actor.id,
                        })
                    );
                    event.stopPropagation();
                    return;
                }

                const itemId = event.currentTarget.dataset.itemId;
                if (itemId) {
                    const itemData = this.actor.items.find((el) => el.id === itemId)?.system;
                    event.originalEvent.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                            type: "Item",
                            system: itemData,
                            actorId: this.actor._id,
                        })
                    );
                    event.stopPropagation();
                }
            })
            .attr("draggable", true);

        html.find(
            "[data-item-id], .list.skills [data-skill], .derived-attribute, .damage-reduction, .list.attack .value, .list.active-defense .value"
        ).hover(
            async (event) => {
                const itemId = event.currentTarget.dataset.itemId;
                let content = "";
                let css = {
                    top: $(event.currentTarget).offset().top + $(event.currentTarget).outerHeight(),
                    left: $(event.currentTarget).offset().left,
                    display: "none",
                };
                if (itemId) {
                    const item = this.actor.items.find((el) => el.id === itemId);

                    if (!item) return;

                    if (item.system.description) {
                        content = await TextEditor.enrichHTML(item.system.description, { async: true });
                        if (!content.startsWith("<p>")) {
                            content = `<p>${content}</p>`;
                        }
                    }
                    if (item.type === "spell") {
                        content +=
                            `<p><strong>` +
                            foundryApi.localize("splittermond.enhancementDescription") +
                            ` (${item.system.enhancementCosts}):</strong> ${item.system.enhancementDescription}</p>`;
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
                        masteryList = masteryList
                            .wrapAll(`<div class="list splittermond-tooltip masteries"/>`)
                            .wrapAll(`<ol class="list-body"/>`)
                            .parent()
                            .parent();
                        masteryList.css({
                            position: "fixed",
                            left: posLeft,
                            top: posTop,
                            width: width,
                        });
                        content += masteryList.wrapAll("<div/>").parent().html();
                    }
                }

                if ($(event.currentTarget).closestData("attack-id")) {
                    let attackId = $(event.currentTarget).closestData("attack-id");
                    if (this.actor.attacks.find((a) => a.id === attackId)) {
                        let attack = this.actor.attacks.find((a) => a.id === attackId);
                        let skill = attack.skill;
                        content += skill.tooltip();
                    }
                }

                if ($(event.currentTarget).closestData("defense-id")) {
                    let defenseId = $(event.currentTarget).closestData("defense-id");
                    let defenseData = {};
                    if (this.actor.activeDefense.defense.find((a) => a.id === defenseId)) {
                        defenseData = this.actor.activeDefense.defense.find((a) => a.id === defenseId);
                    }

                    if (this.actor.activeDefense.mindresist.find((a) => a.id === defenseId)) {
                        defenseData = this.actor.activeDefense.mindresist.find((a) => a.id === defenseId);
                    }

                    if (this.actor.activeDefense.bodyresist.find((a) => a.id === defenseId)) {
                        defenseData = this.actor.activeDefense.bodyresist.find((a) => a.id === defenseId);
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

                if (event.currentTarget.classList.contains("damage-reduction") && this.actor.damageReduction !== 0) {
                    let formula = new Tooltip.TooltipFormula();
                    this.actor.modifier.getForId("damagereduction").getModifiers().addTooltipFormulaElements(formula);
                    content += formula.render();
                }

                if (content) {
                    let tooltipElement = $(`<div id="splittermond-tooltip"> ${content}</div>`);
                    html.append(tooltipElement);
                    if (skillId) {
                        css.left += $(event.currentTarget).outerWidth() - tooltipElement.outerWidth();
                        css.top = $(event.currentTarget).offset().top - $(tooltipElement).outerHeight();
                    }

                    if (
                        event.currentTarget.classList.contains("attribute") ||
                        $(event.currentTarget).closestData("attack-id") ||
                        $(event.currentTarget).closestData("defense-id")
                    ) {
                        css.left -= tooltipElement.outerWidth() / 2 - $(event.currentTarget).outerWidth() / 2;
                    }

                    /*
                if (event.currentTarget.classList.contains("attribute")) {
                    css.left += $(event.currentTarget).outerWidth();
                }
                */
                    tooltipElement.css(css).fadeIn();
                }
            },
            (event) => {
                html.find("div#splittermond-tooltip").remove();
            }
        );

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

    /**
     * @param {HTMLElement} element
     * @return {{value:any[],address:string,?field:string}}
     */
    #getArray(element) {
        /**@type string*/
        const arrayPropertyAddress = closestData(element, "array");
        const value = foundryApi.utils.resolveProperty(this.actor.toObject(), arrayPropertyAddress);
        return { value, address: arrayPropertyAddress };
    }

    /**
     * @param {SplittermondItem} itemData
     * @returns {Promise<void>}
     */
    async _onDropItemCreate(itemData) {
        if (itemData.type === "spell") {
            const allowedSkills = splittermond.skillGroups.magic;
            const dialogTitle = foundryApi.localize("splittermond.chooseMagicSkill");
            const parsed = parseAvailableIn(itemData.system?.availableIn ?? "", allowedSkills);
            let selectedSkill;
            if (parsed.length === 0 && allowedSkills.includes(itemData.system?.skill)) {
                selectedSkill = { skill: itemData.system.skill, level: itemData.system.skillLevel ?? 0 };
            } else if (parsed.length > 1) {
                selectedSkill = await selectFromParsedSkills(
                    parsed.filter((s) => s.level !== null),
                    dialogTitle
                );
            } else if (parsed.length === 0) {
                selectedSkill = await selectFromAllSkills(allowedSkills, [0, 1, 2, 3, 4, 5], dialogTitle);
            } else if (parsed.length === 1) {
                selectedSkill = { skill: parsed[0].skill, level: parsed[0].level ?? 0 };
            }

            if (!selectedSkill) return;

            itemData.system.skill = selectedSkill.skill;
            itemData.system.skillLevel = selectedSkill.level;
        }
        if (itemData.type === "mastery") {
            const allowedSkills = splittermond.skillGroups.all;
            const dialogTitle = foundryApi.localize("splittermond.chooseSkill");
            const parsed = parseAvailableIn(itemData.system?.availableIn ?? "", allowedSkills).map((s) => ({
                ...s,
                level: itemData.system.level ?? 1,
            }));
            let selectedSkill;
            if (parsed.length === 0 && allowedSkills.includes(itemData.system?.skill)) {
                selectedSkill = { skill: itemData.system.skill, level: itemData.system.skillLevel ?? 0 };
            } else if (parsed.length > 1) {
                selectedSkill = await selectFromParsedSkills(parsed, dialogTitle);
            } else if (parsed.length === 0) {
                selectedSkill = await selectFromAllSkills(allowedSkills, [1, 2, 3, 4], dialogTitle);
            } else if (parsed.length === 1) {
                selectedSkill = { skill: parsed[0].skill, level: parsed[0].level ?? 0 };
            }
            if (!selectedSkill) return;

            itemData.system.skill = selectedSkill.skill;
            itemData.system.level = selectedSkill.level;
        }

        await super._onDropItemCreate(itemData);
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

/**
 * @param {SplittermondActor} actor
 */
function mapAttacks(actor) {
    return actor.attacks.map((attack) => ({
        ...attack.toObject(),
        damageImplements: mapDamageImplements(attack),
    }));
}

/**
 *  Officially damage modifier is a private member. We're exploiting the fact that we're using JS here
 *  where the TS compile will not notice. I find this hack acceptable, because this code should be
 *  migrated
 * @param {Attack} attack
 * @returns {string}
 */
function mapDamageImplements(attack) {
    const damage = attack.getForDamageRoll();
    const serializedImplements = {
        principalComponent: {
            formula: damage.principalComponent.damageRoll.backingRoll.formula,
            features: damage.principalComponent.damageRoll._features.features,
            modifier: damage.principalComponent.damageRoll._damageModifier,
            damageSource: damage.principalComponent.damageSource,
            damageType: damage.principalComponent.damageType,
        },
        otherComponents: damage.otherComponents.map((i) => {
            return {
                formula: i.damageRoll.backingRoll.formula,
                features: i.damageRoll._features.features,
                modifier: i.damageRoll._damageModifier,
                damageSource: i.damageSource,
                damageType: i.damageType,
            };
        }),
    };
    return JSON.stringify(serializedImplements);
}
