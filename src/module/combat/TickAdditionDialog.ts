import { FoundryDialog } from "module/api/Application";
import { type TimeUnit } from "module/config/timeUnits";
import { splittermond } from "module/config";
import { getTimeUnitConversion } from "module/util/util";
import { foundryApi } from "module/api/foundryApi";
import { IllegalStateException } from "module/data/exceptions";

export async function askUserForTickAddition(ticksToAdd: number, message: string): Promise<number> {
    const unit: TimeUnit = findLargestApplicableTimeUnit(ticksToAdd);
    const conversionFactor = getTimeUnitConversion("T", unit);
    const timeToAdd = getDisplayValue(ticksToAdd * conversionFactor);
    const enteredNumber = await FoundryDialog.prompt({
        classes: ["splittermond", "tick-addition-dialog"],
        window: {
            title: "splittermond.applications.addTickDialogue.title", //foundry translates this
        },
        content: `<p>${message}</p>
                  <div>
                    <input name="timeInput" type='number' class='ticks' value='${timeToAdd}'>
                    <label for="timeInput">${unit}</label>
                  </div>`,
        ok: {
            label: "splittermond.applications.addTickDialogue.okLabel", //foundry translates this
            callback: acceptTickIncrease,
        },
        rejectClose: true,
    }).catch(() => 0);
    if (!(typeof enteredNumber === "number" && isFinite(enteredNumber))) {
        foundryApi.reportError("splittermond.applications.addTickDialogue.invalidNumber");
        return ticksToAdd;
    }
    if (enteredNumber < 0) {
        foundryApi.warnUser("splittermond.applications.addTickDialogue.noNegativeNumbers");
        return ticksToAdd;
    }
    return Math.round(enteredNumber / conversionFactor);
}

function findLargestApplicableTimeUnit(ticks: number): TimeUnit {
    let lastUnit: TimeUnit = "T";
    for (const unit of splittermond.time.timeUnits) {
        const conversion = getTimeUnitConversion("T", unit as TimeUnit);
        const convertedValue = ticks * conversion;
        if (convertedValue <= 1) {
            break;
        }
        lastUnit = unit as TimeUnit;
    }
    return lastUnit;
}

function getDisplayValue(timeToAdd: number): string {
    return Number.isInteger(timeToAdd) ? `${timeToAdd}` : timeToAdd.toFixed(3);
}

function acceptTickIncrease(__: Event, button: HTMLButtonElement): number {
    const formElements = button.form?.elements;
    if (formElements && "timeInput" in formElements) {
        return (formElements.timeInput as HTMLInputElement).valueAsNumber;
    } else {
        console.error("Splittermond | Dialog form element timeInput not found");
        throw new IllegalStateException("Dialog form element timeInput not found");
    }
}
