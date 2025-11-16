import { type IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { type Expression, isZero, times } from "module/modifiers/expressions/scalar";
import type SplittermondItem from "module/item/item";
import type { SplittermondSkill } from "module/config/skillGroups";
import Modifier from "module/modifiers/impl/modifier";

export function IndividualSkillHandler(skill: SplittermondSkill) {
    return class extends ModifierHandler<ScalarModifier> {
        constructor(
            logErrors: (...message: string[]) => void,
            private readonly sourceItem: SplittermondItem,
            private readonly modifierType: ModifierType,
            private readonly multiplier: Expression
        ) {
            super(logErrors, makeConfig({ topLevelPath: skill }));
        }
        protected buildModifier(modifier: ScalarModifier): IModifier[] {
            const attributes = {
                name: this.sourceItem.name,
                type: this.modifierType,
            };
            const value = times(this.multiplier, modifier.value);
            return [new Modifier(modifier.path, value, attributes)];
        }

        protected omitForValue(value: Expression): boolean {
            return isZero(value);
        }
    };
}
