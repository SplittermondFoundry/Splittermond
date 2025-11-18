import { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import { initAddModifier } from "module/modifiers/modifierAddition";
import type { FocusModifier, ScalarModifier } from "module/modifiers/parsing";
import type { TooltipFormula } from "module/util/tooltip";
import type { Expression } from "module/modifiers/expressions/scalar";

export type { ModifierRegistry } from "./ModifierRegistry";
export type ScalarRegistry = ModifierRegistry<ScalarModifier>;
export type CostRegistry = ModifierRegistry<FocusModifier>;
export { ModifierHandler } from "./ModiferHandler";
export { makeConfig, type Config } from "./ModifierConfig";

export function initializeModifiers() {
    console.log("Splittermond | Initializing Modifier feature");
    const modifierRegistry = new ModifierRegistry<ScalarModifier>();
    const costModifierRegistry = new ModifierRegistry<FocusModifier>();
    return {
        modifierRegistry,
        costModifierRegistry,
        addModifier: initAddModifier(modifierRegistry, costModifierRegistry),
    };
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

export interface ModifierAttributes {
    name: string;
    type: ModifierType;

    [x: string]: string | undefined | null;
}

export interface IModifier {
    readonly value: Expression;

    addTooltipFormulaElements(formula: TooltipFormula): void;

    readonly isBonus: boolean;
    readonly groupId: string;
    readonly selectable: boolean;
    readonly attributes: ModifierAttributes;
    readonly origin: object | null;
}
