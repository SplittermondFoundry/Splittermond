import { setGlobalHookRegister } from "module/hooks/globalHookRegister";

export { registerHook } from "./registration";

export function initializeHooks(registry: Parameters<typeof setGlobalHookRegister>[0]) {
    setGlobalHookRegister(registry);
}
