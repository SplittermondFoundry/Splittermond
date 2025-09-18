const defaultDifficulty = 15;

/**
 * @param {unknown} input
 */
export function parseRollDifficulty(input) {
    if (!input) {
        return new RollDifficulty(defaultDifficulty);
    } else if (input instanceof RollDifficulty) {
        return input;
    } else {
        return new RollDifficulty(coerceToRollDifficulty(input));
    }
}

/**
 * @param {unknown} difficulty
 * @return {RollDifficultyString}
 */
function coerceToRollDifficulty(difficulty) {
    if (isRollDifficulty(difficulty)) {
        return difficulty;
    }
    return defaultDifficulty;
}

/**
 * @param {unknown} difficulty
 * @return {boolean}
 */
function isRollDifficulty(difficulty) {
    return isTargetDependentDifficulty(difficulty) || !isNaN(parseInt(difficulty));
}

function isTargetDependentDifficulty(value) {
    return ["VTD", "KW", "GW"].includes(value);
}

class RollDifficulty {
    /**@param {RollDifficultyString} difficulty */
    constructor(difficulty) {
        this.defaultDifficulty = 15;
        this._difficulty = difficulty;
        this.evaluatedDifficulty = 0;
    }

    isTargetDependentValue() {
        return isTargetDependentDifficulty(this._difficulty);
    }

    /**
     * @param {{actor:{derivedValues:{defense: number, bodyresist:number, mindresist:number}}}} target
     */
    evaluate(target) {
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

    /**
     * @return {RollDifficultyString}
     */
    get difficulty() {
        if (this.evaluatedDifficulty) {
            return this.evaluatedDifficulty;
        } else if (Number.isInteger(Number.parseInt(this._difficulty))) {
            return `${this._difficulty}`;
        } else {
            return defaultDifficulty;
        }
    }
}
