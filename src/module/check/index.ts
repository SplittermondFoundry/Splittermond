import { ModifierRegistry } from "module/modifiers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { CheckModifierHandler } from "module/check/CheckModifierHandler";

export type { CheckReport } from "./CheckReport";
export function initializeChecks(modifierRegistry: ModifierRegistry<ScalarModifier>) {
    console.log("Splittermond | Initializing check module");
    modifierRegistry.addHandler(CheckModifierHandler.config.topLevelPath, CheckModifierHandler);
}
