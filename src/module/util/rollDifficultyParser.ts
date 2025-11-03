type RollDifficultyDefense = "VTD" | "KW" | "GW";
export type RollDifficultyString = number | RollDifficultyDefense;

export function parseRollDifficulty(input: unknown) {
    if (input instanceof RollDifficulty) {
        return input;
    } else {
        return new RollDifficulty(input);
    }
}

class RollDifficulty {
    defaultDifficulty = 15;
    _difficulty: RollDifficultyString;
    evaluatedDifficulty: number;

    constructor(difficulty: unknown) {
        this._difficulty = difficulty as RollDifficultyString;
        if (!this.isRollDifficultyString()) {
            this._difficulty = this.defaultDifficulty;
        }
        this.evaluatedDifficulty = 0;
    }

    isRollDifficultyString() {
        return this.isTargetDependentValue || Number.isInteger(this._difficulty);
    }

    isTargetDependentValue() {
        return ["VTD", "KW", "GW"].includes(this._difficulty as string);
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
            return this.defaultDifficulty;
        }
    }
}
