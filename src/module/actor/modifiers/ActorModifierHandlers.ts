import type { SplittermondSkill } from "module/config/skillGroups";
import { BarebonesModifierHandler } from "module/actor/modifiers/BarebonesModifierHandler";
import type { ScalarModifier } from "module/modifiers/parsing";
import type { IModifier } from "module/modifiers";
import Modifier from "module/modifiers/impl/modifier";
import { MultiplicativeModifier } from "module/modifiers/impl/MultiplicativeModifier";
import type { Expression } from "module/modifiers/expressions/scalar";

export function IndividualSkillHandlers(skill: SplittermondSkill) {
    return class extends BarebonesModifierHandler({ topLevelPath: skill, optionalAttributes: ["emphasis"] }) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return new Modifier(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.emphasis ?? mod.attributes.name },
                    mod.origin,
                    !!mod.attributes.emphasis
                );
            });
        }
    };
}

export function BasicModifierHandler(inputPath: string, groupId?: string) {
    return class extends BarebonesModifierHandler({ topLevelPath: inputPath }, groupId) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return new Modifier(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.emphasis ?? mod.attributes.name },
                    mod.origin,
                    mod.selectable
                );
            });
        }
    };
}

export function ProductModifierHandler(
    inputPath: string,
    groupId?: string,
    operator?: (a: Expression, b: Expression) => Expression
) {
    return class extends BarebonesModifierHandler({ topLevelPath: inputPath }, groupId, operator) {
        protected omitForValue(): boolean {
            return false;
        }
        protected buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return new MultiplicativeModifier(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.name },
                    mod.origin,
                    !!mod.attributes.emphasis
                );
            });
        }
    };
}

export function TickHandicapHandler(inputPath: string) {
    const config = {
        topLevelPath: inputPath,
        subSegments: {
            armor: { subSegments: { mod: {} } },
            shield: { subSegments: { mod: {} }, mod: {} },
            mod: {},
        },
    };
    return class extends BarebonesModifierHandler(config) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                const demoddedId = mod.groupId.replace(/\.mod$/i, "");
                return new Modifier(demoddedId, mod.value, mod.attributes, mod.origin, mod.selectable);
            });
        }
    };
}

export function SkillFilterHandler<CONFIG extends { topLevelPath: string }>(config: CONFIG, groupId?: string) {
    return class extends BarebonesModifierHandler(config, groupId) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                if (mod.attributes.skill) {
                    mod.attributes.skill = this.commonNormalizers.normalizeSkill(mod.groupId, mod.attributes.skill);
                }
                return new Modifier(mod.groupId, mod.value, mod.attributes, mod.origin, mod.selectable);
            });
        }
    };
}
