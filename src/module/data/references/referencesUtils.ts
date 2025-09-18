import { foundryApi } from "module/api/foundryApi";
import { AgentReference } from "./AgentReference";

export const referencesUtils = {
    /**@type {() => AgentReference}*/ findBestUserActor,
};

/**
 * @throws {Error}
 */
function findBestUserActor(): AgentReference {
    /*
     * Incredible as it is, as of V11, going via the chat system is actually the best and most robust way to
     * figure out against whom to send the active defense action. It checks, explicitly given actors, controlled
     * tokens (via game.canvas.tokens.controlled), or owned actors (via game.user.character).
     */
    const speaker = foundryApi.getSpeaker({});
    let actor: AgentReference | null = null;
    if (speaker.token) {
        const tokenActor = foundryApi.getToken(speaker.scene, speaker.token);
        actor = tokenActor ? withTry(() => AgentReference.initialize(tokenActor)) : null;
    }

    if (!actor && speaker.actor) {
        const topLevelActor = foundryApi.getActor(speaker.actor);
        actor = topLevelActor ? withTry(() => AgentReference.initialize(topLevelActor)) : null;
    }
    if (!actor) {
        throw new Error("No actor found for the current user.");
    }
    return actor;
}

function withTry(callback: Function) {
    try {
        return callback();
    } catch (Error) {
        return null;
    }
}
