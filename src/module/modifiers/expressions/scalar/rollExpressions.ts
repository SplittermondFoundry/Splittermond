import {FoundryRoll} from "module/api/Roll";

export class RollExpression {
    constructor(public readonly value: FoundryRoll) {
        this.requestProperEvaluation();
    }

    async evaluate(): Promise<number> {
        const evaluated = await this.value.clone().evaluate();
        return evaluated.total;
    }

    private result: number | null = null;
    private evaluating: boolean = false;

    /**
     * Backstop solution to support rolls in synchronous evaluation. This is not intended for normal operation.
     */
    evaluateSync(): number {
        console.warn("Splittermond | You have used a roll in a place that requires synchronous evaluation (e.g. actor derived Values). Expect degraded accuracy and, depending on your Roll resolver, pain!")
        const lastResult = this.result;
        this.requestProperEvaluation();
        return lastResult ?? 1;
    }

    private requestProperEvaluation() {
        if (this.evaluating) {
            return;
        }

        this.evaluating = true;
            this.evaluate()
                .then((result) => {
                    this.result = result;
                    this.evaluating = false;
                });
    }
}
