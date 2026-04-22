import { SplittermondActiveEffect } from "./SplittermondActiveEffect.js";

export { SplittermondActiveEffect };

/**
 * Register the custom ActiveEffect subclass with Foundry.
 * Call this during system init, before any documents are created.
 */
export function initializeActiveEffects() {
    console.log("Splittermond | Initializing Active Effects feature");
    CONFIG.ActiveEffect.documentClass = SplittermondActiveEffect;
}
