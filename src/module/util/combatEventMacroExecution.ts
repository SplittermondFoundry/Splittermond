import { foundryApi } from "module/api/foundryApi";
import { executeMacroByUuid } from "module/api/Macro";
import type { VirtualToken } from "module/combat/VirtualToken";
import type { FoundryCombatant } from "module/api/foundryTypes";

export interface FiredMacroPair {
    virtualToken: VirtualToken;
    combatant: FoundryCombatant;
}

export function executeFiredMacros(pairs: FiredMacroPair[]): void {
    for (const pair of pairs) {
        const { virtualToken, combatant } = pair;
        const uuid = virtualToken.macroRef?.uuid;
        if (uuid === null || uuid === undefined) continue;

        const speaker = foundryApi.getSpeaker({ actor: combatant.actor });
        const token = combatant.token ?? undefined;

        executeMacroByUuid(uuid, { actor: combatant.actor, token, speaker }).catch((error) => {
            console.error("Splittermond | Failed to execute combat event macro: " + uuid, error);
        });
    }
}
