import type { CheckReport } from "module/check/CheckReport";
import { Dice } from "module/check/dice";
import { foundryApi } from "module/api/foundryApi";

export async function addSplinterpointBonus<T extends CheckReport>(
    checkReport: T,
    splinterPointBonus: number
): Promise<T> {
    checkReport.roll.total += splinterPointBonus;
    const updatedReport = await Dice.evaluateCheck(
        Promise.resolve(checkReport.roll),
        checkReport.difficulty,
        checkReport.rollType
    );
    checkReport.modifierElements.push({
        isMalus: false,
        value: `${splinterPointBonus}`,
        description: foundryApi.localize("splittermond.splinterpoint"),
    });
    return {
        ...checkReport,
        ...updatedReport,
        roll: { ...updatedReport.roll, tooltip: checkReport.roll.tooltip },
        degreeOfSuccess: {
            fromRoll: Math.min(updatedReport.degreeOfSuccess.fromRoll, checkReport.degreeOfSuccess.limitedTo),
            modification: checkReport.degreeOfSuccess.modification,
            limitedTo: checkReport.degreeOfSuccess.limitedTo,
        },
    };
}
