import { DamageEvent, DamageImplement } from "./DamageEvent";
import SplittermondActor from "../../actor/actor";
import { foundryApi } from "../../api/foundryApi";

export interface Immunity {
    name: string;
}

export function evaluateImplementImmunities(
    implement: DamageImplement,
    target: SplittermondActor
): Immunity | undefined {
    initDefaultHooks();
    const immunities: unknown[] = [];
    foundryApi.hooks.call(implementImmunityHook, target, implement, immunities);

    return immunities.find((immunity) => isImmunity(immunity));
}

export function evaluateEventImmunities(event: DamageEvent, target: SplittermondActor): Immunity | undefined {
    initDefaultHooks();
    const immunities: unknown[] = [];
    foundryApi.hooks.call(eventImmunityHook, target, event, immunities);

    return immunities.find((immunity) => isImmunity(immunity));
}

export const implementImmunityHook = "splittermond.damage.onImplementImmunity";
export const eventImmunityHook = "splittermond.damage.onEventImmunity";

function isImmunity(immunity: unknown): immunity is Immunity {
    return (immunity as Immunity).name !== undefined;
}

let isInitalized = false;
function initDefaultHooks() {
    if (isInitalized) {
        return;
    }
    isInitalized = true;
    foundryApi.hooks.on(eventImmunityHook, (target: SplittermondActor, event: DamageEvent, immunities: unknown[]) => {
        const isStunDamage = event.costBase.costType === "E";
        const isStunImmunity = target.items.find((i) => i.name === "Betäubungsimmunität");
        if (isStunDamage && isStunImmunity) {
            immunities.push({ name: "Betäubungsimmunität" });
        }
        return true; // continue with other hooks
    });
}
