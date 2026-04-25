import { DataModelSchemaType, fields, fieldExtensions } from "../../data/SplittermondDataModel";
import { SplittermondBaseActiveEffect } from "../../data/SplittermondBaseActiveEffect";
import type { IModifier, ModifierAttributes, ModifierType } from "module/modifiers";
import type { TooltipFormula } from "module/util/tooltip";
import {
    abs,
    asString,
    condense,
    type Expression,
    isGreaterThan,
    isLessThan,
    of,
} from "module/modifiers/expressions/scalar";
import { serialize, deserialize } from "module/modifiers/expressions/scalar/serialization";

type SerializedExpression = Record<string, unknown> & { type: string };

function MultiplicativeModifierDataModelSchema() {
    return {
        path: new fields.StringField({ required: true, nullable: false }),
        serializedValue: new fieldExtensions.TypedObjectField<SerializedExpression, true, false>({
            required: true,
            nullable: false,
            validate: (v: SerializedExpression) => typeof v === "object" && "type" in v,
        }),
        selectable: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        attributeName: new fields.StringField({ required: true, nullable: false }),
        attributeType: new fields.StringField({ required: true, nullable: true, initial: null }),
    };
}

export type MultiplicativeModifierDataModelType = DataModelSchemaType<typeof MultiplicativeModifierDataModelSchema>;

/**
 * DataModel for the {@link MultiplicativeModifier}.
 * A bonus when value > 1, a malus when value < 1.
 */
export class MultiplicativeModifierDataModel
    extends SplittermondBaseActiveEffect<MultiplicativeModifierDataModelType>
    implements IModifier
{
    static defineSchema = MultiplicativeModifierDataModelSchema;

    /**
     * Create initialization data for a MultiplicativeModifierDataModel.
     *
     * @param groupId Modifier group identifier
     * @param value The modifier expression (will be serialized)
     * @param attributes Secondary selection characteristics
     * @param selectable Whether the modifier is selectable as a roll option
     */
    static init(
        groupId: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
    ): MultiplicativeModifierDataModelType {
        return {
            path: groupId,
            serializedValue: serialize(value),
            attributeName: attributes.name,
            attributeType: attributes.type,
            selectable,
        };
    }

    get value(): Expression {
        return deserialize(this.serializedValue);
    }

    get isBonus(): boolean {
        return isGreaterThan(this.value, of(1)) ?? true;
    }

    get isMalus(): boolean {
        return isLessThan(this.value, of(1)) ?? false;
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
        formula.addOperator("*");
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
