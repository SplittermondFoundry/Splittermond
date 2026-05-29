import {DataModelSchemaType} from "../../data/SplittermondDataModel";
import {SplittermondActiveEffectDataModel} from "../../data/SplittermondActiveEffectDataModel";
import type {IModifier, ModifierAttributes} from "module/modifiers";
import type {TooltipFormula} from "module/util/tooltip";
import {
    abs,
    asString,
    condense,
    type Expression,
    isGreaterZero,
    isLessThanZero,
} from "module/modifiers/expressions/scalar";
import {deserialize, serialize} from "module/modifiers/expressions/scalar/serialization";
import type {DataModelConstructorInput} from "module/api/DataModel";
import {modifierSchema} from "./modifierSchema";
import type {EffectType} from "./effectTypes";
import type {ActorProvider} from "module/modifiers/expressions/ActorProvider";
import {SplittermondActiveEffect} from "module/activeEffect";
import {UnboundWarner} from "module/activeEffect/dataModel/UnboundWarner";


export type InverseModifierDataModelType = DataModelSchemaType<typeof modifierSchema>;

/**
 * DataModel for the {@link InverseModifier}.
 * Inverted logic: a bonus when value < 0, a malus when value > 0.
 */
export class InverseModifierDataModel
    extends UnboundWarner(SplittermondActiveEffectDataModel<InverseModifierDataModelType, SplittermondActiveEffect>)
    implements IModifier
{
    static defineSchema() {
        return { ...super.defineSchema(), ...modifierSchema() };
    }

    readonly value: Expression;

    constructor(data: DataModelConstructorInput<InverseModifierDataModelType>, context: unknown) {
        super(data, context);
        const actorProvider: ActorProvider | undefined = (context as any)?.actorProvider;
        this.value = deserialize(this.serializedValue, actorProvider, this.produceIssueWarning() );
    }

    static create(
        groupId: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
        actorProvider?: ActorProvider,
    ): InverseModifierDataModel {
        return new InverseModifierDataModel(InverseModifierDataModel.init(groupId, value, attributes, selectable), { actorProvider });
    }

    /**
     * Create initialization data for an InverseModifierDataModel.
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
    ): InverseModifierDataModelType {
        return {
            path: groupId,
            serializedValue: serialize(value),
            attributes,
            selectable,
        };
    }

    get isBonus(): boolean {
        return isLessThanZero(this.value) ?? true;
    }

    get isMalus(): boolean {
        return isGreaterZero(this.value) ?? false;
    }

    protected unboundWarningContext() {
        return { modifierName: this.attributes?.name ?? this.path, propertyPath: this.path };
    }

    get groupId(): string {
        return this.path;
    }

    readonly effectType: EffectType = "inverseModifier";

    get selectable(): boolean {
        return (this as any).toObject().selectable;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        const operator = this.isBonus ? "-" : "+";
        formula.addOperator(operator);
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
