import { DataModelSchemaType, SplittermondDataModel } from "../../data/SplittermondDataModel";
import type { FoundryActiveEffect } from "../../api/ActiveEffect";
import type { IModifier, ModifierAttributes } from "module/modifiers";
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
import type { DataModelConstructorInput } from "module/api/DataModel";
import { modifierSchema } from "./modifierSchema";

export type MultiplicativeModifierDataModelType = DataModelSchemaType<typeof modifierSchema>;

/**
 * DataModel for the {@link MultiplicativeModifier}.
 * A bonus when value > 1, a malus when value < 1.
 */
export class MultiplicativeModifierDataModel
    extends SplittermondDataModel<MultiplicativeModifierDataModelType, FoundryActiveEffect>
    implements IModifier
{
    static defineSchema = modifierSchema;

    readonly value: Expression;
    private readonly _explicitOrigin: object | null;

    constructor(data: DataModelConstructorInput<MultiplicativeModifierDataModelType>, context: unknown) {
        super(data, context);
        this.value = deserialize(this.serializedValue);
        this._explicitOrigin = (context as any)?.origin ?? null;
    }

    /**
     * Convenience factory matching the legacy {@link MultiplicativeModifier} constructor signature.
     */
    static create(
        groupId: string,
        value: Expression,
        attributes: ModifierAttributes,
        origin: object | null = null,
        selectable = false
    ): MultiplicativeModifierDataModel {
        return new MultiplicativeModifierDataModel(
            MultiplicativeModifierDataModel.init(groupId, value, attributes, selectable),
            { origin }
        );
    }

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
        selectable = false
    ): MultiplicativeModifierDataModelType {
        return {
            path: groupId,
            serializedValue: serialize(value),
            attributes,
            selectable,
        };
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

    get origin(): object | null {
        return this._explicitOrigin ?? this.parent?.parent ?? null;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        formula.addOperator("*");
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
