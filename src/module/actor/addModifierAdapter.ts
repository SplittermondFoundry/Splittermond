import type SplittermondItem from "module/item/item";
import type { IModifier, ModifierType } from "module/actor/modifier-manager";
import type { ICostModifier } from "module/util/costs/spellCostManagement";

export type IAddModifierResult = { modifiers: IModifier[]; costModifiers: ICostModifier[] };
export type IAddModifier = (
    item: SplittermondItem,
    modifier: string,
    type: ModifierType,
    multiplier: number
) => IAddModifierResult;
export const actualAddModifierFunction = { self: null as IAddModifier | null };

export function addModifier(...args: Parameters<IAddModifier>): IAddModifierResult {
    if (!actualAddModifierFunction.self) {
        console.warn("Splittermond | No modifier adapter has been registered. Returning empty modifier list.");
        return { modifiers: [], costModifiers: [] };
    }
    return actualAddModifierFunction.self(...args);
}
