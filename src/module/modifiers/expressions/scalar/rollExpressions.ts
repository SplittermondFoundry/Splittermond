/**
 * Masks the time it actually takes to evaluate a roll, by returning a cheap intermediary, or
 * the last value when that current roll has not yet finished.
 */
import {Die, FoundryRoll} from "module/api/Roll";
import {mapRoll} from "./rollTermMapper";
import {evaluate} from "./evaluation";

/**
 * Masks the time it actually takes to evaluate a roll, by returning a cheap intermediary, or
 * the last value when that current roll has not yet finished.
 */
export class RollExpression {
    private result: number | null = null;
    private evaluating: boolean = false;

    constructor(public readonly value: FoundryRoll) {
        this.requestProperEvaluation();
    }


    evaluate(): number {
        if (this.result === null) {
            console.debug(`Splittermond | Evaluation of roll ${this.value.formula} did not yet return. Using a cheap evaluation method.`)
            return this.cheapPreliminaryValue();
        }
        const lastResult = this.result;
        this.requestProperEvaluation();
        return lastResult;
    }

    private requestProperEvaluation() {
        if (this.evaluating) {
            return;
        }

        this.evaluating = true;
        const result = this.trySyncEvaluate();
        if (result.success) {
            this.result = result.result;
            this.evaluating = false;
            return;
        } else {
            this.value.clone().evaluate().then(result => {
                this.result = result.total
                this.evaluating = false;
            });
        }
    }

    private trySyncEvaluate() {
        try {
            const result = this.value.clone().evaluateSync({strict: true});
            return {result: result.total, success: true};
        } catch (e) {
            return {result: null, success: false};
        }
    }

    private cheapPreliminaryValue() {
        if (this.value.terms.length == 1 && "faces" in this.value.terms[0]) {
            const term = this.value.terms[0];
            if(term.modifiers && term.modifiers.length > 0){
                console.debug("Splittermond | Encountered Dice modifiers. These are ignored for preliminary evaluations.")
            }
            return this.evaluateDiceTerm(term)
        }
        const mappedRoll = mapRoll(this.value);
        return evaluate(mappedRoll);
    }

    protected evaluateDiceTerm(term: Die) {
        return Array.from({length: term.number}, () => this.cheapDiceThrow(term.faces))
            .reduce((a, b) => a + b, 0);
    }

    protected cheapDiceThrow(faces: number) {
        const minDiceValue = 1
        return Math.floor(Math.random() * (faces - minDiceValue + 1)) + minDiceValue;
    }
}

