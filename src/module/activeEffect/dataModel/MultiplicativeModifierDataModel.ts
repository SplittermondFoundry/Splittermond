import { DataModelSchemaType } from "../../data/SplittermondDataModel";
import { SplittermondActiveEffectDataModel } from "../../data/SplittermondActiveEffectDataModel";
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
import { deserialize, serialize } from "module/modifiers/expressions/scalar/serialization";
import type { DataModelConstructorInput } from "module/api/DataModel";
import { modifierSchema } from "./modifierSchema";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import { UnboundWarner } from "module/activeEffect/dataModel/UnboundWarner";
import { SplittermondActiveEffect } from "module/activeEffect";

export type MultiplicativeModifierDataModelType = DataModelSchemaType<typeof modifierSchema>;

/**
 * DataModel for the {@link MultiplicativeModifier}.
 * A bonus when value > 1, a malus when value < 1.
 */
export class MultiplicativeModifierDataModel
    extends UnboundWarner(
        SplittermondActiveEffectDataModel<MultiplicativeModifierDataModelType, SplittermondActiveEffect>
    )
    implements IModifier
{
    static defineSchema() {
        return { ...super.defineSchema(), ...modifierSchema() };
    }

    readonly value: Expression;

    constructor(data: DataModelConstructorInput<MultiplicativeModifierDataModelType>, context: unknown) {
        super(data, context);
        const actorProvider: ActorProvider | undefined = (context as any)?.actorProvider;
        this.value = deserialize(this.serializedValue, actorProvider, this.produceIssueWarning());
    }

    static create(
        groupId: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
        actorProvider?: ActorProvider
    ): MultiplicativeModifierDataModel {
        return new MultiplicativeModifierDataModel(
            MultiplicativeModifierDataModel.init(groupId, value, attributes, selectable),
            { actorProvider }
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

    protected unboundWarningContext() {
        return { modifierName: this.attributes?.name ?? this.path, propertyPath: this.path };
    }

    get groupId(): string {
        return this.path;
    }

    get selectable(): boolean {
        return (this as any).toObject().selectable;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        formula.addOperator("*");
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
