import { setPreCreateItemHook } from "module/combat/initialTickCalculator";
import SplittermondCombat from "module/combat/combat";

export function initializeCombat(config: (typeof CONFIG)["Combat"]) {
    console.log("Splittermond | Initializing combat module");
    config.documentClass = SplittermondCombat;

    setPreCreateItemHook();
}
