
export type TimeUnit = typeof timeUnits[number];
const timeUnits = ["T", "min"] as const;
const relativeDurations: Record<TimeUnit,number> = {
    "T": 1,
    "min": 120,
}

export const time = {
    timeUnits,
    relativeDurations
}