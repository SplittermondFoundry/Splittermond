import type { BatchRegistrar } from "../fixtures";
import { itemTest } from "./item.test";
import { itemCompendiumAssignmentTest } from "./itemCompendiumAssignment.test";
import { liveItemModifierFallbackTest } from "./liveItemModifierFallback.test";
import { statusEffectTest } from "./statusEffect.test";

export function registerItemBatches(register: BatchRegistrar) {
    register("main", itemTest);
    register("itemCompendiumAssignment", itemCompendiumAssignmentTest);
    register("liveItemModifierFallback", liveItemModifierFallbackTest);
    register("statusEffect", statusEffectTest);
    console.log("Splittermond | Initialized item batches");
}
