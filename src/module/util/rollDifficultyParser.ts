import { splittermond } from "module/config";
import type { DefenseType } from "module/actor/actor";
import type { ExpressionBundle } from "module/util/util";

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

    async evaluate(target: {
        actor: {
            derivedValues: {
                defense: { value: ExpressionBundle };
                bodyresist: { value: ExpressionBundle };
                mindresist: { value: ExpressionBundle };
            };
        };
    }) {
        switch (this._difficulty) {
            case "VTD":
                this.evaluatedDifficulty = await target.actor.derivedValues.defense.value.calculate();
                break;
            case "KW":
                this.evaluatedDifficulty = await target.actor.derivedValues.bodyresist.value.calculate();
                break;
            case "GW":
                this.evaluatedDifficulty = await target.actor.derivedValues.mindresist.value.calculate();
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
