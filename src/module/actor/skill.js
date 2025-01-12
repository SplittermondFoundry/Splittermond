import Modifiable from "./modifiable.js";
import CheckDialog from "../apps/dialog/check-dialog.js"
import * as Dice from "../util/dice.js"
import * as Chat from "../util/chat.js";
import * as Tooltip from "../util/tooltip.js";
import {parseRollDifficulty} from "../util/rollDifficultyParser.js";


export default class Skill extends Modifiable {
    constructor(actor, skill, attribute1 = "", attribute2 = "", skillValue = null) {
        super(actor, [skill.toLowerCase().trim(), "woundmalus"]);
        this.id = skill.toLowerCase().trim();
        this.label = skill;
        if (this.actor.system.skills[skill]) {
            this.label = game.i18n.localize(`splittermond.skillLabel.${this.id}`);
            attribute1 = attribute1 ? attribute1 : CONFIG.splittermond.skillAttributes[skill][0];
            attribute2 = attribute2 ? attribute2 : CONFIG.splittermond.skillAttributes[skill][1];
            this.attribute1 = this.actor.attributes[attribute1];
            this.attribute2 = this.actor.attributes[attribute2];
        }

        this._skillValue = skillValue;


        this._cache = {
            enabled: false,
            value: null
        };
    }

    toObject() {
        return {
            id: this.id,
            label: this.label,
            value: this.value,
            attribute1: this.attribute1?.toObject(),
            attribute2: this.attribute2?.toObject()
        }
    }

    get points() {
        if (this._skillValue === null) {
            return parseInt(this.actor.system.skills[this.id].points);
        } else {
            return this._skillValue - (this.attribute1?.value || 0) - (this.attribute2?.value || 0);
        }

    }

    get value() {
        if (this._cache.enabled && this._cache.value !== null) return this._cache.value;

        let value = (this.attribute1?.value || 0) + (this.attribute2?.value || 0) + this.points;
        value += this.mod;

        if (this._cache.enabled && this._cache.value === null)
            this._cache.value = value;
        return value;
    }

    get selectableModifier() {
        return this.actor.modifier.selectable(this._modifierPath);
    }

    get isGrandmaster() {
        return this.actor.items.find(i => i.type === "mastery" && (i.system.isGrandmaster || 0) && i.system.skill === this.id);
    }

    enableCaching() {
        this._cache.enabled = true;
    }

    disableCaching() {
        this._cache.enabled = false;
        this._cache.value = null;
    }

    get maneuvers() {
        return this.actor.items.filter(i => i.type === "mastery" && (i.system.isManeuver || false) && i.system.skill === this.id);
    }

    /** @return {Record<string,number>} */
    get attributeValues() {
        const skillAttributes = {};
        [this.attribute1, this.attribute2].forEach(attribute => {
            if (attribute?.id && attribute?.value) {
                skillAttributes[attribute.id] = attribute.value;
            }
        });
        return skillAttributes;
    }

    /**
     * @param {{difficulty: unknown, preSelectedModifier:string[], subtitle:?string, title:?string, type:string}} options
     * @return {Promise<*|boolean>}
     */
    async roll(options = {}) {
        let checkData = await this.prepareRollDialog(
            options.preSelectedModifier ?? [], options.title, options.subtitle, options.difficulty, options.modifier);
        if (!checkData) {
            return false;
        }
        const principalTarget = Array.from(game.user.targets)[0];
        const rollDifficulty = parseRollDifficulty(checkData.difficulty)
        let hideDifficulty = rollDifficulty.isTargetDependentValue()
        if (principalTarget) {
            rollDifficulty.evaluate(principalTarget);
        }
        checkData.difficulty = rollDifficulty.difficulty;
        if (this.isGrandmaster) {
            checkData.rollType = checkData.rollType + "Grandmaster";
        }

        let rollResult = await Dice.check(this, checkData.difficulty, checkData.rollType, checkData.modifier);
        let skillAttributes = this.attributeValues;

        if (options.type === "spell") {
            return {
                rollOptions: ChatMessage.applyRollMode({
                    rolls:[JSON.stringify(rollResult.roll)],
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                }, checkData.rollMode),
                /**@type CheckReport*/
                report: {
                    skill: {
                        id: this.id,
                        attributes: skillAttributes,
                        points: this.points
                    },
                    difficulty: rollResult.difficulty,
                    rollType: checkData.rollType,
                    roll: {
                        total: rollResult.roll.total,
                        dice: rollResult.roll.dice,
                        tooltip: await rollResult.roll.getTooltip(),
                    },
                    modifierElements: checkData.modifierElements,
                    succeeded: rollResult.succeeded,
                    isFumble: rollResult.isFumble,
                    isCrit: rollResult.isCrit,
                    degreeOfSuccess: rollResult.degreeOfSuccess,
                    hideDifficulty: hideDifficulty,
                }
            }
        }


        let checkMessageData = {
            type: options.type || "skill",
            skill: this.id,
            skillValue: this.value,
            skillPoints: this.points,
            skillAttributes: skillAttributes,
            difficulty: rollResult.difficulty,
            rollType: checkData.rollType,
            modifierElements: checkData.modifierElements,
            succeeded: rollResult.succeeded,
            isFumble: rollResult.isFumble,
            isCrit: rollResult.isCrit,
            degreeOfSuccess: rollResult.degreeOfSuccess,
            availableSplinterpoints: this.actor.type === "character" ? this.actor.system.splinterpoints.value : 0,
            hideDifficulty: hideDifficulty,
            maneuvers: checkData.maneuvers || [],
            ...(options.checkMessageData || {})
        };

        return ChatMessage.create(await Chat.prepareCheckMessageData(this.actor, checkData.rollMode, rollResult.roll, checkMessageData));
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
        selectedModifiers = selectedModifiers.map(s => s.trim().toLowerCase());
        if (selectableModifier) {
            emphasisData = Object.entries(selectableModifier).map(([key, value]) => {
                return {
                    name: key,
                    label: key + (value > 0 ? " +" : " ") + value,
                    value: value,
                    active: selectedModifiers.includes(key.trim().toLowerCase())
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

    getFormula() {
        let formula = new Tooltip.TooltipFormula();
        if (this.attribute1) {
            formula.addPart(this.attribute1.value, this.attribute1.label.short);
            formula.addOperator("+");
        }
        if (this.attribute2) {
            formula.addPart(this.attribute2.value, this.attribute2.label.short);
            formula.addOperator("+");
        }
        formula.addPart(this.points, game.i18n.localize("splittermond.skillPointsAbbrev"));

        this.addModifierTooltipFormulaElements(formula);
        return formula;
    }

    tooltip() {
        return this.getFormula().render();
    }

}