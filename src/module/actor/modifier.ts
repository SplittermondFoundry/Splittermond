import { TooltipFormula } from "../util/tooltip";
import {
    abs,
    asString,
    condense,
    evaluate,
    type Expression,
    isGreaterZero,
    isLessThanZero,
    of,
    plus,
    times,
} from "../modifiers/expressions/scalar";
import type { IModifier, ModifierAttributes } from "./modifier-manager";

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

export class Modifiers extends Array<IModifier> {
    constructor(...args: IModifier[]) {
        super(...args);
        Object.setPrototypeOf(this, Modifiers.prototype);
    }

    static from(modifiers: ArrayLike<IModifier> | Iterable<IModifier>) {
        return new Modifiers(...Array.from(modifiers));
    }

    get groupId() {
        return this.map((mod) => mod.groupId).join(",");
    }

    get selectable() {
        return this.some((mod) => mod.selectable);
    }

    get nameForDisplay() {
        return this.map((mod) => mod.attributes).join(",");
    }

    get types(): string[] {
        const types = new Set<string>();
        this.map((mod) => mod.attributes.type)
            .filter((t) => t !== null && t !== undefined)
            .forEach((t) => types.add(t));
        return Array.from(types);
    }

    /**@deprecated use sum instead */
    get value() {
        return this.sum;
    }

    get sum() {
        return evaluate(this.sumExpressions());
    }

    get product() {
        return evaluate(this.multiplyExpressions());
    }

    sumExpressions() {
        return this.map((mod) => mod.value).reduce((acc, value) => plus(acc, value), of(0));
    }
    multiplyExpressions() {
        return this.map((mod) => mod.value).reduce((acc, value) => times(acc, value), of(1));
    }

    filter(predicate: (value: IModifier, index: number, array: IModifier[]) => boolean, thisArg?: any): Modifiers {
        return new Modifiers(...super.filter(predicate, thisArg));
    }

    addTooltipFormulaElements(formula: TooltipFormula) {
        this.forEach((mod) => mod.addTooltipFormulaElements(formula));
    }
}
