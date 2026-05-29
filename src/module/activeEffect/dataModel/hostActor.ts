import type SplittermondActor from "module/actor/actor";

interface HasDocumentName {
    documentName: string;
}

interface HasActor {
    actor: SplittermondActor | null;
}

function hasDocumentName(value: unknown): value is HasDocumentName {
    return !!value && typeof value === "object" && "documentName" in value;
}

function hasActor(value: unknown): value is HasActor {
    return !!value && typeof value === "object" && "actor" in value;
}

/**
 * Resolves the host actor for a given ActiveEffect document.
 *
 * - If the effect's parent is an Actor, returns that actor.
 * - If the effect's parent is an Item owned by an Actor, returns that actor.
 * - Otherwise returns null (e.g. compendium, unembedded item).
 */
export function resolveHostActor(effectDoc: unknown): SplittermondActor | null {
    if (!effectDoc || typeof effectDoc !== "object") {
        return null;
    }
    const parent = (effectDoc as { parent?: unknown }).parent;
    if (!parent) {
        return null;
    }
    if (hasDocumentName(parent) && parent.documentName === "Actor") {
        return parent as unknown as SplittermondActor;
    }
    if (hasDocumentName(parent) && parent.documentName === "Item" && hasActor(parent)) {
        return parent.actor;
    }
    return null;
}
