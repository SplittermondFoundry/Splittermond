import type { ModifierErrorLogger } from "module/modifiers/parsing/ParseErrors";

export function collectModifierMessages(report: (...messages: string[]) => void): ModifierErrorLogger {
    return {
        global: report,
        forAttribute: (_attribute, ...messages) => report(...messages),
    };
}
