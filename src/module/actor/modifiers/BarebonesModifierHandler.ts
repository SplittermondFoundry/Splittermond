import { type IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import type { ScalarModifier, Value } from "module/modifiers/parsing";
import { type Expression, isGreaterZero, isZero, times } from "module/modifiers/expressions/scalar";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import { CommonNormalizers } from "module/modifiers/impl/CommonNormalizers";

export function BarebonesModifierHandler<CONFIG extends { topLevelPath: string }>(
    inputConfig: CONFIG,
    groupId?: string,
    operator: (a: Expression, b: Expression) => Expression = times
) {
    const config = makeConfig(inputConfig);
    return class extends ModifierHandler<ScalarModifier> {
        protected commonNormalizers: CommonNormalizers;
        static config = config;
        constructor(
            logErrors: (...message: string[]) => void,
            private readonly sourceItem: IModifierSource,
            private readonly modifierType: ModifierType,
            private readonly multiplier: Expression
        ) {
            super(logErrors, config);
            this.commonNormalizers = new CommonNormalizers(
                this.validateDescriptor.bind(this),
                this.reportInvalidDescriptor.bind(this)
            );
        }
        protected get actorProvider() {
            return () => this.sourceItem.actor;
        }
        protected buildModifier(modifier: ScalarModifier): IModifier[] {
            const otherAttributes = Object.entries(modifier.attributes).map(this.mapAttribute.bind(this));
            const attributes = {
                ...Object.fromEntries(otherAttributes),
                name: this.sourceItem.name,
                type: this.modifierType,
            };
            const value = operator(modifier.value, this.multiplier);
            return [
                {
                    groupId: groupId
                        ? modifier.path.replace(new RegExp(inputConfig.topLevelPath, "i"), groupId)
                        : modifier.path,
                    value,
                    attributes,
                    selectable: false,
                    isBonus: isGreaterZero(value) ?? true,
                    effectType: "modifier" as const,
                    addTooltipFormulaElements() {},
                },
            ];
        }
        private mapAttribute([key, value]: [string, Value]): [string, string | undefined] {
            return [key, this.commonNormalizers.validatedAttribute(value)];
        }

        protected omitForValue(value: Expression): boolean {
            return isZero(value);
        }
    };
}
