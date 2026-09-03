import { ItemType } from "module/config/itemTypes";
import SplittermondActor from "../actor/actor";
import type { SplittermondItemDataModelType } from "./index";
import type { IAddModifier } from "module/actor/addModifierAdapter";

declare class SplittermondItem extends Item {
    readonly actor: SplittermondActor;
    type: ItemType;
    prepareActorData(): void;
    system: SplittermondItemDataModelType;
}

export function setAddModifier(addModifierFn: IAddModifier): void;
export function getAddModifier(): IAddModifier | null;
export default SplittermondItem;
