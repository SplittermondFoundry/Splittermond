import { ModifierHandler, ModifierRegistry, ModifierType } from "module/modifiers";
import { ActorSkillHandler, SkillHandler } from "module/actor/modifiers/SkillHandler";
import { splittermond } from "module/config";
import {
    BasicModifierHandler,
    IndividualSkillHandlers,
    InverseModifierHandler,
    ProductModifierHandler,
    SkillFilterHandler,
    TickHandicapHandler,
} from "module/actor/modifiers/ActorModifierHandlers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { ActorSplinterpointsHandler, SplinterpointsHandler } from "module/actor/modifiers/SplinterpointsHandler";
import { derivedAttributes, type SplittermondDerivedAttribute } from "module/config/attributes";
import { Expression, pow } from "module/modifiers/expressions/scalar";
import { foundryApi } from "module/api/foundryApi";
import SplittermondItem from "module/item/item";

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
    [
        "initiativewoundmalus",
        "woundmalus",
        "woundmalus.nbrLevels",
        "woundmalus.levelmod",
        "woundmalus.mod",
        "focusregeneration.bonus",
        "healthregeneration.bonus",
    ].forEach((segment) => {
        const fullId = `actor.${segment}` as Lowercase<string>;
        registry.addHandler(segment, BasicModifierHandler(segment, fullId));
        registry.addHandler(fullId, BasicModifierHandler(fullId));
    });
    registry.addHandler("tickmalus", TickHandicapHandler("tickmalus"));
    registry.addHandler("handicap", TickHandicapHandler("handicap"));
    registry.addHandler("bonuscap", BasicModifierHandler("bonuscap"));
    derivedAttributes.forEach((slug) => {
        const segment = `${slug}.multiplier`;
        const fullId = `actor.${segment}` as Lowercase<string>;
        registry.addHandler(segment, ProductModifierHandler(segment, fullId, pow));
        registry.addHandler(fullId, ProductModifierHandler(fullId, fullId, pow));
    });
    ["focusregeneration", "healthregeneration"].forEach((slug) => {
        const segment = `${slug}.multiplier`;
        const fullId = `actor.${segment}` as Lowercase<string>;
        registry.addHandler(segment, ProductModifierHandler(segment, fullId));
        registry.addHandler(fullId, ProductModifierHandler(fullId));
    });
    const damageReduction = "damagereduction";
    registry.addHandler("sr", BasicModifierHandler("sr", damageReduction));
    registry.addHandler(damageReduction, BasicModifierHandler(damageReduction));
    splittermond.damageTypes.forEach((damageType) => {
        [`resistance.${damageType}`, `weakness.${damageType}`].forEach((segment) => {
            registry.addHandler(segment, BasicModifierHandler(segment));
        });
    });
}

export function addDerivedValueHandlers(registry: ModifierRegistry<ScalarModifier>) {
    const standardAdder = using(registry, BasicModifierHandler);
    derivedAttributes.filter((attr) => attr !== "initiative").forEach((da) => standardAdder.addForValue(da));
    using(registry, InverseModifierHandler).addForValue("initiative");
}

type HandlerConstructor = (
    arg0: string,
    arg1?: Lowercase<string>
) => {
    new (
        logError: (...messages: string[]) => void,
        sourceItem: SplittermondItem,
        type: ModifierType,
        multiplier: Expression
    ): ModifierHandler<ScalarModifier>;
};
function using(registry: ModifierRegistry<ScalarModifier>, handler: HandlerConstructor) {
    return {
        addForValue(attr: SplittermondDerivedAttribute) {
            const basePath = `splittermond.derivedAttribute.${attr}`;
            const shortForm = foundryApi.localize(`${basePath}.short`);
            const longForm = foundryApi.localize(`${basePath}.long`);
            registry.addHandler(attr, handler(attr));
            registry.addHandler(shortForm, handler(shortForm, attr));
            try {
                registry.addHandler(longForm, handler(longForm, attr));
            } catch (_) {
                //ignore errors from long form already registered
            }
        },
    };
}
