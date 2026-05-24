import type { DegreeOfSuccessContainer } from "module/check/types";
import { totalDegreesOfSuccess } from "module/check/modifyEvaluation";
import { splittermond } from "module/config";

export function isCritSuccess(degreesOfSuccess: DegreeOfSuccessContainer) {
    return totalDegreesOfSuccess(degreesOfSuccess) >= splittermond.check.degreeOfSuccess.criticalSuccessThreshold;
}

export function isCritFail(degreesOfSuccess: DegreeOfSuccessContainer) {
    return totalDegreesOfSuccess(degreesOfSuccess) <= splittermond.check.degreeOfSuccess.criticalFailureThreshold;
}
