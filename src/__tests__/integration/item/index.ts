import type { BatchRegistrar } from "../fixtures";
import { itemTest } from "./item.test";
import { itemCompendiumAssignmentTest } from "./itemCompendiumAssignment.test";
import { liveItemModifierFallbackTest } from "./liveItemModifierFallback.test";
import { statusEffectWarningsTest } from "./statusEffectWarnings.test";

export function registerItemBatches(register: BatchRegistrar) {
    register("main", itemTest);
    register("itemCompendiumAssignment", itemCompendiumAssignmentTest);
    register("liveItemModifierFallback", liveItemModifierFallbackTest);
    register("statusEffectWarnings", statusEffectWarningsTest);
    console.log("Splittermond | Initialized item batches");
}
