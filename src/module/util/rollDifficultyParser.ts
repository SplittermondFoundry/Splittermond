import { splittermond } from "module/config";

type RollDifficultyDefense = "VTD" | "KW" | "GW";
type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/**Represents integer values from 0 to 999 as string literal types, Difficulties in the hundreds are already ludicrous */
type DifficultyInteger = `${Digit}` | `${Digit}${Digit}` | `${Digit}${Digit}${Digit}`;
export type RollDifficultyString = DifficultyInteger | RollDifficultyDefense;
type RollDifficultyType = RollDifficultyDefense | number;

export function parseRollDifficulty(input: unknown) {
    if (input instanceof RollDifficulty) {
        return input;
    } else {
        return new RollDifficulty(input);
    }
}

class RollDifficulty {
    _difficulty: RollDifficultyType;
    evaluatedDifficulty: number;

    constructor(difficulty: unknown) {
        this._difficulty = this.toRollDifficultyString(difficulty);
        this.evaluatedDifficulty = 0;
    }

    toRollDifficultyString(value: unknown): RollDifficultyType {
        if (typeof value === "number" && Number.isInteger(value)) {
            return value;
        } else if (typeof value == "string" && this.isTargetDependentValue(value)) {
            return value;
        } else {
            const parsedValue = parseInt(`${value}`);
            return isNaN(parsedValue) ? splittermond.check.defaultDifficulty : parsedValue;
        }
    }

    isTargetDependentValue(candidate: string): candidate is RollDifficultyDefense {
        return ["VTD", "KW", "GW"].includes(candidate);
    }

    evaluate(target: {
        actor: {
            derivedValues: {
                defense: { value: number };
                bodyresist: { value: number };
                mindresist: { value: number };
            };
        };
    }) {
        switch (this._difficulty) {
            case "VTD":
                this.evaluatedDifficulty = target.actor.derivedValues.defense.value;
                break;
            case "KW":
                this.evaluatedDifficulty = target.actor.derivedValues.bodyresist.value;
                break;
            case "GW":
                this.evaluatedDifficulty = target.actor.derivedValues.mindresist.value;
                break;
            default:
                this.evaluatedDifficulty = this.difficulty;
        }
    }

    get difficulty(): number {
        if (this.evaluatedDifficulty) {
            return this.evaluatedDifficulty;
        } else if (Number.isInteger(this._difficulty)) {
            return this._difficulty as number;
        } else {
            return splittermond.check.defaultDifficulty;
        }
    }
}
