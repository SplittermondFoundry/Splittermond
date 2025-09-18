import { TooltipFormula } from "../util/tooltip";
import { abs, asString, condense, Expression, isGreaterThan, isLessThan, of } from "../modifiers/expressions/scalar";
import type { IModifier, ModifierAttributes } from "./modifier-manager";

export class MultiplicativeModifier implements IModifier {
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
        this._isBonus = isGreaterThan(value, of(1)) ?? true; //Assume a bonus if result is unknown
        this._isMalus = isLessThan(value, of(1)) ?? false;
    }

    get isMalus() {
        return this._isMalus;
    }

    get isBonus() {
        return this._isBonus;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        formula.addOperator("*");
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
