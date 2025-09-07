import {CostModifier} from "./Cost";
import {type CostExpression, evaluate} from "../../actor/modifiers/expressions/cost";

interface SpellCostReductionManagement {
    spellCostReduction: SpellCostReductionManager;
    spellEnhancedCostReduction: SpellCostReductionManager;
}

export function initializeSpellCostManagement<T extends Record<string, any>>(data: T): T & SpellCostReductionManagement {
    Object.defineProperty(data, "spellCostReduction", {
        value: new SpellCostReductionManager(),
        writable: true,
        enumerable: true
    });
    Object.defineProperty(data, "spellEnhancedCostReduction", {
        value: new SpellCostReductionManager(),
        writable: true,
        enumerable: true
    });
    return data as T & SpellCostReductionManagement;
}

class SpellCostReductionManager {
    private readonly modifiersMap: SpellCostModifiers;

    constructor() {
        this.modifiersMap = new SpellCostModifiers();
    }

    get modifiers(): SpellCostModifiers {
        return this.modifiersMap;
    }

    /**
     * @param modifierLabel the unparsed input formula for spell reducctions, of the form: foreduction([.]skill|[.]skill[.]type)?
     * @param modifierValue the unparsed splittermond spell cost reduction formula
     * @param skill the skill that is attached to the item that carries the modifier label. Global reductions on skilled items will be assumed to apply to that skill only.
     */
    addCostModifier(modifierLabel: string, modifierValue: CostExpression, skill?: string | null) {
        let group = null;
        let type = null;
        let labelParts = modifierLabel.split(".");

        if (labelParts.length >= 2) {
            group = labelParts[1].trim().toLowerCase();
        }
        if (labelParts.length >= 3) {
            type = labelParts[2].trim().toLowerCase();
        }
        if (labelParts.length >= 4) {
            console.warn("The label " + modifierLabel + " is not a valid cost modifier label. Extraneous parts will be ignored.")
        }
        if (group === null && skill) {
            group = skill;
        }

        this.modifiersMap.put(modifierValue,group, type);
    }

    /**
     * convenience method for adding retrieving a modifier without having to get the map first
     */
    getCostModifiers(skill: string, type: string): CostModifier[] {
        return this.modifiersMap.get(skill, type).map(mod => evaluate(mod));
    }
}

type Key = { spellType: string | null, skill: string | null };

const nullKey = Symbol("nullKey");
class SpellCostModifiers {
    private backingMap: Map<Key|null, CostExpression[]>;
    private keyMap: Map<string|null, Record<string|symbol, Key>>;

    constructor() {
        this.backingMap = new Map();
        this.keyMap = new Map();
    }

    /**
     * @param type the type of spell this cost modifier is for
     * @param group the skill this spell selector for this cost modifier
     */
    get(group: string | null = null, type: string | null = null) {
        const formattedGroup = group ? group.toLowerCase().trim() : null;
        const formattedType = type ? type.toLowerCase().trim() : null;

        const groupAndTypeSpecificReductions = this.#internalGet(formattedGroup, formattedType)
        const groupSpecificReductions = formattedGroup ? this.#internalGet(null, formattedType) : [];
        const typeSpecificReductions = formattedType ? this.#internalGet(formattedGroup, null) : [];
        const globalReductions = formattedType && formattedGroup ? this.#internalGet(null, null) : [];
        return [
            ...groupAndTypeSpecificReductions,
            ...groupSpecificReductions,
            ...typeSpecificReductions,
            ...globalReductions
        ];
    }

    #internalGet(group: string|null, type: string|null): CostExpression[] {
        return this.backingMap.get(this.#getMapKey(group, type)) ?? [];
    }

    /**
     * @param cost
     * @param type the type of spell this cost modifier is for
     * @param group the skill selector for this cost modifier
     */
    put(cost: CostExpression, group: string | null = null, type: string | null = null) {
        const mapKey = this.#getMapKey(group, type);
        if (this.backingMap.get(mapKey) === undefined) {
            this.backingMap.set(mapKey, []);
        }
        this.backingMap.get(mapKey)!.push(cost); //will never be undefined
    }

    /**
     * JS compares objects by reference. This function ensures that the same object is used for the same key.
     */
    #getMapKey(group: string | null, type: string | null): Key {
        const typeKey = type ?? nullKey;
        if (this.keyMap.get(group) === undefined) {
            this.keyMap.set(group, {});
        }
        if (this.keyMap.get(group)![typeKey] === undefined) {
            const groupRecord= this.keyMap.get(group)!; //will never be undefined
            groupRecord[typeKey] = {spellType: type, skill: group};
        }
        return this.keyMap.get(group)![typeKey]; //will never be undefined
    }
}
export type {SpellCostReductionManager}