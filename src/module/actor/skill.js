import Modifiable from "./modifiable";
import CheckDialog from "../apps/dialog/check-dialog";
import * as Dice from "../util/dice";
import * as Chat from "../util/chat";
import * as Tooltip from "../util/tooltip";
import { parseRollDifficulty } from "../util/rollDifficultyParser";
import { asString } from "module/modifiers/expressions/scalar";
import { foundryApi } from "../api/foundryApi";
import { splittermond } from "../config";

/**
 * @property {string} id
 */
export default class Skill extends Modifiable {
    /**
     * @param {SplittermondActor} actor
     * @param {SplittermondSkill} skill
     * @param {SplittermondAttribute|null} attribute1
     * @param {SplittermondAttribute|null} attribute2
     * @param {number|null} skillValue
     */
    constructor(actor, skill, attribute1 = "", attribute2 = "", skillValue = null) {
        super(actor, [skill.toLowerCase().trim(), "woundmalus"]);
        this.id = skill.toLowerCase().trim();
        this.label = skill;
        if (this.actor.system.skills[skill]) {
            this.label = foundryApi.localize(`splittermond.skillLabel.${this.id}`);
            attribute1 = attribute1 ? attribute1 : splittermond.skillAttributes[skill][0];
            attribute2 = attribute2 ? attribute2 : splittermond.skillAttributes[skill][1];
            this.attribute1 = this.actor.attributes[attribute1];
            this.attribute2 = this.actor.attributes[attribute2];
        }

        this._skillValue = skillValue;

        this._cache = {
            enabled: false,
            value: null,
        };
    }

    toObject() {
        return {
            id: this.id,
            label: this.label,
            value: this.value,
            attribute1: this.attribute1?.toObject(),
            attribute2: this.attribute2?.toObject(),
        };
    }

    get points() {
        //No actual skill value can have a value of 0 (let alone null or undefined). Therefore if we encounter this,
        // we're dealing with a proper skill (one calculated from attributes and points), meaning that we can just
        // read out the points from the actor.
        if (!this._skillValue) {
            return parseInt(this.actor.system.skills[this.id]?.points ?? "0");
        } else {
            return this._skillValue - (this.attribute1?.value || 0) - (this.attribute2?.value || 0);
        }
    }

    get value() {
        if (this._cache.enabled && this._cache.value !== null) return this._cache.value;

        let value = (this.attribute1?.value || 0) + (this.attribute2?.value || 0) + this.points;
        value += this.mod;

        if (this._cache.enabled && this._cache.value === null) this._cache.value = value;
        return value;
    }

    /**
     * @returns {IModifier[]}
     */
    get selectableModifier() {
        return this.actor.modifier
            .getForIds(...this._modifierPath)
            .selectable()
            .getModifiers();
    }

    get isGrandmaster() {
        return this.actor.items.find(
            (i) => i.type === "mastery" && (i.system.isGrandmaster || 0) && i.system.skill === this.id
        );
    }

    enableCaching() {
        this._cache.enabled = true;
    }

    disableCaching() {
        this._cache.enabled = false;
        this._cache.value = null;
    }

    get maneuvers() {
        return this.actor.items.filter(
            (i) => i.type === "mastery" && (i.system.isManeuver || false) && i.system.skill === this.id
        );
    }

    /** @return {Record<string,number>} */
    get attributeValues() {
        const skillAttributes = {};
        [this.attribute1, this.attribute2].forEach((attribute) => {
            if (attribute?.id && attribute?.value) {
                skillAttributes[attribute.id] = attribute.value;
            }
        });
        return skillAttributes;
    }

