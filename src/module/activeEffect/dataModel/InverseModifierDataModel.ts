import { DataModelSchemaType } from "../../data/SplittermondDataModel";
import type { FoundryActiveEffect } from "../../api/ActiveEffect";
import { SplittermondActiveEffectDataModel } from "../../data/SplittermondActiveEffectDataModel";
import type { IModifier, ModifierAttributes } from "module/modifiers";
import type { TooltipFormula } from "module/util/tooltip";
import {
    abs,
    asString,
    condense,
    type Expression,
    isGreaterZero,
    isLessThanZero,
} from "module/modifiers/expressions/scalar";
import { serialize, deserialize } from "module/modifiers/expressions/scalar/serialization";
import type { DataModelConstructorInput } from "module/api/DataModel";
import { modifierSchema } from "./modifierSchema";
import type { EffectType } from "./effectTypes";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";

export type InverseModifierDataModelType = DataModelSchemaType<typeof modifierSchema>;

/**
 * DataModel for the {@link InverseModifier}.
 * Inverted logic: a bonus when value < 0, a malus when value > 0.
 */
export class InverseModifierDataModel
    extends SplittermondActiveEffectDataModel<InverseModifierDataModelType, FoundryActiveEffect>
    implements IModifier
{
    static defineSchema() {
        return { ...super.defineSchema(), ...modifierSchema() };
    }

    readonly value: Expression;
    private readonly _explicitOrigin: object | null;

    constructor(data: DataModelConstructorInput<InverseModifierDataModelType>, context: unknown) {
        super(data, context);
        const actorProvider: ActorProvider | undefined = (context as any)?.actorProvider;
        this.value = deserialize(this.serializedValue, actorProvider);
        this._explicitOrigin = (context as any)?.origin ?? null;
    }

    static create(
        groupId: string,
        value: Expression,
        attributes: ModifierAttributes,
        origin: object | null = null,
        selectable = false,
        actorProvider?: ActorProvider,
    ): InverseModifierDataModel {
        return new InverseModifierDataModel(InverseModifierDataModel.init(groupId, value, attributes, selectable), { origin, actorProvider });
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

    get groupId(): string {
        return this.path;
    }

    readonly effectType: EffectType = "inverseModifier";

    get selectable(): boolean {
        return (this as any).toObject().selectable;
    }

    get origin(): object | null {
        return this._explicitOrigin ?? this.parent?.parent ?? null;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        const operator = this.isBonus ? "-" : "+";
        formula.addOperator(operator);
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}
