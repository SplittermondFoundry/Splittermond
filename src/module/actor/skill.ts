import CheckDialog from "../apps/dialog/check-dialog";
import { Dice } from "../check/dice";
import { Chat } from "../util/chat";
import * as Tooltip from "../util/tooltip";
import { parseRollDifficulty } from "../util/rollDifficultyParser";
import { asString } from "module/modifiers/expressions/scalar";
import { foundryApi } from "../api/foundryApi";
import { splittermond } from "../config";
import { modifyEvaluation } from "module/check/modifyEvaluation";
import { DataModelSchemaType, fieldExtensions, fields, SplittermondDataModel } from "../data/SplittermondDataModel";
import SplittermondActor from "./actor";
import { ChatMessage } from "module/api/ChatMessage";
import type Attribute from "module/actor/attribute";
import type { IModifier } from "module/modifiers";
import type { SplittermondAttribute } from "module/config/attributes";
import { isMember } from "module/util/util";
import Modifiable from "module/actor/modifiable";
import type SplittermondMasteryItem from "module/item/mastery";

function newSkillAttribute() {
    const id = new fieldExtensions.StringEnumField({
        required: true,
        nullable: false,
        validate: (x: SplittermondAttribute | "") => x === "" || isMember(splittermond.attributes, x),
    });
    const label = new fields.SchemaField(
        {
            long: new fields.StringField({ required: true, nullable: false }),
            short: new fields.StringField({ required: true, nullable: false }),
        },
        { required: true, nullable: false }
    );
    const value = new fields.NumberField({ required: true, nullable: false, initial: 0 });
    return new fields.SchemaField({ id, value, label }, { required: true, nullable: false });
}
type SkillAttribute = { id: string; value: number; label: { short: string; long: string } };

function SkillSchema() {
    return {
        actorUuid: new fields.StringField({ required: true, nullable: false }),
        id: new fields.StringField({ required: true, nullable: false }),
        label: new fields.StringField({ required: true, nullable: false }),
        _attribute1: newSkillAttribute(),
        _attribute2: newSkillAttribute(),
        _skillValue: new fields.NumberField({ required: true, nullable: true, initial: null }),
        _modifierPath: new fields.ArrayField(new fields.StringField({}), { required: true, nullable: false }),
    };
}

type SkillType = DataModelSchemaType<typeof SkillSchema>;

/**
 * Skill class representing a character's skill
 * @property {string} id
 * @property {string} label
 */
export default class Skill extends Modifiable(SplittermondDataModel<SkillType>) {
    static defineSchema = SkillSchema;

    private _actor: SplittermondActor | null = null;
    private _attribute1Cache: Attribute | null = null;
    private _attribute2Cache: Attribute | null = null;
    private _cache = {
        enabled: false,
        value: null as number | null,
    };

    /**
     * Initializer function that replaces the constructor logic
     * @param actor Actor-Object for the skill
     * @param skill Skill name/id
     * @param attribute1 First attribute
     * @param attribute2 Second attribute
     * @param skillValue Optional skill value override
     */
    static initialize(
        actor: SplittermondActor,
        skill: string,
        attribute1?: SplittermondAttribute | "",
        attribute2?: SplittermondAttribute | "",
        skillValue: number | null = null
    ): Skill {
        const id = skill.toLowerCase().trim();
        let label = skill;
        let attr1: Attribute | null = null;
        let attr2: Attribute | null = null;

        if ((actor.system.skills as any)[skill]) {
            label = foundryApi.localize(`splittermond.skillLabel.${id}`);
            const finalAttribute1 = attribute1 ? attribute1 : (splittermond.skillAttributes as any)[skill][0];
            const finalAttribute2 = attribute2 ? attribute2 : (splittermond.skillAttributes as any)[skill][1];
            attr1 = (actor.attributes as Attribute[])[finalAttribute1];
            attr2 = (actor.attributes as Attribute[])[finalAttribute2];
        }

        const skillInstance = new Skill({
            actorUuid: actor.uuid,
            id,
            label,
            _attribute1: {
                id: (attr1?.id ?? "") as SplittermondAttribute | "",
                value: attr1?.value ?? 0,
                label: attr1?.label ?? { short: "", long: attribute1 ?? "" },
            },
            _attribute2: {
                id: (attr2?.id ?? "") as SplittermondAttribute | "",
                value: attr2?.value ?? 0,
                label: attr1?.label ?? { short: "", long: attribute2 ?? "" },
            },
            _skillValue: skillValue,
            _modifierPath: [id, "woundmalus"],
        });

        skillInstance._actor = actor;
        skillInstance._attribute1Cache = attr1;
        skillInstance._attribute2Cache = attr2;
        return skillInstance;
    }

