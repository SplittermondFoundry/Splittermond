import type SplittermondActor from "module/actor/actor";

interface HasActor {
    actor: SplittermondActor | null;
}

function hasActor(value: object): value is HasActor {
    return "actor" in value;
}

export function resolveHostActor(effectDoc: unknown): SplittermondActor | null {
    if (!effectDoc || typeof effectDoc !== "object") {
        return null;
    }
    if (!hasActor(effectDoc)) {
        return null;
    }
    return effectDoc.actor;
}
