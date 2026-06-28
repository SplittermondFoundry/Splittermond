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
    const successState = getSuccessAttributes(checkReport);
    const checkModifiers = actor.modifier
        .getForId("check.result")
        .notSelectable()
        .withAttributeValues("category", ...successState)
        .withAttributeValuesOrAbsent("skill", checkReport.skill)
        .withAttributeValuesOrAbsent("checkType", checkReport.type)
        .getModifiers();
    return {
        ...checkReport,
        degreeOfSuccess: {
            fromRoll: checkReport.degreeOfSuccess.fromRoll,
            modification: checkReport.degreeOfSuccess.modification + (await checkModifiers.sum()),
        },
    };
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
