import type { TimeUnit } from "module/config/timeUnits";
import { splittermond } from "module/config";

export function getTimeUnitConversion(from: TimeUnit, to: TimeUnit): number {
    return splittermond.time.relativeDurations[from] / splittermond.time.relativeDurations[to];
}

export function isMember<T>(collection: Readonly<T[]>, member: unknown): member is T {
    return collection.includes(member as T);
}
