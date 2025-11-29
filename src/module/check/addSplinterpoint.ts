import type { CheckReport } from "module/check/CheckReport";
import { evaluateCheck } from "module/check/dice";

export async function addSplinterpointBonus<T extends CheckReport>(
    checkReport: T,
    splinterPointBonus: number
): Promise<T> {
    checkReport.roll.total += splinterPointBonus;
    const updatedReport = await evaluateCheck(
        Promise.resolve(checkReport.roll),
        checkReport.skill.points,
        checkReport.difficulty,
        checkReport.rollType
    );
    return {
        ...checkReport,
        ...updatedReport,
        roll: { ...updatedReport.roll, tooltip: checkReport.roll.tooltip },
        degreeOfSuccess: {
            fromRoll: updatedReport.degreeOfSuccess.fromRoll,
            modification: checkReport.degreeOfSuccess.modification,
        },
    };
}
