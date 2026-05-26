import { fields, fieldExtensions } from "../../data/SplittermondDataModel";
import { isModifierType, type ModifierAttributes } from "module/modifiers";

type SerializedExpression = Record<string, unknown> & { type: string };

const initalSerializedExpression = {
    type: "amount",
    amount: 0
} as const
const initialAttributes = {
    name: "",
    type: "innate"
} as const

/**
 * Shared schema for all IModifier DataModels (Modifier, InverseModifier, MultiplicativeModifier).
 * Each call returns fresh field instances as required by Foundry's DataModel system.
 */
export function modifierSchema() {
    return {
        path: new fields.StringField({ required: true, nullable: false }),
        serializedValue: new fieldExtensions.TypedObjectField<SerializedExpression, true, false>({
            required: true,
            nullable: false,
            validate: (v: SerializedExpression) => typeof v === "object" && "type" in v,
            initial: initalSerializedExpression
        }),
        selectable: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        attributes: new fieldExtensions.TypedObjectField<ModifierAttributes, true, false>({
            required: true,
            nullable: false,
            validate: validateModifier,
            initial: initialAttributes
        }),
    };
}

function validateModifier(attributes: ModifierAttributes): attributes is ModifierAttributes {
    return (
        typeof attributes === "object" &&
        isModifierType(attributes.type) &&
        Array.from(Object.values(attributes))
            .filter(v => v !== undefined && v !== null)
            .every((v) => typeof v === "string")
    );
}
