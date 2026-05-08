import type SplittermondItem from "module/item/item";
import type { ModifierType } from "module/modifiers";
import type { AddModifierResult } from "module/modifiers/modifierAddition";

export type IAddModifier = (
    item: SplittermondItem,
    modifier: string,
    type: ModifierType,
    multiplier: number
) => AddModifierResult;
export const actualAddModifierFunction = { self: null as IAddModifier | null };

export function addModifier(...args: Parameters<IAddModifier>): AddModifierResult {
    if (!actualAddModifierFunction.self) {
        console.warn("Splittermond | No modifier adapter has been registered. Returning empty modifier list.");
        return { modifiers: [], costModifiers: [] };
    }
    return actualAddModifierFunction.self(...args);
}
