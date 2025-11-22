import { ModifierRegistry } from "module/modifiers";
import { ActorSkillHandler, SkillHandler } from "module/actor/modifiers/SkillHandler";
import { splittermond } from "module/config";
import { IndividualSkillHandler } from "module/actor/modifiers/IndividualSkillHandler";
import { BasicModifierHandler } from "module/actor/modifiers/BasicModifierHandler";
import type { ScalarModifier } from "module/modifiers/parsing";
import { ActorSplinterpointsHandler, SplinterpointsHandler } from "module/actor/modifiers/SplinterpointsHandler";

export function registerActorModifiers(registry: ModifierRegistry<ScalarModifier>) {
    registry.addHandler(SkillHandler.config.topLevelPath, SkillHandler);
    registry.addHandler(ActorSkillHandler.config.topLevelPath, ActorSkillHandler);
    splittermond.skillGroups.all.forEach((skill) => {
        registry.addHandler(skill, IndividualSkillHandler(skill));
    });
    registry.addHandler(SplinterpointsHandler.config.topLevelPath, SplinterpointsHandler);
    registry.addHandler(ActorSplinterpointsHandler.config.topLevelPath, ActorSplinterpointsHandler);
    ["focusregeneration.bonus", "healthregeneration.bonus"].forEach((segment) => {
        const fullId = `actor.${segment}`;
        registry.addHandler(`${segment}`, BasicModifierHandler(`${segment}`, fullId));
        registry.addHandler(fullId, BasicModifierHandler(`${segment}`, fullId));
    });
}
