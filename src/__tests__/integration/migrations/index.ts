import type { BatchRegistrar } from "../fixtures";
import { itemMigrationTest } from "./itemMigration.test";
import { modifierToEffectMigrationTest } from "./modifierToEffectMigration.test";
import { bakedMultiplierMigrationTest } from "./bakedMultiplierMigration.test";

export function registerMigrationBatches(register: BatchRegistrar) {
    register("itemMigration", itemMigrationTest);
    register("bakedMultiplierMigration", bakedMultiplierMigrationTest);
    register("modifierToEffectMigration", modifierToEffectMigrationTest);
    console.log("Splittermond | Initialized migration batches");
}
