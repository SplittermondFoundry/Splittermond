import { splittermond } from "module/config";
import type { DefenseType } from "module/actor/actor";

type RollDifficultyDefense = "VTD" | "KW" | "GW";
export type RollDifficultyType = RollDifficultyDefense | number;

export function parseRollDifficulty(input: string): RollDifficulty {
    return new RollDifficulty(input);
}

class RollDifficulty {
    private _difficulty: RollDifficultyType;
    evaluatedDifficulty: number;

    constructor(difficulty: string) {
        this._difficulty = this.toRollDifficultyString(difficulty);
        this.evaluatedDifficulty = 0;
    }

    get defenseType(): DefenseType | null {
        return typeof this._difficulty === "number"
            ? null
            : (this._difficulty.toLowerCase() as Lowercase<RollDifficultyDefense>);
    }

    toRollDifficultyString(value: unknown): RollDifficultyType {
        if (typeof value === "number" && Number.isInteger(value)) {
            return value;
        } else if (typeof value == "string" && this._isTargetDependentValue(value)) {
            return value;
        } else {
            const parsedValue = parseInt(`${value}`);
            return isNaN(parsedValue) ? splittermond.check.defaultDifficulty : parsedValue;
        }
    }

    isTargetDependentValue() {
        return this._isTargetDependentValue(this._difficulty as string);
    }

    private _isTargetDependentValue(candidate: string): candidate is RollDifficultyDefense {
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
