import { foundryApi } from "module/api/foundryApi";
import { DAYS_PER_YEAR, SECONDS_PER_DAY, SECONDS_PER_YEAR, splitWorldTime } from "./time";

const timeFields = [
    { name: "year", step: 1, seconds: SECONDS_PER_YEAR },
    { name: "day", min: 0, max: DAYS_PER_YEAR - 1, step: 1, seconds: SECONDS_PER_DAY },
    { name: "hour", min: 0, max: 23, step: 1, seconds: 3600 },
    { name: "minute", min: 0, max: 59, step: 1, seconds: 60 },
    { name: "second", min: 0, max: 59.5, step: 0.5, seconds: 0.5 },
] as const;

export function timeFieldContexts(seconds: number) {
    const time = splitWorldTime(seconds);
    return timeFields.map((field) => {
        const label = foundryApi.localize(`splittermond.worldTime.${field.name}`);
        return {
            ...field,
            label,
            value: time[field.name],
            increaseLabel: foundryApi.format("splittermond.worldTime.increaseField", { unit: label }),
            decreaseLabel: foundryApi.format("splittermond.worldTime.decreaseField", { unit: label }),
        };
    });
}

export function formatWorldTime(seconds: number): string {
    const time = splitWorldTime(seconds);
    return foundryApi.format(`splittermond.worldTime.${time.year === 0 ? "date" : "dateWithYear"}`, {
        year: String(time.year),
        day: String(time.day),
        hour: String(time.hour).padStart(2, "0"),
        minute: String(time.minute).padStart(2, "0"),
    });
}

export function timeStepLabel(seconds: number): string {
    const unit = seconds < 3600 ? "minutes" : seconds < 86400 ? "hours" : "days";
    const divisor = unit === "minutes" ? 60 : unit === "hours" ? 3600 : 86400;
    return foundryApi.format(`splittermond.worldTime.${seconds === 86400 ? "oneDay" : unit}`, {
        value: String(seconds / divisor),
    });
}

export function timeStepContext(seconds: number) {
    const label = timeStepLabel(seconds);
    return {
        seconds,
        label,
        advanceLabel: foundryApi.format("splittermond.worldTime.advance", { time: label }),
        rewindLabel: foundryApi.format("splittermond.worldTime.rewind", { time: label }),
    };
}
