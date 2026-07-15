import { addToRegistry } from "module/data/dataModelRegistry";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import type { IModifier, ModifierAttributes } from "module/modifiers";
import type { Expression } from "module/modifiers/expressions/scalar";
import { abs, asString, condense, isGreaterThan, isLessThan, of } from "module/modifiers/expressions/scalar";
import { serialize } from "module/modifiers/expressions/scalar/serialization";
import type { TooltipFormula } from "module/util/tooltip";

export class MultiplicativeModifier implements IModifier {
    static readonly key = "multiplicative";
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
        this.isBonus = isGreaterThan(value, of(1)) ?? true;
        this.isMalus = isLessThan(value, of(1)) ?? false;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        formula.addOperator("*");
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }

    static create(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
        actorProvider?: ActorProvider
    ): MultiplicativeModifier {
        return new MultiplicativeModifier(path, value, attributes, selectable, actorProvider);
    }

    static init(path: string, value: Expression, attributes: ModifierAttributes, selectable = false) {
        return {
            path,
            serializedValue: serialize(value),
            implementation: MultiplicativeModifier.key,
            selectable,
            attributes,
        };
    }
}

addToRegistry(MultiplicativeModifier.key, MultiplicativeModifier);
