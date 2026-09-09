import type {BatchRegistrar} from "__tests__/integration/fixtures";
import {itemTest} from "__tests__/integration/item/item.test";
import {itemCompendiumAssignmentTest} from "__tests__/integration/item/itemCompendiumAssignment.test";
import {liveItemModifierFallbackTest} from "__tests__/integration/item/liveItemModifierFallback.test";

export function registerItemBatches(register: BatchRegistrar) {
    register("main", itemTest);
    register("itemCompendiumAssignment", itemCompendiumAssignmentTest);
    register("liveItemModifierFallback", liveItemModifierFallbackTest);
    console.log("Splittermond | Initialized item batches");
}
