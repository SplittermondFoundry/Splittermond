import { TooltipFormula } from "module/util/tooltip";
import {
    abs,
    asString,
    condense,
    type Expression,
    isGreaterZero,
    isLessThanZero,
} from "module/modifiers/expressions/scalar";
import type { IModifier, ModifierAttributes } from "module/modifiers";

export default class Modifier implements IModifier {
    private _isBonus: boolean;
    private _isMalus: boolean;

    /**
     *
     * @param {string} path Modifier Path
     * @param {(numeric | string)} value
     * @param attributes secondary selection characteristics of this modifier
     * @param {(Item | Actor)=null} origin
     * @param {boolean=false} selectable is the modifier selectable as a roll option
     */
    constructor(
        public readonly path: string,
        public readonly value: Expression,
        public readonly attributes: ModifierAttributes,
        public readonly origin: object | null = null,
        public readonly selectable = false
    ) {
        this.selectable = selectable;
        this._isBonus = isGreaterZero(value) ?? true; //Assume a bonus if result is unknown
        this._isMalus = isLessThanZero(value) ?? false;
    }

    get isMalus() {
        return this._isMalus;
    }

    get isBonus() {
        return this._isBonus;
    }

    addTooltipFormulaElements(formula: TooltipFormula) {
        if (this.isBonus) {
            const term = `+${asString(abs(condense(this.value)))}`;
            formula.addBonus(term, this.attributes.name);
        } else {
            const term = `-${asString(abs(condense(this.value)))}`;
            formula.addMalus(term, this.attributes.name);
        }
    }

    equals(other: Modifier) {
        return this.path === other.path;
    }

    get groupId() {
        return this.path;
    }

    /**
     * @deprecated use attribute filters to access these
     */
    get name() {
        return this.attributes.name;
    }

    /**
     * @deprecated use attribute filters to access these
     */
    get type() {
        return this.attributes.type;
    }
}
