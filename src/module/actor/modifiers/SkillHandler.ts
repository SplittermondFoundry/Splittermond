import { type Config, type IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import type { ScalarModifier, Value } from "module/modifiers/parsing";
import type { SplittermondSkill } from "module/config/skillGroups";
import type SplittermondItem from "module/item/item";
import { type Expression, isZero, times } from "module/modifiers/expressions/scalar";
import { splittermond } from "module/config";
import Modifier from "module/modifiers/impl/modifier";
import { isMember } from "module/util/util";
import { CommonHandlerMethods } from "module/modifiers/impl/CommonHandlerMethods";

const commonConfig = {
    optionalAttributes: ["skill", "attribute1", "attribute2"],
    subSegments: {
        general: {},
        magic: {},
        fighting: {},
    },
} as const;
class CommonSkillHandler extends CommonHandlerMethods(ModifierHandler<ScalarModifier>) {
    constructor(
        logErrors: (...message: string[]) => void,
        config: Config,
        sourceItem: SplittermondItem,
        modifierType: ModifierType,
        private readonly multiplier: Expression
    ) {
        super(logErrors, config, sourceItem, modifierType);
    }
    protected buildModifier(modifier: ScalarModifier): IModifier[] {
        const groupId = modifier.path.startsWith("actor") ? modifier.path : `actor.${modifier.path}`;
        switch (groupId) {
            case "actor.skills.general":
                return this.unwrapModifiers(splittermond.skillGroups.general, modifier);
            case "actor.skills.magic":
                return this.unwrapModifiers(splittermond.skillGroups.magic, modifier);
            case "actor.skills.fighting":
                return this.unwrapModifiers(splittermond.skillGroups.fighting, modifier);
        }
        const normalizedAttributes = this.buildAttributes(modifier.path, modifier.attributes);
        return [
            new Modifier(groupId, times(this.multiplier, modifier.value), normalizedAttributes, this.sourceItem, false),
        ];
    }

    protected omitForValue(value: Expression): boolean {
        return isZero(value);
    }

    private unwrapModifiers(skillGroup: readonly SplittermondSkill[], modifier: ScalarModifier) {
        return skillGroup.map((skill) => {
            const value = times(this.multiplier, modifier.value);
            const attributes = { name: this.sourceItem.name, type: this.modifierType };
            return new Modifier(skill, value, attributes, this.sourceItem, false);
        });
    }

    protected mapAttribute(path: string, attribute: string, value: Value) {
        switch (attribute) {
            case "skill":
                return this.normalizeSkill(path, value);
            case "attribute1":
            case "attribute2":
                return this.normalizeActorAttribute(path, attribute, value);
            default:
                return this.validatedAttribute(attribute);
        }
    }

    normalizeSkill(groupId: string, skill: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(skill, "skills");
        return this.passGroupMemberValidation(groupId, normalized, splittermond.skillGroups.all, "skill");
    }

    normalizeActorAttribute(groupId: string, attribute: string, value: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(value, "attributes");
        return this.passGroupMemberValidation(groupId, normalized, splittermond.attributes, attribute);
    }

    private passGroupMemberValidation(
        groupId: string,
        value: string | undefined,
        group: readonly string[],
        descriptorName: string
    ): string | undefined {
        if (!value) {
            return undefined;
        } else if (!isMember(group, value)) {
            this.reportInvalidDescriptor(groupId, descriptorName, value);
            return value;
        } else {
            return value;
        }
    }
}
export class SkillHandler extends CommonSkillHandler {
    static config = makeConfig({
        topLevelPath: "skills",
        ...commonConfig,
    });
    constructor(
        logErrors: (...message: string[]) => void,
        sourceItem: SplittermondItem,
        modifierType: ModifierType,
        multiplier: Expression
    ) {
        super(logErrors, SkillHandler.config, sourceItem, modifierType, multiplier);
    }
}
export class ActorSkillHandler extends CommonSkillHandler {
    static config = makeConfig({
        topLevelPath: "actor.skills",
        ...commonConfig,
    });
    constructor(
        logErrors: (...message: string[]) => void,
        sourceItem: SplittermondItem,
        modifierType: ModifierType,
        multiplier: Expression
    ) {
        super(logErrors, ActorSkillHandler.config, sourceItem, modifierType, multiplier);
    }
}
