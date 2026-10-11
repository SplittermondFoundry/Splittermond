import { ModifierRegistry } from "module/modifiers";
import { ActorSkillHandler, SkillHandler } from "module/actor/modifiers/SkillHandler";
import { splittermond } from "module/config";
import {
    BasicModifierHandler,
    EmphasisAwareBasicHandler,
    IndividualSkillHandlers,
    InverseModifierHandler,
    ProductModifierHandler,
    SkillFilterHandler,
    TickHandicapHandler,
} from "module/actor/modifiers/ActorModifierHandlers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { ActorSplinterpointsHandler, SplinterpointsHandler } from "module/actor/modifiers/SplinterpointsHandler";
import { isResourcePoints, registerResourcePointsHandlers } from "module/actor/modifiers/ResourcePointsHandler";
import { derivedAttributes } from "module/config/attributes";
import { modifierChoices } from "module/modifiers/ModifierConfig";

export function registerActorModifiers(registry: ModifierRegistry<ScalarModifier>) {
    const lowerFumbleResultHandler = SkillFilterHandler({
        topLevelPath: "lowerfumbleresult",
        description: "splittermond.modifierHelper.descriptions.lowerfumbleresult",
        helperAttributes: {
            skill: { hint: "splittermond.modifierHelper.attributes.magicFumbleSkill", groupChoices: false },
        },
        attributeChoices: {
            skill: Object.entries(splittermond.spellSkillsOption).map(([value, label]) => ({ value, label })),
        },
    });
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
        "woundmalus.levelmod",
        "woundmalus.mod",
        "focusregeneration.bonus",
        "healthregeneration.bonus",
    ].forEach((segment) => {
        const fullId = `actor.${segment}` as Lowercase<string>;
        const options = { hideInHelper: segment === "woundmalus" };
        registry.addHandler(segment, BasicModifierHandler(segment, fullId, options));
        registry.addHandler(fullId, BasicModifierHandler(fullId, undefined, options));
    });
    const woundLevelPath = "actor.woundmalus.nbrLevels";
    const woundLevelChoices = modifierChoices(
        Object.keys(splittermond.woundMalus),
        (value) => `splittermond.modifierHelper.woundLevels.${value}`
    );
    for (const path of ["woundmalus.nbrLevels", woundLevelPath]) {
        registry.addHandler(path, BasicModifierHandler(path, woundLevelPath, { valueChoices: woundLevelChoices }));
    }
    registry.addHandler("tickmalus", TickHandicapHandler("tickmalus"));
    registry.addHandler("handicap", TickHandicapHandler("handicap"));
    registry.addHandler("bonuscap", BasicModifierHandler("bonuscap"));
    registry.addHandler("npcattacks", EmphasisAwareBasicHandler("npcattacks"));
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
        ["resistance", "weakness"].forEach((path) => {
            const segment = `${path}.${damageType}`;
            registry.addHandler(
                segment,
                BasicModifierHandler(segment, undefined, {
                    helperGroup: {
                        path,
                        attribute: "damageType",
                        choice: { value: damageType, label: `splittermond.damageTypes.long.${damageType}` },
                    },
                })
            );
        });
    });
    addDerivedValueHandlers(registry);
}

function addDerivedValueHandlers(registry: ModifierRegistry<ScalarModifier>) {
    derivedAttributes.forEach((slug) => {
        const segment = `${slug}.multiplier`;
        const fullId = `actor.${segment}` as Lowercase<string>;
        registry.addHandler(segment, ProductModifierHandler(segment, fullId));
        registry.addHandler(fullId, ProductModifierHandler(fullId, fullId));
    });
    derivedAttributes
        .filter((attr) => attr !== "initiative" && !isResourcePoints(attr))
        .forEach((da) => registry.addHandler(da, BasicModifierHandler(da)));
    registry.addHandler("initiative", InverseModifierHandler("initiative"));
    registerResourcePointsHandlers(registry);
}
