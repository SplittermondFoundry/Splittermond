import Modifier, { Modifiers } from "./modifier";
import { Expression } from "../modifiers/expressions/scalar";
import { TooltipFormula } from "../util/tooltip";

interface AttributeSelector {
    key: string;
    values: string[];
    allowAbsent?: boolean;
}

export interface ModifierAttributes {
    name: string;
    type: ModifierType;

    [x: string]: string | undefined | null;
}

/**
 * The type of item from which the modifier stems. Use
 * <ul>
 *     <li><code>magic</code> for spells, their effects and temporary enchantments</li>
 *     <li><code>equipment</code> for arms, armor and any personal effects</li>
 *     <li><code>innate</code> for strengths, masteries and other permanent effects</li>
 * </ul>
 */
export type ModifierType = "magic" | "equipment" | "innate" | null;

export interface IModifier {
    readonly value: Expression;

    addTooltipFormulaElements(formula: TooltipFormula): void;

    readonly isBonus: boolean;
    readonly groupId: string;
    readonly selectable: boolean;
    readonly attributes: ModifierAttributes;
    readonly origin: object | null;
}

export default class ModifierManager {
    private _modifier: Map<string, IModifier[]> = new Map();

    add(
        path: string,
        attributes: ModifierAttributes,
        value: Expression,
        origin: object | null = null,
        selectable = false
    ) {
        this.addModifier(new Modifier(path, value, attributes, origin, selectable));
    }

    addModifier(modifier: IModifier) {
        const lowerCaseGroupId = modifier.groupId.toLowerCase();
        if (!this._modifier.get(lowerCaseGroupId)) {
            this._modifier.set(lowerCaseGroupId, []);
        }
        this._modifier.get(lowerCaseGroupId)!.push(modifier);
    }

    getForIds(...groupIds: string[]) {
        return new MassExtractor(groupIds, this);
    }
    getForId(groupId: string) {
        return new AttributeBuilder(groupId, this);
    }

    getModifiers(groupId: string, withAttributes: AttributeSelector[] = [], selectable: boolean | null = null) {
        const modifiersForPath = this._modifier.get(groupId.toLowerCase()) ?? [];
        return modifiersForPath
            .filter((modifier) => selectable === null || modifier.selectable === selectable)
            .filter((mod) => passesAttributeFilter(mod, withAttributes));
    }
}

function passesAttributeFilter(modifier: IModifier, attributes: AttributeSelector[]) {
    for (const attribute of attributes) {
        if (attribute.key in modifier.attributes) {
            const value = modifier.attributes[attribute.key];
            const isPermittedAbsence = !!attribute.allowAbsent && [undefined, null].includes(value as any);
            if (!attribute.values.includes(value as any) && !isPermittedAbsence) {
                return false;
            }
        } else if (!attribute.allowAbsent) {
            return false;
        }
    }
    return true;
}

class AttributeBuilder {
    private _attributes: AttributeSelector[] = [];
    private _selectable: boolean | null = null;

    constructor(
        private readonly groupId: string,
        private manager: ModifierManager
    ) {}

    /**
     * Will only select modifiers that have the attribute key with one of the values
     * @see withAttributeValuesOrAbsent
     */
    withAttributeValues(key: string, ...values: string[]) {
        this._attributes.push({ key, values, allowAbsent: false });
        return this;
    }

    /**
     * Will select modifiers that have the attribute key with one of the values or modifiers
     * that don't have the attribute key at all
     * @see withAttributeValues
     */
    withAttributeValuesOrAbsent(key: string, ...values: string[]) {
        this._attributes.push({ key, values, allowAbsent: true });
        return this;
    }

    selectable() {
        this._selectable = true;
        return this;
    }

    notSelectable() {
        this._selectable = false;
        return this;
    }

    getModifiers() {
        return Modifiers.from(this.manager.getModifiers(this.groupId, this._attributes, this._selectable));
    }
}

class MassExtractor {
    private _selectable: boolean | null = null;
    constructor(
        private readonly groupIds: string[],
        private readonly manager: ModifierManager
    ) {}

    selectable() {
        this._selectable = true;
        return this;
    }

    notSelectable() {
        this._selectable = false;
        return this;
    }

    getModifiers() {
        return Modifiers.from(this.groupIds.flatMap((id) => this.manager.getModifiers(id, [], this._selectable)));
    }
}
