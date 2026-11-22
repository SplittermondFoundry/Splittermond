import { foundryApi } from "module/api/foundryApi";
import { settings } from "module/settings";

export const worldTimeSettingKeys = ["hideWorldTime", "pauseWorldTime", "worldTimeFromTicks"] as const;
export type WorldTimeSetting = (typeof worldTimeSettingKeys)[number];

export function registerWorldTimeSettings(onChange: () => void): void {
    for (const key of worldTimeSettingKeys) {
        void settings
            .registerBoolean(key, {
                scope: "world",
                config: false,
                default: key === "worldTimeFromTicks",
                onChange,
            })
            .catch((error: unknown) => console.error("Splittermond | World time setting registration failed", error));
    }
}

export function worldTimeSetting(key: WorldTimeSetting): boolean {
    return foundryApi.settings.get<boolean>("splittermond", key);
}

export function recordsCombatTime(): boolean {
    return !worldTimeSetting("pauseWorldTime") && worldTimeSetting("worldTimeFromTicks");
}

export async function setWorldTimeSetting(key: WorldTimeSetting, value: boolean): Promise<void> {
    if (!foundryApi.currentUser.isGM) throw new Error("Only a GM may configure world time");
    await foundryApi.settings.set("splittermond", key, value);
}
