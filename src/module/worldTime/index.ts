import { foundryApi } from "module/api/foundryApi";
import { secondsPerTick } from "./time";
import { registerWorldTimeSettings } from "./settings";
import { WorldTimeHud } from "./WorldTimeHud";

export function initializeWorldTime(): void {
    let hud: WorldTimeHud | null = null;
    const refresh = () => {
        void hud?.refresh().catch((error: unknown) => console.error("Splittermond | World time display failed", error));
    };
    registerWorldTimeSettings(refresh);
    foundryApi.configureCombatTime(secondsPerTick());
    foundryApi.hooks.once("ready", () => {
        hud = new WorldTimeHud();
        refresh();
    });
    foundryApi.hooks.on("updateWorldTime", refresh);
    foundryApi.hooks.on("renderPlayers", refresh);
}
