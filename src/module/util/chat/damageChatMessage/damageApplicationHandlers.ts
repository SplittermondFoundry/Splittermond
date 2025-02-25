import {DamageEvent} from "../../damage/DamageEvent";
import {foundryApi} from "../../../api/foundryApi";
import {UserModificationDialogue} from "./userDialogue/UserModificationDialogue";
import {calculateDamageOnTarget} from "../../damage/calculateDamageOnTarget";
import {referencesUtils} from "../../../data/references/referencesUtils";
import {UserReporterImpl} from "./userDialogue/UserReporterImpl";
import {PrimaryCost} from "../../costs/PrimaryCost";
import SplittermondActor from "../../../actor/actor";

export const damageHandlers = {
    applyDamageToTargets, applyDamageToUserTargets, applyDamageToSelf
}

async function applyDamageToUserTargets(event: DamageEvent) {
    const userModifier = UserModificationDialogue.create();
    const causingActor = event.causer?.getAgent();
    if (!causingActor) {
        foundryApi.warnUser("splittermond.chatCard.damageMessage.noActorFound");
        return;
    }
    const causingUser = foundryApi.users.find(u => u.character?.id === causingActor?.id);
    if (!causingUser) {
        foundryApi.warnUser("splittermond.chatCard.damageMessage.noUserFound", {actor: causingActor.name});
        return;
    }
    const targetTokens = causingUser?.targets
    if (!targetTokens || targetTokens.size === 0) {
        foundryApi.warnUser("splittermond.chatCard.damageMessage.noTargetsFound", {user: causingUser.name});
        return;
    }
    for (const targetToken of targetTokens) {
        const target = asSplittermondActor(targetToken.document.actor);
        await applyDamageToTarget(event, userModifier, target);
    }
}

async function applyDamageToTargets(event: DamageEvent) {
    const userModifier = UserModificationDialogue.create();
    const targetTokens = foundryApi.currentUser.targets;
    if (!targetTokens || targetTokens.size === 0) {
        foundryApi.warnUser("splittermond.chatCard.damageMessage.youHaveNoTargets");
        return;
    }
    for (const targetToken of targetTokens) {
        const target = asSplittermondActor(targetToken.document.actor);
        await applyDamageToTarget(event, userModifier, target);
    }
}
function asSplittermondActor(actor: Actor): SplittermondActor {
    if(!isSplittermondActor(actor)) {
        throw new Error("Somehow[!], the actor of a token is not a Splittermond Actor")
    }
    return actor;
}

function isSplittermondActor(actor: Actor): actor is SplittermondActor {
    return actor instanceof SplittermondActor;
}


async function applyDamageToSelf(event: DamageEvent) {
    const target = findUserActor();
    if (target === null) {
        return Promise.resolve();
    }
    const userModifier = UserModificationDialogue.create();
    return applyDamageToTarget(event, userModifier, target);
}

function findUserActor() {
    try {
        return referencesUtils.findBestUserActor().getAgent();
    } catch (e) {
        foundryApi.warnUser("splittermond.chatCard.damageMessage.noActorFound");
        return null
    }
}

async function applyDamageToTarget(event: DamageEvent, userModifier: UserModificationDialogue, target: SplittermondActor) {
    const userReporter = new UserReporterImpl();

    calculateDamageOnTarget(event, target, userReporter);
    const result = await userModifier.getUserAdjustedDamage(userReporter.getReport())
    if (result == "Aborted") {
        return;
    }
    applyDamage(target, result,
        {
            sourceName: event.causer?.getAgent().name ?? '',
            principalImplement: [...event.implements]
                .sort((a, b) => a.damage - b.damage)[0]
                .implementName
        });
    return;
}

function applyDamage(target: SplittermondActor, damage: PrimaryCost, reporting: {
    sourceName: string,
    principalImplement: string
}) {

    target.consumeCost(
        "health",
        damage.render(),
        foundryApi.format("splittermond.chatCard.damageMessage.consumptionMessage", reporting)
    );
    console.log(`Splittermond | ${reporting.sourceName} dealt ${damage.render()} damage to ${target.name}`);
}
