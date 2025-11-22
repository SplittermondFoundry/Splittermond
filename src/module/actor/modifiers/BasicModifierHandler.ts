import { type IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { type Expression, isZero, times } from "module/modifiers/expressions/scalar";
import type SplittermondItem from "module/item/item";
import Modifier from "module/modifiers/impl/modifier";

export function BasicModifierHandler(inputId: string, groupId?: string) {
    return class extends ModifierHandler<ScalarModifier> {
        constructor(
            logErrors: (...message: string[]) => void,
            private readonly sourceItem: SplittermondItem,
            private readonly modifierType: ModifierType,
            private readonly multiplier: Expression
        ) {
            super(logErrors, makeConfig({ topLevelPath: inputId }));
        }
        protected buildModifier(modifier: ScalarModifier): IModifier[] {
            const attributes = {
                name: this.sourceItem.name,
                type: this.modifierType,
            };
            const value = times(this.multiplier, modifier.value);
            return [new Modifier(groupId ?? inputId, value, attributes, this.sourceItem, false)];
        }

        protected omitForValue(value: Expression): boolean {
            return isZero(value);
        }
    };
}
