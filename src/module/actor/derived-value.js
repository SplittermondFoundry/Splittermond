import * as Tooltip from "../util/tooltip.js";
import Modifiable from "./modifiable.js";
import { evaluate, of, plus, times } from "../modifiers/expressions/scalar/index.js";

export default class DerivedValue extends Modifiable {
    /**
     *
     * @param {Actor} actor Actor object of DerivedValue
     * @param {string} id ID of Derived value like "size", "speed", "initiative" etc.
     */
    constructor(actor, id) {
        let path = [id];
        if ("speed" === id) path.push("woundmalus");
        if ("initiative" === id) path.push("initiativewoundmalus");
        super(actor, path);
        this.id = id;
        this.multiplier = 1;
        this.label = {
            short: `splittermond.derivedAttribute.${this.id}.short`,
            long: `splittermond.derivedAttribute.${this.id}.long`,
        };

        this._cache = {
            enabled: false,
            baseValue: null,
            value: null,
        };
    }

    get sheetData() {
        return {
            id: this.id,
            label: this.label,
            value: this.value,
        };
    }

    get baseValue() {
        if (this.actor.type !== "character" && this.actor.system.derivedAttributes[this.id].value > 0)
            return this.actor.system.derivedAttributes[this.id].value;
        if (this._cache.enabled && this._cache.baseValue !== null) return this._cache.baseValue;
        let baseValue = 0;
        const attributes = this.actor.attributes;
        const derivedValues = this.actor.derivedValues;
        switch (this.id) {
            case "size":
                baseValue =
                    this.actor.type === "npc"
                        ? this.actor.system.derivedAttributes[this.id].value
                        : parseInt(this.actor.system.species.size);
                break;
            case "speed":
                baseValue = attributes.agility.value + derivedValues.size.value;
                break;
            case "initiative":
                baseValue = 10 - attributes.intuition.value;
                break;
            case "healthpoints":
                baseValue = derivedValues.size.value + attributes.constitution.value;
                break;
            case "focuspoints":
                baseValue = 2 * (attributes.mystic.value + attributes.willpower.value);
                break;
            case "defense":
                baseValue =
                    12 + attributes.agility.value + attributes.strength.value + 2 * (5 - derivedValues.size.value);
                break;
            case "bodyresist":
                baseValue = 12 + attributes.willpower.value + attributes.constitution.value;
                break;
            case "mindresist":
                baseValue = 12 + attributes.willpower.value + attributes.mind.value;
                break;
            default:
                return 0;
                break;
        }
        if (this._cache.enabled && this._cache.baseValue === null) this._cache.baseValue = baseValue;
        return baseValue;
    }

    tooltip() {
        let formula = new Tooltip.TooltipFormula();
        const attributes = this.actor.attributes;
        const derivedValues = this.actor.derivedValues;
        switch (this.id) {
            case "size":
                formula.addPart(this.baseValue, this.label.short);
                break;
            case "speed":
                formula.addPart(attributes.agility.value, attributes.agility.label.short);
                formula.addOperator("+");
                formula.addPart(derivedValues.size.value, derivedValues.size.label.short);
                break;
            case "initiative":
                formula.addPart("10");
                formula.addOperator("-");
                formula.addPart(attributes.intuition.value, attributes.intuition.label.short);
                break;
            case "healthpoints":
                formula.addPart(derivedValues.size.value, derivedValues.size.label.short);
                formula.addOperator("+");
                formula.addPart(attributes.constitution.value, attributes.constitution.label.short);
                break;
            case "focuspoints":
                formula.addOperator("2 &times; (");
                formula.addPart(attributes.mystic.value, attributes.mystic.label.short);
                formula.addOperator("+");
                formula.addPart(attributes.willpower.value, attributes.willpower.label.short);
                formula.addOperator(")");
                break;
            case "defense":
                formula.addOperator("12 +");
                formula.addPart(attributes.agility.value, attributes.agility.label.short);
                formula.addOperator("+");
                formula.addPart(attributes.strength.value, attributes.strength.label.short);
                formula.addOperator("+");
                formula.addOperator("2 &times; ( 5 -");
                formula.addPart(derivedValues.size.value, derivedValues.size.label.short);
                formula.addOperator(")");
                break;
            case "bodyresist":
                formula.addOperator("12 +");
                formula.addPart(attributes.willpower.value, attributes.willpower.label.short);
                formula.addOperator("+");
                formula.addPart(attributes.constitution.value, attributes.constitution.label.short);
                break;
            case "mindresist":
                formula.addOperator("12 +");
                formula.addPart(attributes.willpower.value, attributes.willpower.label.short);
                formula.addOperator("+");
                formula.addPart(attributes.mind.value, attributes.mind.label.short);
                break;
            default:
                break;
        }
        this.addModifierTooltipFormulaElements(formula);
        return formula.render();
    }

    get value() {
        if (this._cache.enabled && this._cache.value !== null) return this._cache.value;
        let value = Math.ceil(evaluate(this.valueAsExpression()));
        if (this._cache.enabled && this._cache.value === null) this._cache.value = value;
        return value;
    }

    valueAsExpression() {
        const base = this.baseValue;
        const multiplier = this.multiplierAsExpression();
        const modifier = of(this.mod);
        return times(multiplier, plus(of(base), modifier));
    }

    multiplierAsExpression() {
        return this.actor.modifier.getForId(`actor.${this.id}.multiplier`).notSelectable().getModifiers().product;
    }

    enableCaching() {
        this._cache.enabled = true;
    }

    disableCaching() {
        this._cache.enabled = false;
        this._cache.baseValue = null;
        this._cache.value = null;
    }
}