    get actor(): SplittermondActor {
        if (this._actor === null) {
            const actor = foundryApi.utils.fromUUIDSync(this.actorUuid);
            if (!actor) {
                throw new Error(`Failed to retrieve actor with UUID: ${this.actorUuid}`);
            }
            this._actor = actor as SplittermondActor;
        }
        return this._actor;
    }

    toObject() {
        const superObject = super.toObject();
        return {
            ...superObject,
            id: this.id,
            label: this.label,
            value: this.value,
            attribute1: this.attribute1,
            attribute2: this.attribute2,
        };
    }
    addModifierPath(...path: string[]) {
        this.updateSource({ _modifierPath: [...this._modifierPath, ...path] });
    }
    get attribute1(): SkillAttribute {
        return this._attribute1Cache?.toObject() ?? this._attribute1;
    }

    get attribute2(): SkillAttribute {
        return this._attribute2Cache?.toObject() ?? this._attribute2;
    }

    get points(): number {
        //No actual skill value can have a value of 0 (let alone null or undefined). Therefore if we encounter this,
        // we're dealing with a proper skill (one calculated from attributes and points), meaning that we can just
        // read out the points from the actor.
        if (!this._skillValue) {
            return parseInt((this.actor.system.skills as any)[this.id]?.points ?? "0");
        } else {
            return this._skillValue - (this.attribute1?.value || 0) - (this.attribute2?.value || 0);
        }
    }

    get value(): number {
        if (this._cache.enabled && this._cache.value !== null) return this._cache.value;

        let value = (this.attribute1?.value || 0) + (this.attribute2?.value || 0) + this.points;
        value += this.mod;

        if (this._cache.enabled && this._cache.value === null) this._cache.value = value;
        return value;
    }

    get selectableModifier(): IModifier[] {
        const fromPath = this.actor.modifier
            .getForIds(...(this._modifierPath as any))
            .selectable()
            .getModifiers();
        const fromSkill = this.skillModifiers().selectable().getModifiers();
        fromPath.push(...fromSkill);
        return fromSkill;
    }

    get isGrandmaster() {
        return this.actor.items.find(
            (i: any) => i.type === "mastery" && (i.system.isGrandmaster || 0) && i.system.skill === this.id
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
            (i: any) => i.type === "mastery" && (i.system.isManeuver || false) && i.system.skill === this.id
        );
    }

    /** @return {Record<string,number>} */
    get attributeValues(): Record<string, number> {
        const skillAttributes: Record<string, number> = {};
        [this.attribute1, this.attribute2].forEach((attribute) => {
            if (attribute?.id && attribute?.value) {
                skillAttributes[attribute.id] = attribute.value;
            }
        });
        return skillAttributes;
    }
    additionalModifiers() {
        return this.skillModifiers().notSelectable().getModifiers();
    }
    private skillModifiers() {
        return this.actor.modifier
            .getForId("actor.skills")
            .withAttributeValuesOrAbsent("attribute1", this.attribute1?.id ?? "", this.attribute2?.id ?? "")
            .withAttributeValuesOrAbsent("attribute2", this.attribute2?.id ?? "", this.attribute1?.id ?? "")
            .withAttributeValuesOrAbsent("skill", this.id);
    }

