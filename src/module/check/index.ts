import { ModifierRegistry } from "module/modifiers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { CheckModifierHandler } from "module/check/CheckModifierHandler";
import { CheckRequireModifierHandler } from "module/check/CheckRequireModifierHandler";

export type { CheckReport } from "./CheckReport";
export type { CheckType } from "./CheckModifierHandler";
export * from "./types";
export * from "./checkClassification";

export function initializeChecks(modifierRegistry: ModifierRegistry<ScalarModifier>) {
    console.log("Splittermond | Initializing check module");
    modifierRegistry.addHandler(CheckModifierHandler.config.topLevelPath, CheckModifierHandler);
    modifierRegistry.addHandler(CheckRequireModifierHandler.config.topLevelPath, CheckRequireModifierHandler);
}
