import { foundryApi } from "module/api/foundryApi";

export class MigrationReporter {
    private processed = 0;
    private readonly thresholds = [25, 50, 75] as const;
    private nextThresholdIdx = 0;

    constructor(
        private readonly total: number,
        private readonly i18nPrefix: string
    ) {}

    start(): void {
        foundryApi.informUser(`${this.i18nPrefix}.start`, { total: String(this.total) });
    }

    updateProcessed(increment: number = 1): void {
        this.processed += increment;
        while (this.nextThresholdIdx < this.thresholds.length && this.total > 0 && this.thresholdHit()) {
            foundryApi.informUser(`${this.i18nPrefix}.progress`, {
                percent: String(this.thresholds[this.nextThresholdIdx]),
                current: String(this.processed),
                total: String(this.total),
            });
            this.nextThresholdIdx += 1;
        }
    }

    stop(): void {
        foundryApi.informUser(`${this.i18nPrefix}.done`, { total: String(this.total) });
    }

    private thresholdHit(): boolean {
        return (this.processed / this.total) * 100 >= this.thresholds[this.nextThresholdIdx];
    }
}
