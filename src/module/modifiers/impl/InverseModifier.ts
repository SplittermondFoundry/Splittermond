import { addToRegistry } from "module/data/dataModelRegistry";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import type { IModifier, ModifierAttributes } from "module/modifiers";
import type { Expression } from "module/modifiers/expressions/scalar";
import { abs, asString, condense, isGreaterZero, isLessThanZero } from "module/modifiers/expressions/scalar";
import { serialize } from "module/modifiers/expressions/scalar/serialization";
import type { TooltipFormula } from "module/util/tooltip";

export class InverseModifier implements IModifier {
    static readonly key = "inverse";
    readonly path: string;
    readonly value: Expression;
    readonly groupId: string;
    readonly selectable: boolean;
    readonly attributes: ModifierAttributes;
    readonly isBonus: boolean;
    readonly isMalus: boolean;
    readonly actorProvider?: ActorProvider;

    constructor(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
        actorProvider?: ActorProvider
    ) {
        this.path = path;
        this.value = value;
        this.attributes = attributes;
        this.selectable = selectable;
        this.groupId = path;
        this.actorProvider = actorProvider;
        this.isBonus = isLessThanZero(value) ?? true;
        this.isMalus = isGreaterZero(value) ?? false;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        const operator = this.isBonus ? "-" : "+";
        formula.addOperator(operator);
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }

    static create(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
        actorProvider?: ActorProvider
    ): InverseModifier {
        return new InverseModifier(path, value, attributes, selectable, actorProvider);
    }

    static init(path: string, value: Expression, attributes: ModifierAttributes, selectable = false) {
        return {
            path,
            serializedValue: serialize(value),
            implementation: InverseModifier.key,
            selectable,
            attributes,
        };
    }
}

addToRegistry(InverseModifier.key, InverseModifier);
