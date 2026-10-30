import type { BatchRegistrar } from "../fixtures";
import { healthFocusTest } from "./healthFocus.test";
import { healthBonusTest } from "./healthBonus.test";
import { modifierTest } from "./modifier.test";
import { activeEffectMultiplierTest } from "./activeEffectMultiplier.test";
import { actorTest } from "./actor.test";
import { tickMalusTest } from "./tickMalus.test";

export function registerActorBatches(register: BatchRegistrar) {
    register("main", actorTest);
    register("healthFocus", healthFocusTest);
    register("healthBonus", healthBonusTest);
    register("modifier", modifierTest);
    register("activeEffectMultiplier", activeEffectMultiplierTest);
    register("tickMalus", tickMalusTest);
    console.log("Splittermond | Initialized actor batches");
}
