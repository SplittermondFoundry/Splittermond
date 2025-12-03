import type { CheckReport } from "module/check";

type RenderCheckDegreesInput = Pick<CheckReport, "degreeOfSuccessMessage" | "degreeOfSuccess">;
export interface DegreeOfSuccessDisplay {
    degreeOfSuccessMessage: string;
    totalDegreesOfSuccess: number;
    usedDegreesOfSuccess: number;
    usedBonusDegreesOfSuccess: number;
    openDegreesOfSuccess: number;
    openBonusDegreesOfSuccess: number;
}
export function renderDegreesOfSuccess(
    checkReport: RenderCheckDegreesInput,
    openDegreesOfSuccess: number
): DegreeOfSuccessDisplay {
    return {
        degreeOfSuccessMessage: checkReport.degreeOfSuccessMessage,
        ...calculateDegreesOfSuccess(checkReport.degreeOfSuccess, openDegreesOfSuccess),
    };
}
type CheckDegreesInput = CheckReport["degreeOfSuccess"];
type CheckDegreeCategories = Omit<DegreeOfSuccessDisplay, "degreeOfSuccessMessage">;
function calculateDegreesOfSuccess(checkDegrees: CheckDegreesInput, openDegrees: number): CheckDegreeCategories {
    const degreesFromRoll = checkDegrees.fromRoll;
    const bonusDegrees = checkDegrees.modification;
    const totalDegreesOfSuccess = Math.max(0, degreesFromRoll + bonusDegrees);

    if (totalDegreesOfSuccess <= 0) {
        return {
            totalDegreesOfSuccess: degreesFromRoll + bonusDegrees,
            usedDegreesOfSuccess: 0,
            usedBonusDegreesOfSuccess: 0,
            openDegreesOfSuccess: 0,
            openBonusDegreesOfSuccess: 0,
        };
    }

    // Calculate how many degrees are "used" (not open)
    const allUsedDegrees = Math.max(0, totalDegreesOfSuccess - openDegrees);

    // Split used degrees into normal and bonus
    // Only count positive roll degrees as normal degrees
    const positiveRollDegrees = Math.max(0, degreesFromRoll);
    const usedDegreesOfSuccess = Math.min(allUsedDegrees, positiveRollDegrees);
    const usedBonusDegreesOfSuccess = allUsedDegrees - usedDegreesOfSuccess;

    // Calculate open degrees
    const totalOpenDegrees = totalDegreesOfSuccess - allUsedDegrees;

    // Split open degrees: prefer putting bonus degrees on open ones
    const remainingBonusDegrees = bonusDegrees - usedBonusDegreesOfSuccess;
    const openBonusDegreesOfSuccess = Math.min(remainingBonusDegrees, totalOpenDegrees);
    const openDegreesOfSuccess = totalOpenDegrees - openBonusDegreesOfSuccess;

    return {
        totalDegreesOfSuccess,
        usedDegreesOfSuccess,
        usedBonusDegreesOfSuccess,
        openDegreesOfSuccess,
        openBonusDegreesOfSuccess,
    };
}
