import { foundryApi } from "module/api/foundryApi";
import { DataModelSchemaType, fields, SplittermondDataModel } from "../SplittermondDataModel";
import SplittermondActor from "../../actor/actor";

/**
 * A reference to a Token object, which is used to represent a specific Token within a ChatMessage.
 */
export class AgentReference extends SplittermondDataModel<DataModelSchemaType<typeof AgentReference.defineSchema>> {
    static defineSchema() {
        return {
            id: new fields.StringField({ required: true, blank: false, nullable: false }),
            sceneId: new fields.StringField({ required: false, blank: true, nullable: true }),
            type: new fields.StringField({ required: true, blank: false, nullable: false }),
        };
    }

    static initialize(agent: Actor | TokenDocument): AgentReference {
        if (agentIsActor(agent)) {
            return !agentIsTokenActor(agent)
                ? new AgentReference({ id: agent.id, sceneId: null, type: "actor" })
                : new AgentReference({ id: agent.parent.id, sceneId: agent.parent.parent.id, type: "token" });
        } else if (agentIsToken(agent)) {
            return new AgentReference({ id: agent.id, sceneId: agent.parent.id, type: "token" });
        } else {
            throw new Error("AgentReference can only be initialized with an actor or a token");
        }
    }

    getAgent(): SplittermondActor {
        const agent = this.#getActor();
        if (!agent) {
            throw new Error("AgentReference could not resolve the agent");
        }
        return returnValidSplittermondActor(agent);
    }

    #getActor(): Actor | undefined {
        if (this.type === "actor") {
            return foundryApi.getActor(this.id);
        } else if (this.sceneId) {
            return foundryApi.getToken(this.sceneId, this.id)?.actor;
        } else {
            throw new Error("No scene given when attempting to reference a token. This should not happen.");
        }
    }
}

type TokenActor = Actor & { readonly parent: TokenDocument };

function agentIsTokenActor(agent: Actor): agent is TokenActor {
    return !!agent.parent && agentIsToken(agent.parent);
}

function agentIsToken(agent: FoundryDocument): agent is TokenDocument {
    return agent.documentName === "Token";
}

function agentIsActor(agent: Actor | TokenDocument): agent is Actor {
    return agent.documentName === "Actor";
}

function returnValidSplittermondActor(actor: Actor) {
    if (actor instanceof SplittermondActor) {
        return actor;
    } else {
        throw new Error("Agent Reference returned an Actor that is not from Splittermond. This should not happen.");
    }
}
