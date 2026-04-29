import { SplittermondActiveEffect } from "./SplittermondActiveEffect";
import { ModifierDataModel, type ModifierDataModelType } from "./dataModel/ModifierDataModel";
import { InverseModifierDataModel, type InverseModifierDataModelType } from "./dataModel/InverseModifierDataModel";
import {
    MultiplicativeModifierDataModel,
    type MultiplicativeModifierDataModelType,
} from "./dataModel/MultiplicativeModifierDataModel";
import { CostModifierDataModel, type CostModifierDataModelType } from "./dataModel/CostModifierDataModel";

export { SplittermondActiveEffect };
export { ModifierDataModel as Modifier, type ModifierDataModelType };
export { InverseModifierDataModel as InverseModifier, type InverseModifierDataModelType };
export { MultiplicativeModifierDataModel as MultiplicativeModifier, type MultiplicativeModifierDataModelType };
export { CostModifierDataModel as CostModifier, type CostModifierDataModelType };

/**
 * Register the custom ActiveEffect subclass with Foundry.
 * Call this during system init, before any documents are created.
 */
export function initializeActiveEffects() {
    console.log("Splittermond | Initializing Active Effects feature");
    (CONFIG as any).ActiveEffect.documentClass = SplittermondActiveEffect;
    (CONFIG as any).ActiveEffect.dataModels = {
        ...((CONFIG as any).ActiveEffect.dataModels ?? {}),
        modifier: ModifierDataModel,
        inverseModifier: InverseModifierDataModel,
        multiplicativeModifier: MultiplicativeModifierDataModel,
        costModifier: CostModifierDataModel,
    };
}
