import { DataModelSchemaType, fieldExtensions, fields } from "../../data/SplittermondDataModel";
import { SplittermondActiveEffectDataModel } from "../../data/SplittermondActiveEffectDataModel";
import type { IModifier, ModifierAttributes } from "module/modifiers";
import { isModifierType } from "module/modifiers";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import { deserialize as deserializeScalar } from "module/modifiers/expressions/scalar/serialization";
import { deserialize as deserializeCostExpression } from "module/modifiers/expressions/cost/serialization";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import type { CostExpression } from "module/modifiers/expressions/cost";
import type { Expression } from "module/modifiers/expressions/scalar";
import {
    abs,
    asString,
    condense,
    isGreaterThan,
    isGreaterZero,
    isLessThan,
    isLessThanZero,
    of,
} from "module/modifiers/expressions/scalar";
import { SplittermondActiveEffect } from "module/activeEffect";
import { UnboundWarner } from "module/activeEffect/dataModel/UnboundWarner";
import { resolveHostActor } from "module/activeEffect/dataModel/hostActor";
import { CostModifier as CostValue } from "module/util/costs/Cost";

type SerializedExpression = Record<string, unknown> & { type: string };
type SerializedCostExpression = Record<string, unknown> & { type: string };
type CostModifierAttributes = { skill?: string; type?: string };

const present = { required: true, nullable: false } as const;

const initalSerializedExpression = {
    type: "amount",
    amount: 0,
} as const;
const initialAttributes = {
    name: "",
    type: "innate",
} as const;
const initialCostAttributes = {} as const;

function validateModifier(attributes: ModifierAttributes): attributes is ModifierAttributes {
    return (
        typeof attributes === "object" &&
        isModifierType(attributes.type) &&
        Array.from(Object.values(attributes))
            .filter((v) => v !== undefined && v !== null)
            .every((v) => typeof v === "string")
    );
}

function validateSerializedExpression(v: SerializedExpression): boolean {
    return typeof v === "object" && "type" in v;
}

function validateCostAttributes(v: CostModifierAttributes): boolean {
    return typeof v === "object";
}

export type ModifierKind = (typeof MODIFIER_KINDS)[number];
const MODIFIER_KINDS = ["additive", "inverse", "multiplicative"] as const;

export function ActionEffectSchema() {
    return {
        modifiers: new fields.ArrayField(
            new fields.SchemaField(
                {
                    path: new fields.StringField({ required: true, nullable: false }),
                    serializedValue: new fieldExtensions.TypedObjectField<SerializedExpression, true, false>({
                        required: true,
                        nullable: false,
                        validate: validateSerializedExpression,
                        initial: initalSerializedExpression,
                    }),
                    modifierKind: new fieldExtensions.StringEnumField({
                        required: true,
                        nullable: false,
                        initial: "additive",
                        validate: (x: ModifierKind) => MODIFIER_KINDS.includes(x),
                    }),
                    selectable: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                    attributes: new fieldExtensions.TypedObjectField<ModifierAttributes, true, false>({
                        required: true,
                        nullable: false,
                        validate: validateModifier,
                        initial: initialAttributes,
                    }),
                },
                present
            ),
            { required: true, nullable: false, initial: [] }
        ),
        costModifiers: new fields.ArrayField(
            new fields.SchemaField(
                {
                    label: new fields.StringField({ required: true, nullable: false }),
                    serializedValue: new fieldExtensions.TypedObjectField<SerializedCostExpression, true, false>({
                        required: true,
                        nullable: false,
                        validate: validateSerializedExpression,
                        initial: { type: "amount", amount: CostValue.zero },
                    }),
                    skill: new fields.StringField({ required: true, nullable: true, initial: null }),
                    attributes: new fieldExtensions.TypedObjectField<CostModifierAttributes, true, false>({
                        required: true,
                        nullable: false,
                        validate: validateCostAttributes,
                        initial: initialCostAttributes,
                    }),
                },
                present
            ),
            { required: true, nullable: false, initial: [] }
        ),
    };
}

export type ActionEffectSchemaType = DataModelSchemaType<typeof ActionEffectSchema>;

export interface ModifierEntry {
    path: string;
    serializedValue: SerializedExpression;
    modifierKind: ModifierKind;
    selectable: boolean;
    attributes: ModifierAttributes;
}

export interface CostModifierEntry {
    label: string;
    serializedValue: SerializedCostExpression;
    skill: string | null;
    attributes: CostModifierAttributes;
}

export interface HasCostModifiers {
    readonly asCostModifiers: ICostModifier[];
}

export interface HasModifiers {
    readonly asModifiers: IModifier[];
}

type ModifierEntryInput = ActionEffectSchemaType["modifiers"];
type CostModifierEntryInput = ActionEffectSchemaType["costModifiers"];

function asModifierEntry(entry: ModifierEntryInput[number]): ModifierEntry {
    return {
        path: entry.path,
        serializedValue: entry.serializedValue,
        modifierKind: entry.modifierKind,
        selectable: entry.selectable,
        attributes: entry.attributes,
    };
}

function asCostModifierEntry(entry: CostModifierEntryInput[number]): CostModifierEntry {
    return {
        label: entry.label,
        serializedValue: entry.serializedValue,
        skill: entry.skill,
        attributes: entry.attributes,
    };
}

