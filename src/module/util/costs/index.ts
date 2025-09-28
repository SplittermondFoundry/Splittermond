import { type CostRegistry } from "module/modifiers";
import { CostModifierHandler } from "module/util/costs/CostModifierHandler";

export function initializeCosts(costModifierRegistry: CostRegistry) {
    console.log("Splittermond | Initializing Cost feature");
    costModifierRegistry.addHandler(CostModifierHandler.config.topLevelPath, CostModifierHandler);
}
