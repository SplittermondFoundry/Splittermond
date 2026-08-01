const DURATION_UNIT_CHOICES = {
    rounds: "splittermond.activeEffect.duration.unitTicks",
    minutes: "splittermond.activeEffect.duration.unitMinutes",
    hours: "splittermond.activeEffect.duration.unitHours",
    days: "splittermond.activeEffect.duration.unitDays",
    weeks: "splittermond.activeEffect.duration.unitWeeks",
    months: "splittermond.activeEffect.duration.unitMonths",
} as const;

export type DurationUnit = keyof typeof DURATION_UNIT_CHOICES;

export const activeEffect = {
    duration: {
        unitChoices: DURATION_UNIT_CHOICES,
    }
}as const;
