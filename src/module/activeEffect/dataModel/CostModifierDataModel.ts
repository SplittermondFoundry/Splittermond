import { DataModelSchemaType, fieldExtensions, fields } from "../../data/SplittermondDataModel";
import { SplittermondActiveEffectDataModel } from "../../data/SplittermondActiveEffectDataModel";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import { type CostExpression } from "module/modifiers/expressions/cost";
import { times as timesCost } from "module/modifiers/expressions/cost";
import { deserialize, serialize } from "module/modifiers/expressions/cost/serialization";
import type { DataModelConstructorInput } from "module/api/DataModel";
import { CostModifier } from "module/util/costs/Cost";
import { resolveHostActor } from "./hostActor";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import { UnboundWarner } from "module/activeEffect/dataModel/UnboundWarner";
import { SplittermondActiveEffect } from "module/activeEffect";
import type { Expression } from "module/modifiers/expressions/scalar";

type SerializedCostExpression = Record<string, unknown> & { type: string };
type CostModifierAttributes = { skill?: string; type?: string };

interface CostModifierContext {
    actorProvider?: ActorProvider;
}

function CostModifierDataModelSchema() {
    return {
        label: new fields.StringField({ required: true, nullable: false }),
        serializedValue: new fieldExtensions.TypedObjectField<SerializedCostExpression, true, false>({
            required: true,
            nullable: false,
            validate: (v: SerializedCostExpression) => typeof v === "object" && "type" in v,
            initial: { type: "amount", amount: CostModifier.zero },
        }),
        /** The skill attached to the item carrying this modifier */
        skill: new fields.StringField({ required: true, nullable: true, initial: null }),
        attributes: new fieldExtensions.TypedObjectField<CostModifierAttributes, true, false>({
            required: true,
            nullable: false,
            initial: {},
            validate: (v: CostModifierAttributes) => typeof v === "object",
        }),
    };
}

export type CostModifierDataModelType = DataModelSchemaType<typeof CostModifierDataModelSchema>;

/**
 * DataModel for spell cost modifiers implementing {@link ICostModifier}.
 * Captures the cost reduction/addition data that the {@link CostModifierHandler} produces.
 */
export class CostModifierDataModel
    extends UnboundWarner(SplittermondActiveEffectDataModel<CostModifierDataModelType, SplittermondActiveEffect>)
    implements ICostModifier
{
    // Method form: ActiveEffectTypeDataModel.defineSchema contributes the `changes` field.
    static defineSchema() {
        return { ...super.defineSchema(), ...CostModifierDataModelSchema() };
    }

    readonly #injectedProvider: ActorProvider | undefined;

    constructor(data: DataModelConstructorInput<CostModifierDataModelType>, context: unknown) {
        super(data, context);
        this.#injectedProvider = (context as CostModifierContext)?.actorProvider;
    }

    get value(): CostExpression {
        const provider = this.#injectedProvider ?? (() => resolveHostActor(this.parent));
        return deserialize(this.serializedValue, provider, this.produceIssueWarning());
    }

    applyMultiplier(multiplier: Expression): CostExpression {
        return timesCost(multiplier, this.value);
    }

    /**
     * Create initialization data for a CostModifierDataModel.
     *
     * @param label The unparsed input formula for spell reductions
     * @param value The cost expression (will be serialized)
     * @param skill The skill attached to the item carrying this modifier
     * @param attributes Optional skill/type attributes for the cost modifier
     */
    static init(
        label: string,
        value: CostExpression,
        skill: string | null = null,
        attributes: { skill?: string; type?: string } = {}
    ): CostModifierDataModelType {
        return {
            label,
            serializedValue: serialize(value),
            skill,
            attributes,
        };
    }

    get attributes(): { skill?: string; type?: string } {
        return this.toObject().attributes;
    }

    protected unboundWarningContext() {
        return { modifierName: this.label, propertyPath: this.label };
    }
}
