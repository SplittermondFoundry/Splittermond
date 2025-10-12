import SplittermondActor from "module/actor/actor";
import { askUserForTickAddition } from "module/combat/TickAdditionDialog";
import { foundryApi } from "module/api/foundryApi";
import type SplittermondCombat from "module/combat/combat";

interface AddTicksOptions {
    message?: string;
    askPlayer?: boolean;
}

/**
 * Adds ticks to an actor's initiative in the current combat.
 * @param actor the actor in combat
 * @param ticksToAdd the number of ticks to add (can be fractional, will be rounded)
 * @param addTickOptions options for a message to display and whether to ask the player
 */
export async function addTicks(actor: SplittermondActor, ticksToAdd: number, addTickOptions: AddTicksOptions = {}) {
    const combat = foundryApi.combat as SplittermondCombat;
    if (ticksToAdd <= 0) {
        console.debug("Splittermond | Not adding ticks, value is <= 0");
        return;
    }
    if (!combat) {
        console.debug("Splittermond | Cannot add ticks, no active combat");
        return;
    }

    const askPlayer = addTickOptions.askPlayer ?? true;
    const message = addTickOptions.message ?? "";
    const combatant = combat.combatants.find((c) => c.actor === actor);

    if (!combatant || combatant.initiative == null) {
        console.debug("Splittermond | No combatant found for actor " + actor.name + " or initiative is null");
        return;
    }
    const nTicks = askPlayer ? await askUserForTickAddition(ticksToAdd, message) : Math.round(ticksToAdd);

    const newInitiative = Math.round(combatant.initiative) + nTicks;

    console.log("Splittermond | Adding " + nTicks + " ticks to " + actor.name + ", new initiative: " + newInitiative);
    return combat.setInitiative(combatant.id, newInitiative);
}
