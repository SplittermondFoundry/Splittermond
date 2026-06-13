import { setGlobalHookRegister } from "module/hooks/globalHookRegister";
import { fieldExtensions } from "module/data/SplittermondDataModel";

export { registerHook } from "./registration";

export function initializeHooks(registry: Parameters<typeof setGlobalHookRegister>[0]) {
    setGlobalHookRegister(registry);
}

type Constructor<T> = new (...args: any[]) => T;
export function documentValidator<T>(target: Constructor<T>): any {
    const field = new fieldExtensions.TypedObjectField({
        required: true,
        nullable: false,
        validate: (x: T) => x instanceof target,
    });
    if ("_validateType" in field) {
        //always true
        field._validateType = () => {};
    }
    return field;
}
