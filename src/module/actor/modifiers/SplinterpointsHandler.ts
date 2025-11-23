import { makeConfig } from "module/modifiers";
import { SkillFilterHandler } from "module/actor/modifiers/ActorModifierHandlers";

export class SplinterpointsHandler extends BaseSplinterpointsHandler("splinterpoints", "actor.splinterpoints") {}
export class ActorSplinterpointsHandler extends BaseSplinterpointsHandler("actor.splinterpoints") {}
function BaseSplinterpointsHandler(topLevelPath: string, groupId?: string) {
    const config = makeConfig({
        topLevelPath: topLevelPath,
        subSegments: {
            bonus: {
                optionalAttributes: ["skill"],
            },
        },
    });
    return SkillFilterHandler(config, groupId);
}
