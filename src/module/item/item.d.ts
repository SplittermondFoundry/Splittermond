import SplittermondActor from "../actor/actor";
import type { SplittermondItemDataModel } from "./index";

declare class SplittermondItem extends Item {
    readonly actor: SplittermondActor;
    type: string;
    prepareActorData(): void;
    system: SplittermondItemDataModel;
}

export default SplittermondItem;
