import { ModifierRegistry } from "module/modifiers";
import { ActorSkillHandler, SkillHandler } from "module/actor/modifiers/SkillHandler";
import { splittermond } from "module/config";
import {
    BasicModifierHandler,
    IndividualSkillHandlers,
    ProductModifierHandler,
    SkillFilterHandler,
    TickHandicapHandler,
} from "module/actor/modifiers/ActorModifierHandlers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { ActorSplinterpointsHandler, SplinterpointsHandler } from "module/actor/modifiers/SplinterpointsHandler";
import { derivedAttributes } from "module/config/attributes";
import { pow } from "module/modifiers/expressions/scalar";

export function registerActorModifiers(registry: ModifierRegistry<ScalarModifier>) {
    const lowerFumbleResultHandler = SkillFilterHandler({ topLevelPath: "lowerfumbleresult" });
    registry.addHandler(SkillHandler.config.topLevelPath, SkillHandler);
    registry.addHandler(ActorSkillHandler.config.topLevelPath, ActorSkillHandler);
    splittermond.skillGroups.all.forEach((skill) => {
        registry.addHandler(skill, IndividualSkillHandlers(skill));
    });
    registry.addHandler(SplinterpointsHandler.config.topLevelPath, SplinterpointsHandler);
    registry.addHandler(ActorSplinterpointsHandler.config.topLevelPath, ActorSplinterpointsHandler);
    registry.addHandler(lowerFumbleResultHandler.config.topLevelPath, lowerFumbleResultHandler);
    ["woundmalus.levelmod", "woundmalus.mod", "focusregeneration.bonus", "healthregeneration.bonus"].forEach(
        (segment) => {
            const fullId = `actor.${segment}`;
            registry.addHandler(segment, BasicModifierHandler(segment, fullId));
            registry.addHandler(fullId, BasicModifierHandler(fullId));
        }
    );
    registry.addHandler("tickmalus", TickHandicapHandler("tickmalus"));
    registry.addHandler("handicap", TickHandicapHandler("handicap"));
    registry.addHandler("bonuscap", BasicModifierHandler("bonuscap"));
    derivedAttributes.forEach((slug) => {
        const segment = `${slug}.multiplier`;
        const fullId = `actor.${segment}`;
        registry.addHandler(segment, ProductModifierHandler(segment, fullId, pow));
        registry.addHandler(fullId, ProductModifierHandler(fullId, fullId, pow));
    });
    ["focusregeneration", "healthregeneration"].forEach((slug) => {
        const segment = `${slug}.multiplier`;
        const fullId = `actor.${segment}`;
        registry.addHandler(segment, ProductModifierHandler(segment, fullId));
        registry.addHandler(fullId, ProductModifierHandler(fullId));
    });
    const damageReduction = "damagereduction";
    registry.addHandler("sr", BasicModifierHandler("sr", damageReduction));
    registry.addHandler(damageReduction, BasicModifierHandler(damageReduction));
}
