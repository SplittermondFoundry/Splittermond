import type SplittermondActor from "module/actor/actor";
import { splittermond } from "module/config";
import type { GenericRollEvaluation } from "./GenericRollEvaluation";
import type { SplittermondSkill } from "module/config/skillGroups";

export const successStates = ["devastating", "failure", "nearmiss", "success", "outstanding"] as const;
export type CheckSuccessState = (typeof successStates)[number];
type ModifyEvaluationInput = GenericRollEvaluation & { skill: SplittermondSkill; type: string };
export function modifyEvaluation(checkReport: ModifyEvaluationInput, actor: SplittermondActor): GenericRollEvaluation {
    const successState = getSuccessAttributes(checkReport);
    const checkModifiers = actor.modifier
        .getForId("check.result")
        .notSelectable()
        .withAttributeValues("category", successState)
        .withAttributeValuesOrAbsent("skill", checkReport.skill)
        .getModifiers();
    return {
        ...checkReport,
        degreeOfSuccess: {
            fromRoll: checkReport.degreeOfSuccess.fromRoll,
            modification: checkReport.degreeOfSuccess.modification + checkModifiers.sum,
        },
    };
}

function getSuccessAttributes(checkReport: GenericRollEvaluation): CheckSuccessState {
    if (checkReport.degreeOfSuccess.fromRoll >= splittermond.check.degreeOfSuccess.criticalSuccessThreshold) {
        return successStates[4];
    } else if (checkReport.succeeded) {
        return successStates[3];
    } else if (checkReport.degreeOfSuccess.fromRoll === 0 && !checkReport.succeeded) {
        return successStates[2];
    } else if (
        checkReport.degreeOfSuccess.fromRoll <= splittermond.check.degreeOfSuccess.criticalFailureThreshold ||
        checkReport.isFumble
    ) {
        return successStates[0];
    } else {
        return successStates[1];
    }
}
