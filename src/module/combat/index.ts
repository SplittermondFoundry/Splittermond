import { setPreCreateItemHook } from "module/combat/initialTickCalculator";
import SplittermondCombat from "module/combat/combat";
import type { FoundryCombatant } from "module/api/foundryTypes";

export enum CombatPauseType {
    wait = 10000,
    keepReady = 20000,
}

export function combatantIsPaused(combatant: FoundryCombatant): boolean {
    return !!combatant.initiative && combatant.initiative >= CombatPauseType.wait;
}

export function initializeCombat(config: (typeof CONFIG)["Combat"]) {
    console.log("Splittermond | Initializing combat module");
    config.documentClass = SplittermondCombat;

    setPreCreateItemHook();
}
