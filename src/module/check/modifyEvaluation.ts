import type SplittermondActor from "module/actor/actor";
import { splittermond } from "module/config";
import type { SplittermondSkill } from "module/config/skillGroups";
import type { CheckType } from "module/check/CheckModifierHandler";
import type { DegreeOfSuccessContainer, GenericRollEvaluation } from "module/check/types";

export const successStates = ["devastating", "failure", "nearmiss", "success", "outstanding"] as const;
export type CheckSuccessState = (typeof successStates)[number];
type ModifyEvaluationInput = GenericRollEvaluation & {
    skill: SplittermondSkill;
    type: CheckType;
};
export function totalDegreesOfSuccess(rollEval: DegreeOfSuccessContainer) {
    return rollEval.degreeOfSuccess.fromRoll + rollEval.degreeOfSuccess.modification;
}
export async function modifyEvaluation(
    checkReport: ModifyEvaluationInput,
    actor: SplittermondActor
): Promise<GenericRollEvaluation> {
    const limitedCheck = limitUnfamiliarSkillSuccessForPlayers(checkReport, actor);

    const successState = getSuccessAttributes(checkReport);
    const checkModifiers = actor.modifier
        .getForId("check.result")
        .notSelectable()
        .withAttributeValues("category", ...successState)
        .withAttributeValuesOrAbsent("skill", checkReport.skill)
        .withAttributeValuesOrAbsent("checkType", checkReport.type)
        .getModifiers();
    return {
        ...limitedCheck,
        degreeOfSuccess: {
            ...limitedCheck.degreeOfSuccess,
            fromRoll: limitedCheck.degreeOfSuccess.fromRoll,
            modification: limitedCheck.degreeOfSuccess.modification + (await checkModifiers.sum()),
        },
    };
}
function limitUnfamiliarSkillSuccessForPlayers(checkReport: ModifyEvaluationInput, actor: SplittermondActor) {
    const newReport = { ...checkReport, degreeOfSuccess: { ...checkReport.degreeOfSuccess } };
    if (actor.type === "character") {
        const actorSkillPoints = actor.system.skills[newReport.skill].points;
        if (actorSkillPoints < 1) {
            newReport.degreeOfSuccess.fromRoll = Math.min(newReport.degreeOfSuccess.fromRoll, 0);
            newReport.degreeOfSuccess.limitedTo = 0;
        }
    }
    return newReport;
}

function getSuccessAttributes(checkReport: GenericRollEvaluation): CheckSuccessState[] {
    if (checkReport.degreeOfSuccess.fromRoll >= splittermond.check.degreeOfSuccess.criticalSuccessThreshold) {
        return [successStates[4], successStates[3]];
    } else if (checkReport.succeeded) {
        return [successStates[3]];
    } else if (checkReport.degreeOfSuccess.fromRoll === 0 && !checkReport.succeeded) {
        return [successStates[2]];
    } else if (
        checkReport.degreeOfSuccess.fromRoll <= splittermond.check.degreeOfSuccess.criticalFailureThreshold ||
        checkReport.isFumble
    ) {
        return [successStates[0], successStates[1]];
    } else {
        return [successStates[1]];
    }
}
