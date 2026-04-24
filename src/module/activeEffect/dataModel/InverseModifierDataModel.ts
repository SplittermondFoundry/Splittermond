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

function InverseModifierDataModelSchema() {
    return {
        path: new fields.StringField({ required: true, nullable: false }),
        numericValue: new fields.NumberField({ required: true, nullable: false }),
        selectable: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        attributeName: new fields.StringField({ required: true, nullable: false }),
        attributeType: new fields.StringField({ required: true, nullable: true, initial: null }),
    };
}

export type InverseModifierDataModelType = DataModelSchemaType<typeof InverseModifierDataModelSchema>;

/**
 * DataModel for the {@link InverseModifier}.
 * Inverted logic: a bonus when value < 0, a malus when value > 0.
 */
export class InverseModifierDataModel
    extends SplittermondBaseActiveEffect<InverseModifierDataModelType>
    implements IModifier
{
    static defineSchema = InverseModifierDataModelSchema;

    /**
     * Create initialization data for an InverseModifierDataModel, mirroring the
     * {@link InverseModifier} constructor signature.
     *
     * @param groupId Modifier group identifier
     * @param value The modifier expression (will be evaluated to a number)
     * @param attributes Secondary selection characteristics
     * @param selectable Whether the modifier is selectable as a roll option
     */
    static init(
        groupId: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
    ): InverseModifierDataModelType {
        return {
            path: groupId,
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
        return isLessThanZero(this.value) ?? true;
    }

    get isMalus(): boolean {
        return isGreaterZero(this.value) ?? false;
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
        const partClass = this.isBonus ? "bonus" : "malus";
        const operator = this.isBonus ? "-" : "+";
        formula.addOperator(operator);
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
