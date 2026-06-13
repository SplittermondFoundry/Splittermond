import { DamageEvent, DamageImplement } from "./DamageEvent";
import SplittermondActor from "../../actor/actor";
import { documentValidator, registerHook } from "module/hooks";
import { fields } from "module/data/SplittermondDataModel";

export interface Immunity {
    name: string;
}

const present = { required: true, nullable: false } as const;

const implementImmunityHook = registerHook("splittermond.damage.onImplementImmunity", () => [
    documentValidator(SplittermondActor),
    new fields.EmbeddedDataField(DamageImplement, present),
    new fields.ArrayField(new fields.AnyField(present), present),
]);
const eventImmunityHook = registerHook("splittermond.damage.onEventImmunity", () => [
    documentValidator(SplittermondActor),
    new fields.EmbeddedDataField(DamageEvent, present),
    new fields.ArrayField(new fields.AnyField(present), present),
]);
export const hooks = {
    eventImmunityHook: eventImmunityHook.subscribe,
    implementImmunityHook: implementImmunityHook.subscribe,
};

export function evaluateImplementImmunities(
    implement: DamageImplement,
    target: SplittermondActor
): Immunity | undefined {
    initDefaultHooks();
    const immunities: unknown[] = [];
    implementImmunityHook.call(target, implement, immunities);

    return immunities.find((immunity) => isImmunity(immunity));
}

export function evaluateEventImmunities(event: DamageEvent, target: SplittermondActor): Immunity | undefined {
    initDefaultHooks();
    const immunities: unknown[] = [];
    eventImmunityHook.call(target, event, immunities);

    return immunities.find((immunity) => isImmunity(immunity));
}

function isImmunity(immunity: unknown): immunity is Immunity {
    return (immunity as Immunity).name !== undefined;
}

let isInitalized = false;
function initDefaultHooks() {
    if (isInitalized) {
        return;
    }
    isInitalized = true;
    eventImmunityHook.subscribe((target: SplittermondActor, event: DamageEvent, immunities: unknown[]) => {
        const isStunDamage = event.costBase.costType === "E";
        const isStunImmunity = target.items.find((i) => i.name === "Betäubungsimmunität");
        if (isStunDamage && isStunImmunity) {
            immunities.push({ name: "Betäubungsimmunität" });
        }
        return true; // continue with other hooks
    });
}
