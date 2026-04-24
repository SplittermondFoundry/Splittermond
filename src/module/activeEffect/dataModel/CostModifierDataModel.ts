import { DataModelSchemaType, fields } from "../../data/SplittermondDataModel";
import { SplittermondBaseActiveEffect } from "../../data/SplittermondBaseActiveEffect";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import { type CostExpression, of, evaluate as evaluateCost } from "module/modifiers/expressions/cost";
import { CostModifier } from "module/util/costs/Cost";

function CostModifierDataModelSchema() {
    return {
        label: new fields.StringField({ required: true, nullable: false }),
        /** The non-consumed portion of the cost reduction */
        nonConsumed: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        /** The consumed portion of the cost reduction */
        consumed: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        /** Whether the cost is channeled */
        channeled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
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
     * Create initialization data for a CostModifierDataModel, mirroring the
     * shape produced by {@link CostModifierHandler.buildModifier}.
     *
     * @param label The unparsed input formula for spell reductions
     * @param value The cost expression (will be evaluated to extract cost components)
     * @param skill The skill attached to the item carrying this modifier
     * @param attributes Optional skill/type attributes for the cost modifier
     */
    static init(
        label: string,
        value: CostExpression,
        skill: string | null = null,
        attributes: { skill?: string; type?: string } = {},
    ): CostModifierDataModelType {
        const evaluated = evaluateCost(value);
        const obj = evaluated.toObject();
        return {
            label,
            nonConsumed: obj._exhausted + obj._channeled,
            consumed: obj._consumed + obj._channeledConsumed,
            channeled: obj._channeled !== 0 || obj._channeledConsumed !== 0,
            skill,
            attributeSkill: attributes.skill ?? null,
            attributeType: attributes.type ?? null,
        };
    }

    get value(): CostExpression {
        return of(new CostModifier({
            _channeled: this.channeled ? this.nonConsumed : 0,
            _channeledConsumed: this.channeled ? this.consumed : 0,
            _exhausted: this.channeled ? 0 : this.nonConsumed,
            _consumed: this.channeled ? 0 : this.consumed,
        }));
    }

    get attributes(): { skill?: string; type?: string } {
        return {
            skill: this.attributeSkill ?? undefined,
            type: this.attributeType ?? undefined,
        };
    }
}
