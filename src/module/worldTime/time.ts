import { splittermond } from "module/config";

export const SECONDS_PER_DAY = 24 * 60 * 60;
export const DAYS_PER_YEAR = 365;
export const SECONDS_PER_YEAR = DAYS_PER_YEAR * SECONDS_PER_DAY;

export const timeSteps = [
    60, 300, 900, 1800, 3600, 10800, 21600, 28800, 43200, 86400, 259200, 604800, 2592000,
] as const;
export const quickTimeSteps = [60, 300, 1800, 21600] as const;

export interface WorldTimeComponents {
    year: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

export function splitWorldTime(seconds: number): WorldTimeComponents {
    const year = Math.floor(seconds / SECONDS_PER_YEAR);
    const inYear = seconds - year * SECONDS_PER_YEAR;
    return {
        year,
        day: Math.floor(inYear / SECONDS_PER_DAY),
        hour: Math.floor((inYear % SECONDS_PER_DAY) / 3600),
        minute: Math.floor((inYear % 3600) / 60),
        second: inYear % 60,
    };
}

export function joinWorldTime(time: WorldTimeComponents): number | null {
    const { year, day, hour, minute, second } = time;
    if (
        !Number.isSafeInteger(year) ||
        !Number.isInteger(day) ||
        day < 0 ||
        day >= DAYS_PER_YEAR ||
        !Number.isInteger(hour) ||
        hour < 0 ||
        hour >= 24 ||
        !Number.isInteger(minute) ||
        minute < 0 ||
        minute >= 60 ||
        !Number.isFinite(second) ||
        second < 0 ||
        second >= 60
    )
        return null;
    const result = year * SECONDS_PER_YEAR + day * SECONDS_PER_DAY + hour * 3600 + minute * 60 + second;
    return validWorldTime(result) ? result : null;
}

export function validWorldTime(seconds: number): boolean {
    // Leave enough precision for half-second ticks, including when rewinding before the epoch.
    return Number.isFinite(seconds) && Math.abs(seconds) <= Number.MAX_SAFE_INTEGER / 2;
}

export function secondsPerTick(): number {
    return 60 / splittermond.time.relativeDurations.min;
}

export function elapsedCombatSeconds(
    previousTick: number | null,
    currentTick: number | null,
    pauseTick: number
): number {
    if (
        previousTick === null ||
        currentTick === null ||
        !Number.isFinite(previousTick) ||
        !Number.isFinite(currentTick) ||
        previousTick >= pauseTick ||
        currentTick >= pauseTick
    )
        return 0;
    return (Math.round(currentTick) - Math.round(previousTick)) * secondsPerTick();
}
