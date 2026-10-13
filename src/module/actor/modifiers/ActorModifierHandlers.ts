import type { SplittermondSkill } from "module/config/skillGroups";
import { BarebonesModifierHandler } from "module/actor/modifiers/BarebonesModifierHandler";
import type { ScalarModifier } from "module/modifiers/parsing";
import type { IModifier } from "module/modifiers";
import { Modifier, InverseModifier, MultiplicativeModifier } from "module/activeEffect";
import type { ConfigSegment } from "module/modifiers/ModifierConfig";

export function IndividualSkillHandlers(skill: SplittermondSkill) {
    return class extends BarebonesModifierHandler({
        topLevelPath: skill,
        description: "splittermond.modifierHelper.descriptions.skill",
        optionalAttributes: ["emphasis"],
    }) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return Modifier.create(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.emphasis ?? mod.attributes.name },
                    !!mod.attributes.emphasis,
                    this.actorProvider
                );
            });
        }
    };
}

export function BasicModifierHandler(
    inputPath: string,
    groupId?: string,
    options: Pick<ConfigSegment, "helperGroup" | "valueChoices" | "hideInHelper"> = {}
) {
    return class extends BarebonesModifierHandler(
        {
            ...options,
            topLevelPath: inputPath,
            helperAlias: groupId !== inputPath ? groupId : undefined,
            description: `splittermond.modifierHelper.descriptions.${(groupId ?? inputPath)
                .replace(/^actor\./, "")
                .replace(/^(resistance|weakness)\..+$/, "$1")
                .replace(/\./g, "_")
                .toLowerCase()}`,
        },
        groupId
    ) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return Modifier.create(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.emphasis ?? mod.attributes.name },
                    mod.selectable,
                    this.actorProvider
                );
            });
        }
    };
}
export function EmphasisAwareBasicHandler(inputPath: string, groupId?: string) {
    return class extends BarebonesModifierHandler(
        {
            topLevelPath: inputPath,
            description: "splittermond.modifierHelper.descriptions.npcattacks",
            optionalAttributes: ["emphasis"],
        },
        groupId
    ) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return Modifier.create(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.emphasis ?? mod.attributes.name },
                    !!mod.attributes.emphasis,
                    this.actorProvider
                );
            });
        }
    };
}
export function InverseModifierHandler(inputPath: string, groupId?: Lowercase<string>) {
    return class extends BarebonesModifierHandler(
        { topLevelPath: inputPath, description: "splittermond.modifierHelper.descriptions.initiative" },
        groupId
    ) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return InverseModifier.create(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.emphasis ?? mod.attributes.name },
                    mod.selectable,
                    this.actorProvider
                );
            });
        }
    };
}

export function ProductModifierHandler(inputPath: string, groupId?: string) {
    return class extends BarebonesModifierHandler(
        {
            topLevelPath: inputPath,
            helperAlias: groupId !== inputPath ? groupId : undefined,
            description: "splittermond.modifierHelper.descriptions.multiplier",
        },
        groupId
    ) {
        protected omitForValue(): boolean {
            return false;
        }
        protected buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                return MultiplicativeModifier.create(
                    mod.groupId,
                    mod.value,
                    { ...mod.attributes, name: mod.attributes.name },
                    !!mod.attributes.emphasis,
                    this.actorProvider
                );
            });
        }
    };
}

export function TickHandicapHandler(inputPath: string) {
    const description = `splittermond.modifierHelper.descriptions.${inputPath}`;
    const config = {
        topLevelPath: inputPath,
        description,
        subSegments: {
            armor: {
                description: `${description}Armor`,
                subSegments: { mod: { description: `${description}Armor`, helperAlias: `${inputPath}.armor` } },
            },
            shield: {
                description: `${description}Shield`,
                subSegments: { mod: { description: `${description}Shield`, helperAlias: `${inputPath}.shield` } },
                mod: {},
            },
            mod: { description, helperAlias: inputPath },
        },
    };
    return class extends BarebonesModifierHandler(config) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                const demoddedId = mod.groupId.replace(/\.mod$/i, "");
                return Modifier.create(demoddedId, mod.value, mod.attributes, mod.selectable, this.actorProvider);
            });
        }
    };
}

export function SkillFilterHandler<CONFIG extends { topLevelPath: string }>(config: CONFIG, groupId?: string) {
    const existingOptionalAttributes =
        "optionalAttributes" in config && Array.isArray(config.optionalAttributes) ? config.optionalAttributes : [];
    const enhancedConfig = {
        ...config,
        optionalAttributes: [...existingOptionalAttributes, "skill"],
    };
    return class extends BarebonesModifierHandler(enhancedConfig, groupId) {
        buildModifier(modifier: ScalarModifier): IModifier[] {
            const preprocessed = super.buildModifier(modifier);
            return preprocessed.map((mod) => {
                if (mod.attributes.skill) {
                    mod.attributes.skill = this.commonNormalizers.normalizeSkill(mod.groupId, mod.attributes.skill);
                }
                return Modifier.create(mod.groupId, mod.value, mod.attributes, mod.selectable, this.actorProvider);
            });
        }
    };
}
