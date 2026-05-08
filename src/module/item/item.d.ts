import { ItemType } from "module/config/itemTypes";
import SplittermondActor from "../actor/actor";
import type { SplittermondItemDataModelType } from "./index";
import type { AddModifierResult } from "module/modifiers/modifierAddition";
import type { ModifierType } from "module/modifiers";

declare class SplittermondItem extends Item {
    readonly actor: SplittermondActor;
    type: ItemType;
    prepareActorData(): void;
    system: SplittermondItemDataModelType;
}

export function setAddModifier(
    addModifierFn: (item: SplittermondItem, str: string, type: ModifierType, multiplier: number) => AddModifierResult
): void;
export function getAddModifier(): ((item: SplittermondItem, str: string, type: ModifierType, multiplier: number) => AddModifierResult) | null;
export default SplittermondItem;
