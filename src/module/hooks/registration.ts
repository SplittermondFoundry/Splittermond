import { type DataField, type InstancedType } from "module/data/SplittermondDataModel";
import { foundryApi } from "module/api/foundryApi";
import { addToRegistry } from "module/hooks/globalHookRegister";
import type { DataModelValidationFailure } from "module/api/foundryTypes";

type ValidatedHook<P1, P2, P3> = {
    call(...params: ParamList<P1, P2, P3>): ReturnType<typeof foundryApi.hooks.call>;
    subscribe(listener: (...params: ParamList<P1, P2, P3>) => boolean): { unsubscribe: () => void; id: number };
    once(listener: (...params: ParamList<P1, P2, P3>) => boolean): ReturnType<typeof foundryApi.hooks.once>;
};

type ParamList<P1 = never, P2 = never, P3 = never> = [P1] extends [never]
    ? [...rest: unknown[]]
    : [P2] extends [never]
      ? [p1: P1, ...rest: unknown[]]
      : [P3] extends [never]
        ? [p1: P1, p2: P2, ...rest: unknown[]]
        : [p1: P1, p2: P2, p3: P3, ...rest: unknown[]];

export function registerHook(hookName: `splittermond.${string}`): ValidatedHook<never, never, never>;
export function registerHook<T1, REQ1 extends boolean, NUL1 extends boolean>(
    hookName: `splittermond.${string}`,
    param1: DataField<T1, REQ1, NUL1>
): ValidatedHook<InstancedType<DataField<T1, REQ1, NUL1>>, never, never>;
export function registerHook<
    T1,
    REQ1 extends boolean,
    NUL1 extends boolean,
    T2,
    REQ2 extends boolean,
    NUL2 extends boolean,
>(
    hookName: `splittermond.${string}`,
    param1: DataField<T1, REQ1, NUL1>,
    param2: DataField<T2, REQ2, NUL2>
): ValidatedHook<InstancedType<DataField<T1, REQ1, NUL1>>, InstancedType<DataField<T2, REQ2, NUL2>>, never>;
export function registerHook<
    T1,
    REQ1 extends boolean,
    NUL1 extends boolean,
    T2,
    REQ2 extends boolean,
    NUL2 extends boolean,
    T3,
    REQ3 extends boolean,
    NUL3 extends boolean,
>(
    hookName: `splittermond.${string}`,
    param1: DataField<T1, REQ1, NUL1>,
    param2: DataField<T2, REQ2, NUL2>,
    param3: DataField<T3, REQ3, NUL3>
): ValidatedHook<
    InstancedType<DataField<T1, REQ1, NUL1>>,
    InstancedType<DataField<T2, REQ2, NUL2>>,
    InstancedType<DataField<T3, REQ3, NUL3>>
>;
export function registerHook(hookName: `splittermond.${string}`, ...params: (DataField<any, any, any> | undefined)[]) {
    const validators = params.filter(Boolean) as DataField<any, any, any>[];

    function call(...args: unknown[]) {
        validators.forEach((v, i) => validate(args[i], v));
        return foundryApi.hooks.call(hookName, ...args);
    }
    function subscribe(listener: (...args: unknown[]) => boolean) {
        const id = foundryApi.hooks.on(hookName, listener);
        return {
            unsubscribe: () => foundryApi.hooks.off(hookName, id),
            id,
        };
    }
    function once(listener: (...args: unknown[]) => boolean) {
        return foundryApi.hooks.once(hookName, listener);
    }
    if (!addToRegistry(hookName.substring(hookName.indexOf(".") + 1), subscribe)) {
        throw new Error(`${hookName} already registered`);
    }
    return { call, subscribe, once };
}

function validate<T, REQ extends boolean, NUL extends boolean>(candidate: unknown, validator: DataField<T, REQ, NUL>) {
    const validationResult = validator.validate(candidate);
    if (!!validationResult) {
        throw new HookParamValidationError(`Failed to validate candidate '${candidate}'`, validationResult);
    }
}

export class HookParamValidationError extends Error {
    constructor(
        message: string,
        public readonly cause: DataModelValidationFailure
    ) {
        super(message);
    }

    toString() {
        return `${super.toString()}:\nCause: ${this.cause.toString()}`;
    }
}