    /**
     * @param {{
     *  difficulty?: RollDifficultyString,
     *  preSelectedModifier?: string[],
     *  subtitle?: string,
     *  title?: string,
     *  type?: string|"attack"|"spell"|"defense",
     *  modifier?: number,
     *  checkMessageData?: Record<string, any>,
     *  rollType?: RollType,
     *  askUser?: boolean,
     * }} options
     * @return {Promise<*|boolean>}
     */
    async roll(options: any = {}) {
        let checkData = await this.finalizeCheckInputData(
            options.preSelectedModifier,
            options.title,
            options.subtitle,
            options.difficulty,
            options.modifier,
            options.rollType,
            options.askUser ?? true
        );
        if (!checkData) {
            return false;
        }
        const principalTarget = Array.from(foundryApi.currentUser.targets)[0] as any;
        const rollDifficulty = parseRollDifficulty(checkData.difficulty);
        let hideDifficulty = rollDifficulty.isTargetDependentValue();
        if (principalTarget) {
            rollDifficulty.evaluate(principalTarget);
        }
        checkData.difficulty = rollDifficulty.difficulty;
        if (this.isGrandmaster) {
            checkData.rollType = checkData.rollType + "Grandmaster";
        }

        const immediateRollResult = await Dice.check(
            this,
            checkData.difficulty,
            checkData.rollType,
            checkData.modifier
        );
        let rollResult = modifyEvaluation(
            {
                ...immediateRollResult,
                skill: this.id,
                type: options.type ?? "skill",
            },
            this.actor
        );
        let skillAttributes = this.attributeValues;

        const mappedModifiers = checkData.modifierElements.map((mod: any) => ({
            isMalus: mod.value < 0,
            value: `${Math.abs(mod.value)}`,
            description: mod.description,
        }));
        if (options.type === "spell" || options.type === "attack") {
            return {
                rollOptions: ChatMessage.applyRollMode(
                    {
                        rolls: [rollResult.roll],
                        type: foundryApi.chatMessageTypes.OTHER,
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
                    defenseType: rollDifficulty.defenseType,
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
                    hideDifficulty,
                    maneuvers: checkData.maneuvers.map((item: SplittermondMasteryItem) => ({
                        uuid: item.uuid,
                        name: item.name,
                        description: item.system.description,
                    })),
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
            availableSplinterpoints:
                this.actor.type === "character" ? (this.actor.system as any).splinterpoints.value : 0,
            hideDifficulty,
            maneuvers: checkData.maneuvers || [],
            ...(options.checkMessageData || {}),
        };

        return foundryApi.createChatMessage(
            await Chat.prepareCheckMessageData(this.actor, checkData.rollMode, rollResult.roll, checkMessageData)
        );
    }

    /**
     * @param {?string[]} selectedModifiers
     * @param {?string} title
     * @param {?string} subtitle
     * @param {?RollDifficultyString} difficulty
     * @param {?number} modifier
     * @param {?RollType} rollType
     * @param {boolean} askUser
     * @return {Promise<CheckDialogData|null>}
     */
    async finalizeCheckInputData(
        selectedModifiers: string[] | null,
        title: string | null,
        subtitle: string | null,
        difficulty: any,
        modifier: number | null,
        rollType: any,
        askUser: boolean = true
    ): Promise<any> {
        if (!askUser) {
            /** @type CheckDialogData */
            return {
                difficulty: difficulty || splittermond.check.defaultDifficulty,
                maneuvers: [],
                modifier: modifier || 0,
                modifierElements: modifier
                    ? [{ value: modifier, description: foundryApi.localize("splittermond.modifier") }]
                    : [],
                rollMode: "publicroll",
                rollType: rollType ?? "standard",
            };
        }
        return this.prepareRollDialog(selectedModifiers ?? [], title, subtitle, difficulty, modifier);
    }

    /**
     * @param {string[]} selectedModifiers
     * @param {?string} title
     * @param {?string} subtitle
     * @param {?RollDifficultyString} difficulty
     * @param {number} modifier
     * @return {Promise<CheckDialogData|null>}
     */
    async prepareRollDialog(
        selectedModifiers: string[],
        title: string | null,
        subtitle: string | null,
        difficulty: any,
        modifier: number | null
    ): Promise<any> {
        let emphasisData: any[] = [];
        let selectableModifier = this.selectableModifier;
        if (selectableModifier) {
            selectedModifiers = selectedModifiers.map((s) => s.trim().toLowerCase());
            emphasisData = selectableModifier
                .map((mod: IModifier) => [mod.attributes.name, asString(mod.value)])
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
        skillFormula.addPart(this.value, foundryApi.localize("splittermond.skillValueAbbrev"));

        return CheckDialog.create({
            difficulty: difficulty || splittermond.check.defaultDifficulty,
            modifier: modifier || 0,
            emphasis: emphasisData,
            rollMode: foundryApi.settings.get("core", "rollMode") as string,
            rollModes: foundryApi.rollModes,
            title: this.#createRollDialogTitle(title, subtitle),
            skill: this,
            skillTooltip: skillFormula.render(),
        });
    }

    /**
     * @param {?string} title
     * @param {?string} subtitle
     * @return {string}
     */
    #createRollDialogTitle(title: string | null, subtitle: string | null): string {
        const displayTitle = title || foundryApi.localize(this.label);
        const displaySubtitle = subtitle || "";
        return displaySubtitle ? displayTitle : `${displayTitle} - ${displaySubtitle}`;
    }

    #getStaticModifiersForReport() {
        return this.collectModifiers().map((mod: any) => ({
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
        if (this.attribute1 || this.attribute2) {
            formula.addOperator(this.points < 0 ? "-" : "+");
        }
        formula.addPart(Math.abs(this.points), foundryApi.localize("splittermond.skillPointsAbbrev"));

        this.addModifierTooltipFormulaElements(formula);
        return formula;
    }

    tooltip() {
        return this.getFormula().render();
    }
}
