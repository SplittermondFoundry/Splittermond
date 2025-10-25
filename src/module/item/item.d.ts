import SplittermondActor from "../actor/actor";
import type { SplittermondItemDataModelType } from "./index";

declare class SplittermondItem extends Item {
    readonly actor: SplittermondActor;
    type: string;
    prepareActorData(): void;
    system: SplittermondItemDataModelType;
}

export default SplittermondItem;
