import { DataModelSchemaType, fields } from "../../data/SplittermondDataModel";
import { SplittermondBaseActiveEffect } from "../../data/SplittermondBaseActiveEffect";
import type { IModifier, ModifierAttributes, ModifierType } from "module/modifiers";
import type { TooltipFormula } from "module/util/tooltip";
import {
    abs,
    asString,
    condense,
    type Expression,
    evaluate,
    isGreaterZero,
    isLessThanZero,
    of,
} from "module/modifiers/expressions/scalar";

function ModifierDataModelSchema() {
    return {
        path: new fields.StringField({ required: true, nullable: false }),
        numericValue: new fields.NumberField({ required: true, nullable: false }),
        selectable: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        attributeName: new fields.StringField({ required: true, nullable: false }),
        attributeType: new fields.StringField({ required: true, nullable: true, initial: null }),
    };
}

export type ModifierDataModelType = DataModelSchemaType<typeof ModifierDataModelSchema>;

/**
 * DataModel for the standard additive {@link Modifier}.
 * A bonus when value > 0, a malus when value < 0.
 */
export class ModifierDataModel extends SplittermondBaseActiveEffect<ModifierDataModelType> implements IModifier {
    static defineSchema = ModifierDataModelSchema;

    /**
     * Create initialization data for a ModifierDataModel, mirroring the
     * {@link Modifier} constructor signature.
     *
     * @param path Modifier path (used as groupId)
     * @param value The modifier expression (will be evaluated to a number)
     * @param attributes Secondary selection characteristics
     * @param selectable Whether the modifier is selectable as a roll option
     */
    static init(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
    ): ModifierDataModelType {
        return {
            path,
            numericValue: evaluate(value),
            attributeName: attributes.name,
            attributeType: attributes.type,
            selectable,
        };
    }

    get value(): Expression {
        return of(this.numericValue);
    }

    get isBonus(): boolean {
        return isGreaterZero(this.value) ?? true;
    }

    get isMalus(): boolean {
        return isLessThanZero(this.value) ?? false;
    }

    get groupId(): string {
        return this.path;
    }

    get selectable(): boolean {
        return (this as any).toObject().selectable;
    }

    get attributes(): ModifierAttributes {
        return {
            name: this.attributeName,
            type: this.attributeType as ModifierType,
        };
    }

    get origin(): object | null {
        return this.parent?.parent ?? null;
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
}
