import { foundryApi } from "module/api/foundryApi";

export function warnIncompleteStatusEffectTimer(
    name: string,
    interval: number | string | null,
    repeats: number | string | null
): void {
    const hasInterval = interval !== null && interval !== "";
    const hasRepeats = repeats !== null && repeats !== "";
    if (hasInterval === hasRepeats) return;

    foundryApi.warnUser(
        hasInterval
            ? "splittermond.message.statusEffectMissingRepeats"
            : "splittermond.message.statusEffectMissingInterval",
        { name }
    );
}