export class ActionEffectDataModel
    extends UnboundWarner(SplittermondActiveEffectDataModel<ActionEffectSchemaType, SplittermondActiveEffect>)
    implements HasModifiers, HasCostModifiers
{
    static defineSchema() {
        return { ...super.defineSchema(), ...ActionEffectSchema() };
    }

    get asModifiers(): IModifier[] {
        const provider: ActorProvider = () => resolveHostActor(this.parent);
        const entries = readArray<ModifierEntryInput>(this, "modifiers");
        return entries.map((entry) =>
            buildModifierWrapper(asModifierEntry(entry), provider, this.produceIssueWarning())
        );
    }

    get asCostModifiers(): ICostModifier[] {
        const provider: ActorProvider = () => resolveHostActor(this.parent);
        const entries = readArray<CostModifierEntryInput>(this, "costModifiers");
        return entries.map((entry) =>
            buildCostModifierWrapper(asCostModifierEntry(entry), provider, this.produceIssueWarning())
        );
    }

    protected unboundWarningContext() {
        const entries = readArray<ModifierEntryInput>(this, "modifiers");
        const first = entries.length > 0 ? entries[0] : null;
        const modifierName = first?.attributes?.name ?? first?.path ?? readName(this);
        const propertyPath = first?.path ?? modifierName;
        return { modifierName, propertyPath };
    }
}

function readArray<T extends readonly unknown[]>(model: object, key: string): T {
    const raw = (model as Record<string, unknown>)[key];
    return (Array.isArray(raw) ? raw : []) as unknown as T;
}

function readName(model: object): string {
    const name = (model as Record<string, unknown>).name;
    return typeof name === "string" ? name : "";
}

class AdditiveModifierWrapper implements IModifier {
    readonly value: Expression;
    readonly groupId: string;
    readonly selectable: boolean;
    readonly attributes: ModifierAttributes;

    constructor(groupId: string, value: Expression, attributes: ModifierAttributes, selectable: boolean) {
        this.value = value;
        this.groupId = groupId;
        this.attributes = attributes;
        this.selectable = selectable;
    }

    get isBonus(): boolean {
        return isGreaterZero(this.value) ?? true;
    }

    get isMalus(): boolean {
        return isLessThanZero(this.value) ?? false;
    }

    addTooltipFormulaElements(formula: import("module/util/tooltip").TooltipFormula): void {
        if (this.isBonus) {
            const term = `+${asString(abs(condense(this.value)))}`;
            formula.addBonus(term, this.attributes.name);
        } else {
            const term = `-${asString(abs(condense(this.value)))}`;
            formula.addMalus(term, this.attributes.name);
        }
    }
}

class InverseModifierWrapper implements IModifier {
    readonly value: Expression;
    readonly groupId: string;
    readonly selectable: boolean;
    readonly attributes: ModifierAttributes;

    constructor(groupId: string, value: Expression, attributes: ModifierAttributes, selectable: boolean) {
        this.value = value;
        this.groupId = groupId;
        this.attributes = attributes;
        this.selectable = selectable;
    }

    get isBonus(): boolean {
        return isLessThanZero(this.value) ?? true;
    }

    get isMalus(): boolean {
        return isGreaterZero(this.value) ?? false;
    }

    addTooltipFormulaElements(formula: import("module/util/tooltip").TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        const operator = this.isBonus ? "-" : "+";
        formula.addOperator(operator);
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}

class MultiplicativeModifierWrapper implements IModifier {
    readonly value: Expression;
    readonly groupId: string;
    readonly selectable: boolean;
    readonly attributes: ModifierAttributes;

    constructor(groupId: string, value: Expression, attributes: ModifierAttributes, selectable: boolean) {
        this.value = value;
        this.groupId = groupId;
        this.attributes = attributes;
        this.selectable = selectable;
    }

    get isBonus(): boolean {
        return isGreaterThan(this.value, of(1)) ?? true;
    }

    get isMalus(): boolean {
        return isLessThan(this.value, of(1)) ?? false;
    }

    addTooltipFormulaElements(formula: import("module/util/tooltip").TooltipFormula): void {
        const partClass = this.isBonus ? "bonus" : "malus";
        formula.addOperator("*");
        formula.addPart(asString(abs(condense(this.value))), this.attributes.name, partClass);
    }
}

class CostModifierWrapper implements ICostModifier {
    readonly value: CostExpression;
    readonly label: string;
    readonly skill: string | null;
    readonly attributes: CostModifierAttributes;

    constructor(label: string, value: CostExpression, skill: string | null, attributes: CostModifierAttributes) {
        this.value = value;
        this.label = label;
        this.skill = skill;
        this.attributes = attributes;
    }
}

function buildModifierWrapper(entry: ModifierEntry, provider: ActorProvider, onUnbound: () => void): IModifier {
    const value = deserializeScalar(entry.serializedValue, provider, onUnbound);
    switch (entry.modifierKind) {
        case "additive":
            return new AdditiveModifierWrapper(entry.path, value, entry.attributes, entry.selectable);
        case "inverse":
            return new InverseModifierWrapper(entry.path, value, entry.attributes, entry.selectable);
        case "multiplicative":
            return new MultiplicativeModifierWrapper(entry.path, value, entry.attributes, entry.selectable);
    }
}

function buildCostModifierWrapper(
    entry: CostModifierEntry,
    provider: ActorProvider,
    onUnbound: () => void
): ICostModifier {
    const value = deserializeCostExpression(entry.serializedValue, provider, onUnbound);
    return new CostModifierWrapper(entry.label, value, entry.skill, entry.attributes);
}
