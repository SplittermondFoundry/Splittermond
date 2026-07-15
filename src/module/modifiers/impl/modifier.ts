import { addToRegistry } from "module/data/dataModelRegistry";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import type { IModifier, ModifierAttributes } from "module/modifiers";
import type { Expression } from "module/modifiers/expressions/scalar";
import { abs, asString, condense, isGreaterZero, isLessThanZero } from "module/modifiers/expressions/scalar";
import { serialize } from "module/modifiers/expressions/scalar/serialization";
import type { TooltipFormula } from "module/util/tooltip";

export class Modifier implements IModifier {
    static readonly key = "additive";
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
        this.isBonus = isGreaterZero(value) ?? true;
        this.isMalus = isLessThanZero(value) ?? false;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        if (this.isBonus) {
            const term = `+${asString(abs(condense(this.value)))}`;
            formula.addBonus(term, this.attributes.name);
        } else {
            const term = `-${asString(abs(condense(this.value)))}`;
            formula.addMalus(term, this.attributes.name);
        }
    }

    static create(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
        actorProvider?: ActorProvider
    ): Modifier {
        return new Modifier(path, value, attributes, selectable, actorProvider);
    }

    static init(path: string, value: Expression, attributes: ModifierAttributes, selectable = false) {
        return {
            path,
            serializedValue: serialize(value),
            implementation: Modifier.key,
            selectable,
            attributes,
        };
    }
}

addToRegistry(Modifier.key, Modifier);
