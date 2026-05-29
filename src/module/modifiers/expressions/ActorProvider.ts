import type SplittermondActor from "module/actor/actor";

export type ActorProvider = () => SplittermondActor | null;

export class UnboundReferenceError extends Error {
    constructor(public readonly propertyPath: string) {
        super(
            `Splittermond | ReferenceExpression '${propertyPath}' has no actor context; the expression is not bound to a host document with an actor.`
        );
        this.name = "UnboundReferenceError";
    }
}