    /**
     * @param {{difficulty: unknown, preSelectedModifier:string[], subtitle:?string, title:?string, type:string, modifier:number, checkMessageData: Record<string, any>}} options
     * @return {Promise<*|boolean>}
     */
    async roll(options = {}) {
        let checkData = await this.prepareRollDialog(
            options.preSelectedModifier ?? [],
            options.title,
            options.subtitle,
            options.difficulty,
            options.modifier
        );
        if (!checkData) {
            return false;
        }
        const principalTarget = Array.from(game.user.targets)[0];
        const rollDifficulty = parseRollDifficulty(checkData.difficulty);
        let hideDifficulty = rollDifficulty.isTargetDependentValue();
        if (principalTarget) {
            rollDifficulty.evaluate(principalTarget);
        }
        checkData.difficulty = rollDifficulty.difficulty;
        if (this.isGrandmaster) {
            checkData.rollType = checkData.rollType + "Grandmaster";
        }

        let rollResult = await Dice.check(this, checkData.difficulty, checkData.rollType, checkData.modifier);
        let skillAttributes = this.attributeValues;

        const mappedModifiers = checkData.modifierElements.map((mod) => ({
            isMalus: mod.value < 0,
            value: `${Math.abs(mod.value)}`,
            description: mod.description,
        }));
        if (options.type === "spell") {
            return {
                rollOptions: ChatMessage.applyRollMode(
                    {
                        rolls: [rollResult.roll],
                        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    },
                    checkData.rollMode
                ),
                /**@type CheckReport*/
                report: {
                    skill: {
                        id: this.id,
                        attributes: skillAttributes,
                        points: this.points,
                    },
                    difficulty: rollResult.difficulty,
                    rollType: checkData.rollType,
                    roll: {
                        total: rollResult.roll.total,
                        dice: rollResult.roll.dice,
                        tooltip: await rollResult.roll.getTooltip(),
                    },
                    modifierElements: [...this.#getStaticModifiersForReport(), ...mappedModifiers],
                    succeeded: rollResult.succeeded,
                    isFumble: rollResult.isFumble,
                    isCrit: rollResult.isCrit,
                    degreeOfSuccess: rollResult.degreeOfSuccess,
                    degreeOfSuccessMessage: rollResult.degreeOfSuccessMessage,
                    hideDifficulty: hideDifficulty,
                },
            };
        }

        let checkMessageData = {
            type: options.type || "skill",
            skill: this.id,
            skillValue: this.value,
            skillPoints: this.points,
            skillAttributes: skillAttributes,
            difficulty: rollResult.difficulty,
            rollType: checkData.rollType,
            modifierElements: [...this.#getStaticModifiersForReport(), ...mappedModifiers],
            succeeded: rollResult.succeeded,
            isFumble: rollResult.isFumble,
            isCrit: rollResult.isCrit,
            degreeOfSuccess: rollResult.degreeOfSuccess,
            availableSplinterpoints: this.actor.type === "character" ? this.actor.system.splinterpoints.value : 0,
            hideDifficulty: hideDifficulty,
            maneuvers: checkData.maneuvers || [],
            ...(options.checkMessageData || {}),
        };

        return ChatMessage.create(
            await Chat.prepareCheckMessageData(this.actor, checkData.rollMode, rollResult.roll, checkMessageData)
        );
    }

    /**
     * @typedef {number|'VTD'|'KW'|'GW'} RollDifficultyString
     */

    /**
     * @typedef {{name: string, label:string, value: unknown, active:boolean}} EmphasisData
     */
    /**
     * @typedef {{difficulty:RollDifficultyString, modifier:number, emphasis: EmphasisData, rollMode: unknown}} CheckDialogOptions
     * @param {string[]}selectedModifiers
     * @param {string} title
     * @param {string} subtitle
     * @param {RollDifficultyString} difficulty
     * @param {number} modifier
     * @return {Promise<CheckDialogOptions>}
     */
    async prepareRollDialog(selectedModifiers, title, subtitle, difficulty, modifier) {
        let emphasisData = [];
        let selectableModifier = this.selectableModifier;
        selectedModifiers = selectedModifiers.map((s) => s.trim().toLowerCase());
        if (selectableModifier) {
            emphasisData = selectableModifier
                .map((mod) => [mod.attributes.name, asString(mod.value)])
                .map(([key, value]) => {
                    const operator = /(?<=^\s*)[+-]/.exec(value)?.[0] ?? "+";
                    const cleanedValue = value.replace(/^\s*[+-]/, "").trim();
                    return {
                        name: key,
                        label: `${key} ${operator} ${cleanedValue}`,
                        value: value,
                        active: selectedModifiers.includes(key.trim().toLowerCase()),
                    };
                });
        }

        let skillFormula = this.getFormula();
        skillFormula.addOperator("=");
        skillFormula.addPart(this.value, game.i18n.localize("splittermond.skillValueAbbrev"));

        return CheckDialog.create({
            difficulty: difficulty || 15,
            modifier: modifier || 0,
            emphasis: emphasisData,
            title: this.#createRollDialogTitle(title, subtitle),
            skill: this,
            skillTooltip: skillFormula.render(),
        });
    }

    /**
     * @param {string} title
     * @param {string} subtitle
     * @return {string}
     */
    #createRollDialogTitle(title, subtitle) {
        const displayTitle = title || game.i18n.localize(this.label);
        const displaySubtitle = subtitle || "";
        return displaySubtitle ? displayTitle : `${displayTitle} - ${displaySubtitle}`;
    }

    #getStaticModifiersForReport() {
        return this.actor.modifier
            .getForIds(...this._modifierPath)
            .notSelectable()
            .getModifiers()
            .map((mod) => ({
                isMalus: mod.isMalus,
                value: asString(mod.value),
                description: mod.attributes.name,
            }));
    }

    getFormula() {
        let formula = new Tooltip.TooltipFormula();
        if (this.attribute1) {
            formula.addPart(this.attribute1.value, this.attribute1.label.short);
        }
        if (this.attribute2) {
            formula.addOperator("+");
            formula.addPart(this.attribute2.value, this.attribute2.label.short);
        }
        const skillPoints = this.points;
        if (this.attribute1 || this.attribute2) {
            formula.addOperator(this.points < 0 ? "-" : "+");
        }
        formula.addPart(Math.abs(this.points), game.i18n.localize("splittermond.skillPointsAbbrev"));

        this.addModifierTooltipFormulaElements(formula);
        return formula;
    }

    tooltip() {
        return this.getFormula().render();
    }
}
