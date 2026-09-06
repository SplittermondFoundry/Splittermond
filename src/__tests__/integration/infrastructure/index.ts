import type { BatchRegistrar } from "../fixtures";
import { hooksTest } from "./hooks.test";
import { settingsTest } from "./settings.test";

export function registerInfrastructureBatches(register: BatchRegistrar) {
    register("hooks", hooksTest);
    register("settings", settingsTest);
    console.log("Splittermond | Initialized infrastructure batches");
}
