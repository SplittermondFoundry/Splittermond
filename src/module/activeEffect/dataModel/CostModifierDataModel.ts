import { DataModelSchemaType, fields, fieldExtensions } from "../../data/SplittermondDataModel";
import { SplittermondBaseActiveEffect } from "../../data/SplittermondBaseActiveEffect";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import { type CostExpression } from "module/modifiers/expressions/cost";
import {
    serialize,
    deserialize,
} from "module/modifiers/expressions/cost/serialization";

type SerializedCostExpression = Record<string, unknown> & { type: string };

function CostModifierDataModelSchema() {
    return {
        label: new fields.StringField({ required: true, nullable: false }),
        serializedValue: new fieldExtensions.TypedObjectField<SerializedCostExpression, true, false>({
            required: true,
            nullable: false,
            validate: (v: SerializedCostExpression) => typeof v === "object" && "type" in v,
        }),
        /** The skill attached to the item carrying this modifier */
        skill: new fields.StringField({ required: true, nullable: true, initial: null }),
        /** Optional skill attribute for the cost modifier */
        attributeSkill: new fields.StringField({ required: true, nullable: true, initial: null }),
        /** Optional type attribute for the cost modifier */
        attributeType: new fields.StringField({ required: true, nullable: true, initial: null }),
    };
}

export type CostModifierDataModelType = DataModelSchemaType<typeof CostModifierDataModelSchema>;

/**
 * DataModel for spell cost modifiers implementing {@link ICostModifier}.
 * Captures the cost reduction/addition data that the {@link CostModifierHandler} produces.
 */
export class CostModifierDataModel
    extends SplittermondBaseActiveEffect<CostModifierDataModelType>
    implements ICostModifier
{
    static defineSchema = CostModifierDataModelSchema;

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
        attributes: { skill?: string; type?: string } = {},
    ): CostModifierDataModelType {
        return {
            label,
            serializedValue: serialize(value),
            skill,
            attributeSkill: attributes.skill ?? null,
            attributeType: attributes.type ?? null,
        };
    }

    get value(): CostExpression {
        return deserialize(this.serializedValue);
    }

    get attributes(): { skill?: string; type?: string } {
        return {
            skill: this.attributeSkill ?? undefined,
            type: this.attributeType ?? undefined,
        };
    }
}
