import { DataModelSchemaType, fields, fieldExtensions } from "../../data/SplittermondDataModel";
import { SplittermondActiveEffectDataModel } from "../../data/SplittermondActiveEffectDataModel";
import type { FoundryActiveEffect } from "../../api/ActiveEffect";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import { type CostExpression } from "module/modifiers/expressions/cost";
import { serialize, deserialize } from "module/modifiers/expressions/cost/serialization";
import type { DataModelConstructorInput } from "module/api/DataModel";
import type { EffectType } from "./effectTypes";
import {CostModifier} from "module/util/costs/Cost";

type SerializedCostExpression = Record<string, unknown> & { type: string };
type CostModifierAttributes = { skill?: string; type?: string };

function CostModifierDataModelSchema() {
    return {
        label: new fields.StringField({ required: true, nullable: false }),
        serializedValue: new fieldExtensions.TypedObjectField<SerializedCostExpression, true, false>({
            required: true,
            nullable: false,
            validate: (v: SerializedCostExpression) => typeof v === "object" && "type" in v,
            initial: {type: "amount", amount: CostModifier.zero }
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
    extends SplittermondActiveEffectDataModel<CostModifierDataModelType, FoundryActiveEffect>
    implements ICostModifier
{
    static defineSchema() {
        return { ...super.defineSchema(), ...CostModifierDataModelSchema() };
    }

    readonly value: CostExpression;
    readonly effectType: EffectType = "costModifier";

    constructor(data: DataModelConstructorInput<CostModifierDataModelType>, context: unknown) {
        super(data, context);
        this.value = deserialize(this.serializedValue);
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
        return (this as any).toObject().attributes;
    }
}
