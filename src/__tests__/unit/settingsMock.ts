import { settings } from "../../module/settings";

type SettingMock<M extends SettingMethod> = M & { callOriginal: M; returnsSetting: (value: SettingType<M>) => void };
type WhateverThatIsItMakesTSHappy<METHOD extends SettingMethod> = () => Promise<
    Awaited<{
        get: () => SettingType<METHOD>;
        set: () => void;
    }>
>;
function SettingsMock<METHOD extends SettingMethod>(
    registration: METHOD,
    setting: SettingType<METHOD>
): WhateverThatIsItMakesTSHappy<METHOD> {
    const settingRef = { value: setting };
    const original = registration;

    const mockFunction = function () {
        return Promise.resolve(accessors(settingRef));
    };
    mockFunction.callOriginal = original;

    mockFunction.returnsSetting = function (value: SettingType<METHOD>) {
        settingRef.value = value;
    };

    return mockFunction;
}

function accessors<T>(returnValueRef: { value: T }) {
    return {
        get: () => returnValueRef.value,
        set: () => {},
    };
}

settings.registerBoolean = SettingsMock(settings.registerBoolean, false);
settings.registerNumber = SettingsMock(settings.registerNumber, 0);
settings.registerString = SettingsMock(settings.registerString, "");

type SettingMethod = typeof settings.registerBoolean | typeof settings.registerNumber | typeof settings.registerString;

type SettingType<T extends SettingMethod> = T extends typeof settings.registerBoolean
    ? boolean
    : T extends typeof settings.registerNumber
      ? number
      : T extends typeof settings.registerString
        ? string
        : never;

export function asMock<M extends SettingMethod>(setting: M | SettingMock<M>): SettingMock<M> {
    if (isSettingMock(setting)) {
        return setting as SettingMock<M>;
    } else {
        throw new Error("The setting registration function is not a mock");
    }
}

function isSettingMock<M extends SettingMethod>(setting: M | SettingMock<M>): setting is SettingMock<M> {
    return setting.hasOwnProperty("returnsSetting") && setting.hasOwnProperty("callOriginal");
}
