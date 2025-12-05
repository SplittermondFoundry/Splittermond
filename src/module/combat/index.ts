import { setPreCreateItemHook } from "module/combat/initialTickCalculator";
import SplittermondCombat from "module/combat/combat";
import type { FoundryCombatant } from "module/api/foundryTypes";
import { foundryApi } from "module/api/foundryApi";

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

export function setTurnMarker() {
    const namespace = "core";
    const key = "combatTrackerConfig";
    const existing = foundryApi.settings.get<{ turnMarker: { src: string } }>(namespace, key);
    foundryApi.settings.set(namespace, key, {
        ...existing,
        turnMarker: {
            ...existing.turnMarker,
            src: "systems/splittermond/images/Blauer-Mond.png",
        },
    });
}
