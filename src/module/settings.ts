import { foundryApi } from "./api/foundryApi";
import type { SettingsConfig, SettingTypeMapper, SettingTypes } from "./api/foundryTypes";
import { splittermond } from "./config";

let gameInitialized = false;
const settingsQueue: { position: number | null; action: Function }[] = [];

type PartialSettings<T extends SettingTypes> = Omit<SettingsConfig<T>, "type" | "name" | "hint"> & {
    position?: number;
};
type SettingAccessor<T extends SettingTypes> = {
    get(): SettingTypeMapper<T>;
    set(value: SettingTypeMapper<T>): void;
};

/**
 * Register a new setting
 */
async function registerSetting<T extends SettingTypes>(
    key: string,
    setting: PartialSettings<T> & {
        type: T;
    }
): Promise<SettingAccessor<T>> {
    const action = () => {
        const nameKey = `splittermond.settings.${key}.name`;
        const hintKey = `splittermond.settings.${key}.hint`;
        foundryApi.settings.register<T>("splittermond", key, { name: nameKey, hint: hintKey, ...setting });
    };
    const accessors = {
        get() {
            return foundryApi.settings.get("splittermond", key);
        },
        set(value: SettingTypeMapper<T>) {
            return foundryApi.settings.set("splittermond", key, value);
        },
    };
    if (!gameInitialized) {
        console.debug(`Splittermond | Game not initialized, adding ${key} to queue`);
        addToRegisterQueue(action, setting.position ?? null);
        return delayAccessors(() => accessors);
    }
    return delayAccessors(() => {
        action();
        return accessors;
    });
}

function addToRegisterQueue(action: Function, position: number | null) {
    if (position === null) {
        settingsQueue.push({ position, action });
    } else {
        const insertAt = settingsQueue.findIndex(({ position: p }) => p === null || p > position);
        settingsQueue.splice(insertAt < 0 ? settingsQueue.length : insertAt, 0, { position, action });
    }
}

function delayAccessors(action: () => any): Promise<any> {
    return new Promise((resolve, reject) => {
        const checkInitialized = (invocation: number) => {
            if (invocation > getMaxCount()) {
                return reject(`Game not initialized after ${getMaxCount() * getDelay() * 0.001} seconds`);
            } else if (gameInitialized) {
                return resolve(action());
            } else {
                return setTimeout(() => checkInitialized(++invocation), getDelay());
            }
        };
        checkInitialized(0);
    });
}

function getDelay() {
    return splittermond.settings.gameReadyWaitingDelayInMs;
}

function getMaxCount() {
    return splittermond.settings.gameReadyWaitingMaxCount;
}

async function registerStringSetting(
    key: string,
    setting: PartialSettings<StringConstructor>
): Promise<SettingAccessor<StringConstructor>> {
    return registerSetting(key, { ...setting, type: String, range: undefined });
}

async function registerNumberSetting(
    key: string,
    setting: PartialSettings<NumberConstructor>
): Promise<SettingAccessor<NumberConstructor>> {
    return registerSetting(key, { ...setting, type: Number });
}

async function registerBooleanSetting(
    key: string,
    setting: Omit<PartialSettings<BooleanConstructor>, "range">
): Promise<SettingAccessor<BooleanConstructor>> {
    return registerSetting(key, { ...setting, type: Boolean, range: undefined });
}

export const settings = {
    registerString: registerStringSetting,
    registerNumber: registerNumberSetting,
    registerBoolean: registerBooleanSetting,
};

export const registerRequestedSystemSettings = function (): void {
    console.log("Splittermond | Registering requested system settings");
    settingsQueue.forEach(({ action }) => action());
    settingsQueue.splice(0, settingsQueue.length); //delete all elements
    gameInitialized = true;
};

/**
 * Reset the gameInitialized flag
 * DON'T USE THIS IN PRODUCTION
 * This is only for testing purposes, because there is no way of importing this module repeatedly
 */
export function resetIsInitialized() {
    if (false) {
        console.error("");
    }
    gameInitialized = false;
}
