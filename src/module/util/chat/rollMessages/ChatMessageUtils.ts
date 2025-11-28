import { CheckReport } from "module/check";

/**
 * Gets CSS classes for roll result styling based on check report outcomes
 */
export function getRollResultClass(checkReport: CheckReport): string {
    const resultClasses = [];
    if (checkReport.isCrit) {
        resultClasses.push("critical");
    }
    if (checkReport.isFumble) {
        resultClasses.push("fumble");
    }
    if (checkReport.succeeded) {
        resultClasses.push("success");
    }
    return resultClasses.join(" ");
}
