import { DataModelSchemaType, fields, fieldExtensions, SplittermondDataModel } from "../../data/SplittermondDataModel";
import type { FoundryActiveEffect } from "../../api/ActiveEffect";
import type { IModifier, ModifierAttributes, ModifierType } from "module/modifiers";
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

type SerializedExpression = Record<string, unknown> & { type: string };
type ExtraAttributes = Record<string, string | undefined | null>;

function ModifierDataModelSchema() {
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
        extraAttributes: new fieldExtensions.TypedObjectField<ExtraAttributes, true, false>({
            required: true,
            nullable: false,
            initial: {},
            validate: (v: ExtraAttributes) => typeof v === "object",
        }),
    };
}

export type ModifierDataModelType = DataModelSchemaType<typeof ModifierDataModelSchema>;

/**
 * DataModel for the standard additive {@link Modifier}.
 * A bonus when value > 0, a malus when value < 0.
 */
export class ModifierDataModel extends SplittermondDataModel<ModifierDataModelType, FoundryActiveEffect> implements IModifier {
    static defineSchema = ModifierDataModelSchema;

    readonly value: Expression;
    private readonly _explicitOrigin: object | null;

    constructor(data: DataModelConstructorInput<ModifierDataModelType>, context: unknown) {
        super(data, context);
        this.value = deserialize(this.serializedValue);
        this._explicitOrigin = (context as any)?.origin ?? null;
    }

    /**
     * Convenience factory matching the legacy {@link Modifier} constructor signature.
     */
    static create(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        origin: object | null = null,
        selectable = false,
    ): ModifierDataModel {
        return new ModifierDataModel(ModifierDataModel.init(path, value, attributes, selectable), { origin });
    }

    /**
     * Create initialization data for a ModifierDataModel, mirroring the
     * {@link Modifier} constructor signature.
     *
     * @param path Modifier path (used as groupId)
     * @param value The modifier expression (will be serialized)
     * @param attributes Secondary selection characteristics
     * @param selectable Whether the modifier is selectable as a roll option
     */
    static init(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
    ): ModifierDataModelType {
        const { name, type, ...extra } = attributes;
        return {
            path,
            serializedValue: serialize(value),
            attributeName: name,
            attributeType: type,
            extraAttributes: extra as ExtraAttributes,
            selectable,
        };
    }

    get isBonus(): boolean {
        return isGreaterZero(this.value) ?? true;
    }

    get isMalus(): boolean {
        return isLessThanZero(this.value) ?? false;
    }

    get groupId(): string {
        return this.path;
    }

    get selectable(): boolean {
        return (this as any).toObject().selectable;
    }

    get attributes(): ModifierAttributes {
        return {
            ...this.extraAttributes,
            name: this.attributeName,
            type: this.attributeType as ModifierType,
        };
    }

    get origin(): object | null {
        return this._explicitOrigin ?? this.parent?.parent ?? null;
    }

    addTooltipFormulaElements(formula: TooltipFormula): void {
        if (this.isBonus) {
            const term = `+${asString(abs(condense(this.value)))}`;
            formula.addBonus(term, this.attributes.name);
        } else {
            const term = `-${asString(abs(condense(this.value)))}`;
            formula.addMalus(term, this.attributes.name);
        }
    }
}
