import {TooltipFormula} from "../util/tooltip";
import {
    abs,
    asString,
    condense,
    evaluate,
    type Expression,
    isGreaterZero,
    isLessThanZero,
    of,
    plus
} from "./modifiers/expressions/scalar";

export interface ModifierAttributes {
    name:string;
    type:ModifierType
    [x:string]: string|undefined|null;
}

/**
 * The type of item from which the modifier stems. Use
 * <ul>
 *     <li><code>magic</code> for spells, their effects and temporary enchantments</li>
 *     <li><code>equipment</code> for arms, armor and any personal effects</li>
 *     <li><code>innate</code> for strengths, masteries and other permanent effects</li>
 * </ul>
 */
export type ModifierType = "magic"|"equipment"|"innate"|null;
export interface IModifier {
   readonly value:Expression;
   addTooltipFormulaElements(formula:TooltipFormula):void;
   readonly isBonus:boolean;
   readonly groupId:string;
   readonly selectable:boolean;
   readonly attributes: ModifierAttributes
   readonly origin: object|null;
}

export default class Modifier implements IModifier {
    private _isBonus:boolean;
    private _isMalus:boolean;
    /**
     *
     * @param {string} path Modifier Path
     * @param {(numeric | string)} value
     * @param attributes secondary selection characteristics of this modifier
     * @param {(Item | Actor)=null} origin
     * @param {boolean=false} selectable is the modifier selectable as a roll option
     */
    constructor(
        public readonly path:string,
        public readonly value:Expression,
        public readonly attributes:ModifierAttributes,
        public readonly origin:object|null = null,
        public readonly selectable = false) {
        this.selectable = selectable;
        this._isBonus = isGreaterZero(value) ?? true; //Assume a bonus if result is unknown
        this._isMalus= isLessThanZero(value) ?? false;
    }


    get isMalus() {
        return this._isMalus
    }

    get isBonus() {
        return this._isBonus;
    }

    addTooltipFormulaElements(formula:TooltipFormula ) {
        if (this.isBonus) {
            const term = `+${asString(abs(condense(this.value)))}`
            formula.addBonus(term, this.attributes.name);
        } else {
            const term = `-${asString(abs(condense(this.value)))}`
            formula.addMalus(term, this.attributes.name);
        }
    }

    equals(other:Modifier) {
        return this.path === other.path;
    }

    get groupId(){
        return this.path
    }

    /**
     * @deprecated use attribute filters to access these
     */
    get name(){
        return this.attributes.name;
    }

    /**
     * @deprecated use attribute filters to access these
     */
    get type(){
        return this.attributes.type;
    }

}

export class Modifiers extends Array<IModifier>{
    constructor(...args:IModifier[]) {
        super(...args);
        Object.setPrototypeOf(this, Modifiers.prototype);
    }

    static from(modifiers:ArrayLike<IModifier>|Iterable<IModifier>) {
        return new Modifiers(...Array.from(modifiers));
    }

    get groupId() {
        return this.map(mod => mod.groupId).join(",")
    }

    get selectable() {
        return this.some(mod => mod.selectable);
    }

    get nameForDisplay() {
        return this.map(mod => mod.attributes).join(",")
    }

    get types():string[] {
        const types = new Set<string>();
        this.map(mod => mod.attributes.type)
            .filter(t => t !== null && t !== undefined)
            .forEach(t => types.add(t))
        return Array.from(types);
    }

    get value(){
        return evaluate(this.map(mod => mod.value)
            .reduce((acc, value) => plus(acc,value), of(0)));
    }

    filter(predicate: (value: IModifier, index: number, array: IModifier[]) => boolean, thisArg?: any): Modifiers {
        return new Modifiers(...super.filter(predicate, thisArg));
    }

    addTooltipFormulaElements(formula:TooltipFormula) {
        this.forEach(mod => mod.addTooltipFormulaElements(formula));
    }
}