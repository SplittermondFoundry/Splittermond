import { foundryApi } from "./foundryApi";

export declare class Macro {
    readonly name: string;
    canExecute: boolean;
    execute(scope?: MacroExecuteScope): void | Promise<void>;
}

export interface MacroExecuteScope {
    actor?: Actor | null;
    token?: object | null;
    speaker?: object | null;
}

export function isMacro(value: unknown): value is Macro {
    return (
        !!value &&
        typeof value === "object" &&
        "execute" in value &&
        typeof (value as Record<string, unknown>).execute === "function"
    );
}

export async function executeMacroByUuid(uuid: string, scope: MacroExecuteScope = {}): Promise<void> {
    const resolved = await foundryApi.utils.fromUUID(uuid);

    if (resolved === null) {
        console.warn("Splittermond | Macro not found: " + uuid);
        return;
    }

    if (!isMacro(resolved)) {
        console.warn("Splittermond | Resolved document is not a Macro: " + uuid);
        return;
    }

    if (!resolved.canExecute) {
        console.warn("Splittermond | Macro cannot be executed: " + uuid);
        return;
    }

    await resolved.execute(scope);
}
