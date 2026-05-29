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
import {resolveHostActor} from "./hostActor";
import type {ActorProvider} from "module/modifiers/expressions/ActorProvider";
import {SplittermondActiveEffect} from "module/activeEffect";

export type ModifierDataModelType = DataModelSchemaType<typeof modifierSchema>;

/**
 * DataModel for the standard additive {@link Modifier}.
 * A bonus when value > 0, a malus when value < 0.
 */
export class ModifierDataModel extends SplittermondActiveEffectDataModel<ModifierDataModelType, FoundryActiveEffect> implements IModifier {
    static defineSchema() {
        return { ...super.defineSchema(), ...modifierSchema() };
    }

    readonly value: Expression;
    private readonly _explicitOrigin: object | null;
    private _unboundWarningIssued = false;

    constructor(data: DataModelConstructorInput<ModifierDataModelType>, context: unknown) {
        super(data, context);
        const ctx = context as any;
        const provider: ActorProvider = ctx?.actorProvider ?? (() => resolveHostActor(this.parent));
        this.value = deserialize(
            this.serializedValue,
            provider,
            () => {
                if (!this._unboundWarningIssued) {
                    this._unboundWarningIssued = true;
                    const isOwnerOrGm = (this.parent as any)?.isOwner || foundryApi.currentUser?.isGM;
                    if (isOwnerOrGm) {
                        foundryApi.warnUser("splittermond.modifiers.parseMessages.unboundReference", {
                            modifierName: this.attributes?.name ?? this.path,
                            propertyPath: this.path,
                        });
                    }
                }
            }
        );
        this._explicitOrigin = ctx?.origin ?? null;
    }

    /**
     * Convenience factory matching the legacy {@link Modifier} constructor signature.
     */
    static create(
        path: string,
        value: Expression,
        attributes: ModifierAttributes,
        selectable = false,
        actorProvider?: ActorProvider,
    ): ModifierDataModel {
        return new ModifierDataModel(ModifierDataModel.init(path, value, attributes, selectable), { actorProvider });
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
        return {
            path,
            serializedValue: serialize(value),
            attributes,
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

    readonly effectType: EffectType = "modifier";

    get selectable(): boolean {
        return (this as any).toObject().selectable;
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
