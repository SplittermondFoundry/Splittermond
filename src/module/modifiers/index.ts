import { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import { initAddModifier } from "module/modifiers/modifierAddition";
import type { FocusModifier, ScalarModifier } from "module/modifiers/parsing";

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
