import type SplittermondActor from "module/actor/actor";

export interface IModifierSource {
    name: string;
    actor: SplittermondActor | null;
    uuid: string;
    isOwner: boolean;
}
