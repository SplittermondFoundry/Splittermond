import { foundryApi } from "module/api/foundryApi";
import type { FoundryCombat } from "module/api/foundryTypes";

export function setPreCreateCombatHook() {
    foundryApi.hooks.on("preCreateCombat", (combat: FoundryCombat, data: { scene?: string | null }) => {
        // An explicit null keeps a deliberately global encounter unbound.
        if (data.scene !== undefined || combat.scene) return;
        const scene = foundryApi.currentScene;
        if (scene) combat.updateSource({ scene: scene.id });
    });
}
