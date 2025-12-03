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
import { SplittermondBaseActorSheet, TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { TooltipConfigurer } from "module/actor/sheets/TooltipConfigurer.js";
import { HoverStateTracker } from "module/actor/sheets/HoverStateTracker.ts";

export default class SplittermondActorSheet extends SplittermondBaseActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["splittermond", "sheet", "actor"],
        overlays: ["#health", "#focus"],
        position: { width: 750, height: 720 },
        window: {
            minimizable: true,
            resizable: true,
        },
        actions: {
            "inc-value": SplittermondActorSheet.#increaseValue,
            "dec-value": SplittermondActorSheet.#decreaseValue,
        },
    };

    static NAVIGATION = {
        template: "templates/generic/tab-navigation.hbs",
    };
    static BIOGRAPHY_TAB = {
        template: `${TEMPLATE_BASE_PATH}/sheets/editor.hbs`,
    };
    static SPELLS_TAB = {
        template: `${TEMPLATE_BASE_PATH}/sheets/actor/spells-tab.hbs`,
        classes: ["scrollable"],
    };
    static FIGHT_TAB = {
        template: `${TEMPLATE_BASE_PATH}/sheets/actor/fight-tab.hbs`,
        templates: [`${TEMPLATE_BASE_PATH}/sheets/actor/parts/combat-actions.hbs`],
    };
    static INVENTORY_TAB = {
        template: `${TEMPLATE_BASE_PATH}/sheets/actor/inventory-tab.hbs`,
        classes: ["scrollable"],
    };
    static STATUS_TAB = {
        template: `${TEMPLATE_BASE_PATH}/sheets/actor/status-tab.hbs`,
        classes: ["scrollable"],
    };

    constructor(options) {
        const instanceDefaults = {
            actions: {
                "short-rest": () => this.#handleShortRest(),
                "long-rest": () => this.#handleLongRest(),
                "add-item": (_e, t) => this.#handleAddItem(t),
                "delete-item": (_e, t) => this.#handleDeleteItem(t),
                "edit-item": (_e, t) => this.#handleEditItem(t),
                "toggle-equipped": (_e, t) => this.#handleToggleEquipped(t),
                "delete-array-element": (_e, t) => this.#handleDeleteArrayElement(t),
                "add-channeled-focus": () => this.#handleAddChanneledFocus(),
                "add-channeled-health": () => this.#handleAddChanneledHealth(),
                "show-hide-skills": (_e, t) => this.#handleShowHideSkills(t),
                "roll-skill": (_e, t) => this.#handleRollSkill(t),
                "roll-attack": (_e, t) => this.#handleRollAttack(t),
                "roll-spell": (_e, t) => this.#handleRollSpell(t),
                "roll-damage": (_e, t) => this.#handleRollDamage(t),
                "roll-active-defense": (_e, t) => this.#handleRollActiveDefense(t),
                "add-tick": (_e, t) => this.#handleAddTick(t),
                consume: (_e, t) => this.#handleConsume(t),
                "open-defense-dialog": (e, t) => this.#handleOpenDefenseDialog(e, t),
            },
        };
        const actorOptions = foundryApi.utils.mergeObject(instanceDefaults, options);
        super(actorOptions);
        this._activeOverlay = null;
        this._hideSkills = true;
        this._tooltipConfigurer = new (options.tooltipConfigurerConstructor ?? TooltipConfigurer)(this);
        this._hoverStateTracker = options.hoverStateTracker ?? new HoverStateTracker();
    }

    async _prepareContext(options) {
        const sheetData = {
            ...(await super._prepareContext(options)),
            img: this.actor.img,
            name: this.actor.name,
            system: this.actor.system.toObject(false),
            attributes: this.actor.attributes,
            attacks: mapAttacks(this.actor),
            activeDefense: this.actor.activeDefense,
            generalSkills: null,
            magicSkills: null,
            fightingSkills: null,
            derivedAttributes: this.actor.derivedValues,
            damageReduction: this.actor.damageReduction,
            editor: {
                target: "system.biography",
                content: "",
                value: this.actor.system.biography,
            },
        };
        sheetData.derivedEditable = sheetData.editable && this.actor.type !== "character";
        sheetData.hideSkills = this._hideSkills;
        sheetData.generalSkills = {};
        splittermond.skillGroups.general
            .filter((s) => splittermond.skillGroups.essential.includes(s) || this.shouldDisplaySkill(s))
            .forEach((skill) => {
                sheetData.generalSkills[skill] = this.actor.skills[skill];
            });
        sheetData.magicSkills = {};
        splittermond.skillGroups.magic
            .filter((s) => this.shouldDisplaySkill(s))
            .forEach((skill) => {
                sheetData.magicSkills[skill] = this.actor.skills[skill];
            });

        sheetData.fightingSkills = {};
        splittermond.skillGroups.fighting
            .filter((s) => this.shouldDisplaySkill(s))
            .forEach((skill) => {
                if (!this.actor.system.skills[skill]) {
                    this.actor.system[skill] = {
                        points: 0,
                    };
                }
                sheetData.fightingSkills[skill] = foundryApi.utils.duplicate(this.actor.system.skills[skill]);
                sheetData.fightingSkills[skill].label = splittermond.fightingSkillOptions[skill];
            });

        sheetData.editor.content = await foundryApi.utils.enrichHtml(this.actor.system.biography, {
            relativeTo: this.actor,
            rolls: true,
            links: true,
            documents: true,
            secrets: true,
            async: true,
        });

        sheetData.items = this.actor.items.map((i) => i.toObject(false));
        this._prepareItems(sheetData);

        sheetData.combatTabs = {
            tabs: [
                { id: "attack", group: "fight-action-type", label: "splittermond.attack" },
                { id: "defense", group: "fight-action-type", label: "splittermond.activeDefense" },
            ],
            initial: "attack",
        };

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
                const actorItem = this.actor.items.get(item._id);
                item.system.features = actorItem.system.features.features;
                item.system.damage = actorItem.system.damage.displayValue;
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
        for (const key in sheetData.spellsBySkill) {
            sheetData.spellsBySkill[key].spells.sort((a, b) => a.sort - b.sort);
        }
        sheetData.spellsBySkill = Object.fromEntries(
            Object.entries(sheetData.spellsBySkill).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        );
        for (const key in sheetData.itemsByType) {
            sheetData.itemsByType[key].sort((a, b) => a.sort - b.sort);
        }
    }

    /**
     * @param {SplittermondSkill} skillId
     * @return {boolean}
     */
    shouldDisplaySkill(skillId) {
        const hasSkillPoints = this.actor.system.skills[skillId].points > 0;
        const hasMastery = this.actor.items.some((item) => item.type === "mastery" && item.system.skill === skillId);
        return !this._hideSkills || hasSkillPoints || hasMastery;
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
     * @param {HTMLElement} target - The target element
     */
    #handleAddItem(target) {
        const itemType = closestData(target, "item-type") ?? "";
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
        return this.actor.createEmbeddedDocuments("Item", [itemData], { renderSheet: renderSheet });
    }

    /**
     * Handle deleting an item
     * @param {HTMLElement} target - The target element
     * @returns {Promise<void>}
     */
    async #handleDeleteItem(target) {
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
     * @param {HTMLElement} target - The target element
     */
    #handleEditItem(target) {
        const itemId = closestData(target, "item-id");
        if (!itemId) return;

        this.actor.items.get(itemId).sheet.render(true);
    }

    /**
     * Handle toggling equipped status
     * @param {HTMLElement} target - The target element
     */
    #handleToggleEquipped(target) {
        const itemId = closestData(target, "item-id");
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        item.update({ "system.equipped": !item.system.equipped });
    }

    /**
     * Handle adding a channeled focus entry
     */
    #handleAddChanneledFocus() {
        const channeledEntries = foundryApi.utils.deepClone(this.actor.system.focus.channeled.entries);
        channeledEntries.push({
            description: foundryApi.localize("splittermond.description"),
            costs: 1,
        });
        return this.actor.update({ "system.focus.channeled.entries": channeledEntries });
    }

    /**
     * Handle adding a channeled health entry
     */
    #handleAddChanneledHealth() {
        const channeledEntries = foundryApi.utils.deepClone(this.actor.system.health.channeled.entries);
        channeledEntries.push({
            description: foundryApi.localize("splittermond.description"),
            costs: 1,
        });
        return this.actor.update({ "system.health.channeled.entries": channeledEntries });
    }

    /**
     * Handle long rest action
     */
    #handleLongRest() {
        return this.actor.longRest();
    }

    /**
     * Handle short rest action
     */
    #handleShortRest() {
        return this.actor.shortRest();
    }

    /**
     * Handle deleting an array element (focus/health channeled entries)
     * @param {HTMLElement} target - The target element
     */
    #handleDeleteArrayElement(target) {
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
     * @param {HTMLElement} target - The target element
     */
    #handleShowHideSkills(target) {
        this._hideSkills = !this._hideSkills;
        target.setAttribute("data-action", "hide-skills");
        return this.render();
    }

    /**
     * Handle rolling a skill check
     * @param {HTMLElement} target - The target element
     */
    #handleRollSkill(target) {
        const skill = closestData(target, "skill");
        if (!skill) return;
        return this.actor.rollSkill(skill);
    }

    /**
     * Handle rolling an attack
     * @param {HTMLElement} target - The target element
     */
    #handleRollAttack(target) {
        const attackId = closestData(target, "attack-id");
        if (!attackId) return;
        return this.actor.rollAttack(attackId);
    }

    /**
     * Handle rolling a spell
     * @param {HTMLElement} target - The target element
     */
    #handleRollSpell(target) {
        const itemId = closestData(target, "item-id");
        if (!itemId) return;
        return this.actor.rollSpell(itemId);
    }

    /**
     * Handle rolling damage
     * @param {HTMLElement} target - The target element
     */
    #handleRollDamage(target) {
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
     * @param {HTMLElement} target - The target element
     */
    #handleRollActiveDefense(target) {
        const itemId = closestData(target, "defense-id");
        const defenseType = closestData(target, "defense-type");
        if (!itemId || !defenseType) return;

        const defenseItem = this.actor.activeDefense[defenseType].find((el) => el.id === itemId);
        if (!defenseItem) return;

        return this.actor.rollActiveDefense(defenseType, defenseItem);
    }

    /**
     * Handle adding ticks
     * @param {HTMLElement} target - The target element
     */
    #handleAddTick(target) {
        const value = closestData(target, "ticks");
        const message = closestData(target, "message");
        this.actor.addTicks(value, message);
    }

    /**
     * Handle consuming resources (focus/health)
     * @param {HTMLElement} target - The target element
     */
    #handleConsume(target) {
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

    async _onRender(context, options) {
        await super._onRender(context, options);
        autoExpandInputs(this.element);
        this._tooltipConfigurer.configureTooltips();
        this._hoverStateTracker.trackHoverState(this);
        this._hoverStateTracker.restoreHoverState(this);

        // Track overlay state changes
        const overlayElements = this.element.querySelectorAll("#health, #focus");
        overlayElements.forEach((overlay) => {
            overlay.addEventListener("mouseenter", () => {
                this._activeOverlay = `#${overlay.id}`;
                // Remove the programmatic hover class when user hovers
                overlay.classList.remove("hover");
            });
            overlay.addEventListener("mouseleave", () => {
                this._activeOverlay = null;
                // Remove the programmatic hover class when leaving
                overlay.classList.remove("hover");
            });
        });

        this.element.querySelectorAll("input[data-field]").forEach((el) => {
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

        this.element.querySelectorAll("[data-array-field]").forEach((el) => {
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

        this.element.querySelectorAll(".item-list .item").forEach((el) => {
            el.addEventListener("dragover", (event) => {
                event.currentTarget.style.borderTop = "1px solid black";
                event.currentTarget.style.borderImage = "none";
            });
            el.addEventListener("dragleave", (event) => {
                event.currentTarget.style.borderTop = "";
                event.currentTarget.style.borderImage = "";
            });
        });
    }

    _canDragStart() {
        return true;
    }

    /**
     * @param {DragEvent} event
     * @protected
     */
    _onDragStart(event) {
        this._tooltipConfigurer.removeTooltips();
        /**@type HTMLElement*/
        const target = event.currentTarget;
        const attackId = target.dataset.attackId;
        if (attackId) {
            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify({
                    type: "attack",
                    attackId: attackId,
                    actorId: this.actor.id,
                })
            );
            event.stopPropagation();
        }
        return super._onDragStart(event);
    }
    _onDrop(event) {
        const droppedData = event.dataTransfer.getData("text/plain");
        const droppedDataParsed = !!droppedData ? JSON.parse(droppedData) : null;
        if (droppedDataParsed && droppedDataParsed.type === "attack") {
            const sourceActor = foundryApi.getActor(droppedDataParsed.actorId);
            const sourceAttack = sourceActor?.attacks.find((a) => a.id === droppedDataParsed.attackId);
            const sourceItem = sourceActor?.items.get(sourceAttack?.item._id); //We're accessing a serialized Object here, so we have to access the internal data, not the getter.
            if (!sourceItem) return;
            return this._onDropDocument(event, sourceItem);
        }

        if (event.dataTransfer) return super._onDrop(event);
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
     * @param {DragEvent} _e
     * @param {FoundryDocument} document
     * @returns {Promise<null|FoundryDocument>}
     */
    async _onDropDocument(_e, document) {
        if (!this._hasValidItemType(document.type)) {
            const translatedType = foundryApi.localize(`TYPES.Item.${document.type}`);
            foundryApi.informUser("splittermond.applications.actorSheet.invalidItemType", { type: translatedType });
            return null;
        }
        /* Assume that the Spell was configured when it was brought on the actor. Therefore, if a document has an actor, there
         * is no need to ask again. This is important e.g. for scrolls. In the end, what we want to catch here are spells from
         * a compendium that come with the 'arcanelore' skill but are actually supposed to be from a specific school, given in
         * 'availableIn'
         */
        if (document.type === "spell" && !document.actor) {
            const allowedSkills = splittermond.skillGroups.magic;
            const dialogTitle = foundryApi.localize("splittermond.chooseMagicSkill");
            const parsed = parseAvailableIn(document.system?.availableIn ?? "", allowedSkills);
            let selectedSkill;
            if (parsed.length === 0 && allowedSkills.includes(document.system?.skill)) {
                selectedSkill = { skill: document.system.skill, level: document.system.skillLevel ?? 0 };
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

            document.system.updateSource({ skill: selectedSkill.skill, skillLevel: selectedSkill.level });
        }
        if (document.type === "mastery") {
            const allowedSkills = splittermond.skillGroups.all;
            const dialogTitle = foundryApi.localize("splittermond.chooseSkill");
            const parsed = parseAvailableIn(document.system?.availableIn ?? "", allowedSkills).map((s) => ({
                ...s,
                level: document.system.level ?? 1,
            }));
            let selectedSkill;
            if (parsed.length === 0 && allowedSkills.includes(document.system?.skill)) {
                selectedSkill = { skill: document.system.skill, level: document.system.skillLevel ?? 0 };
            } else if (parsed.length > 1) {
                selectedSkill = await selectFromParsedSkills(parsed, dialogTitle);
            } else if (parsed.length === 0) {
                selectedSkill = await selectFromAllSkills(allowedSkills, [1, 2, 3, 4], dialogTitle);
            } else if (parsed.length === 1) {
                selectedSkill = { skill: parsed[0].skill, level: parsed[0].level ?? 0 };
            }
            if (!selectedSkill) return;

            document.system.updateSource({ skill: selectedSkill.skill, level: selectedSkill.level });
        }

        return super._onDropDocument(_e, document);
    }
    /**
     * Overwrite to determine what Items can be dropped on this actor
     * @param {ItemType} itemType
     * @return {boolean}
     * @protected
     */
    _hasValidItemType(itemType) {
        return true;
    }
}

/**
 * @param {SplittermondActor} actor
 */
function mapAttacks(actor) {
    return actor.attacks.map((attack) => ({
        ...attack.toObjectData(),
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
