import { TooltipFormula } from "module/util/tooltip";
import {
    abs,
    asString,
    condense,
    Expression,
    isGreaterZero,
    isLessThanZero,
} from "module/modifiers/expressions/scalar";
import type { IModifier, ModifierAttributes } from "module/modifiers";

export class InverseModifier implements IModifier {
    readonly attributes: ModifierAttributes;
    readonly groupId: string;
    readonly origin: object | null;
    readonly selectable: boolean;
    readonly value: Expression;
    private _isBonus: boolean;
    private _isMalus: boolean;

    constructor(
        groupId: string,
        value: Expression,
        attributes: ModifierAttributes,
        origin: object | null = null,
        selectable = false
    ) {
        this.value = value;
        this.attributes = attributes;
        this.origin = origin;
        this.selectable = selectable;
        this.groupId = groupId;
        this._isBonus = isLessThanZero(value) ?? true; //Assume a bonus if result is unknown
        this._isMalus = isGreaterZero(value) ?? false;
    }

    get isMalus() {
        return this._isMalus;
    }

    get isBonus() {
        return this._isBonus;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        const operator = this.isBonus ? "-" : "+";
        //formula default to a + operator for bonuses, so we have to use the low level API to get a decent display
        formula.addOperator(operator);
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
