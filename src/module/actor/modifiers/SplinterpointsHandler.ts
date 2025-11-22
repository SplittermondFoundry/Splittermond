import { type IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import { Expression, times } from "module/modifiers/expressions/scalar";
import type { ScalarModifier, Value } from "module/modifiers/parsing";
import type SplittermondItem from "module/item/item";
import { ByAttributeHandler } from "module/modifiers/impl/ByAttributeHandler";
import Modifier from "module/modifiers/impl/modifier";

export class SplinterpointsHandler extends BaseSplinterpointsHandler("splinterpoints") {}
export class ActorSplinterpointsHandler extends BaseSplinterpointsHandler("actor.splinterpoints") {}
function BaseSplinterpointsHandler(topLevelPath: string) {
    return class extends ByAttributeHandler(ModifierHandler<ScalarModifier>) {
        static config = makeConfig({
            topLevelPath: topLevelPath,
            subSegments: {
                bonus: {
                    optionalAttributes: ["skill"],
                },
            },
        });

        constructor(
            logErrors: (...message: string[]) => void,
            sourceItem: SplittermondItem,
            modifierType: ModifierType,
            private readonly multiplier: Expression
        ) {
            super(logErrors, SplinterpointsHandler.config, sourceItem, modifierType);
        }

        protected buildModifier(modifier: ScalarModifier): IModifier[] {
            const normalizedAttributes = this.buildAttributes(modifier.path, modifier.attributes);
            const adjustedValue = times(modifier.value, this.multiplier);

            return [
                new Modifier(
                    this.prependActor(modifier.path),
                    adjustedValue,
                    normalizedAttributes,
                    this.sourceItem,
                    false
                ),
            ];
        }

        prependActor(groupId: string): string {
            return groupId.startsWith("actor.") ? groupId : `actor.${groupId}`;
        }

        mapAttribute(path: string, attribute: string, value: Value): string | undefined {
            switch (attribute) {
                case "skill":
                    return this.commonNormalizers.normalizeSkill(path, value);
                default:
                    return this.commonNormalizers.validatedAttribute(value);
            }
        }
    };
}
