import { foundryApi } from "../api/foundryApi";
import { splittermond } from "module/config/index.js";

export const Dice = {
    check,
    evaluateCheck,
    riskModifier,
};

/**
 * @param {Skill} skill
 * @param {number} difficulty
 * @param {RollType} rollType
 * @param {number} skillModifier
 * @return {GenericRollEvaluation}
 */
export async function check(skill, difficulty, rollType = "standard", skillModifier = 0) {
    let rollFormula = `${splittermond.check.rollType[rollType].rollFormula} + @skillValue`;

    if (skillModifier) {
        rollFormula += " + @modifier";
    }
    let rollData = {
        skillValue: skill.value,
        modifier: skillModifier,
    };
    const roll = foundryApi.roll(rollFormula, rollData).evaluate();

    return await evaluateCheck(roll, skill.points, difficulty, rollType);
}

/**
 *
 * @param {Promise<{dice:{total:number}[], total:number}>} roll
 * @param skillPoints
 * @param {number} difficulty
 * @param rollType
 * @return {GenericRollEvaluation}
 */
export async function evaluateCheck(roll, skillPoints, difficulty, rollType) {
    roll = await roll;
    const difference = roll.total - difficulty;

    let degreeOfSuccess = Math.sign(difference) * Math.floor(Math.abs(difference / 3));
    degreeOfSuccess = skillPoints < 1 ? Math.min(degreeOfSuccess, 0) : degreeOfSuccess;
    const isFumble = rollType !== "safety" && roll.dice[0].total <= 3;
    const isCrit = roll.dice[0].total >= 19;
    const succeeded = difference >= 0 && !isFumble;
    degreeOfSuccess = isFumble
        ? Math.min(degreeOfSuccess + splittermond.check.degreeOfSuccess.fumblePenalty, -1)
        : degreeOfSuccess;
    degreeOfSuccess = degreeOfSuccess + (isCrit && succeeded ? splittermond.check.degreeOfSuccess.triumphBonus : 0);

    const degreeOfSuccessMessageModifier = Math.min(Math.abs(degreeOfSuccess), 5);
    let degreeOfSuccessMessage;
    if (isCrit) {
        degreeOfSuccessMessage = foundryApi.localize(`splittermond.critical`);
    } else if (isFumble) {
        degreeOfSuccessMessage = foundryApi.localize(`splittermond.fumble`);
    } else if (succeeded) {
        degreeOfSuccessMessage = foundryApi.localize(`splittermond.successMessage.${degreeOfSuccessMessageModifier}`);
    } else {
        degreeOfSuccessMessage = foundryApi.localize(`splittermond.failMessage.${degreeOfSuccessMessageModifier}`);
    }
    return {
        difficulty: difficulty,
        succeeded: succeeded,
        isFumble: isFumble,
        isCrit: isCrit,
        degreeOfSuccess: {
            fromRoll: degreeOfSuccess,
            modification: 0,
        },
        degreeOfSuccessMessage: degreeOfSuccessMessage,
        roll: roll,
    };
}

export function riskModifier() {
    if (this.results.length === 4) {
        const sortedResult = this.results
            .map((i) => {
                return {
                    result: i.result,
                    item: i,
                };
            })
            .sort((a, b) => {
                return a.result - b.result;
            });

        if (sortedResult[0].item.result < 2 && sortedResult[1].result < 3) {
            sortedResult[0].item.active = true;
            sortedResult[0].item.discarded = false;
            sortedResult[1].item.active = true;
            sortedResult[1].item.discarded = false;
            sortedResult[2].item.active = false;
            sortedResult[2].item.discarded = true;
            sortedResult[3].item.active = false;
            sortedResult[3].item.discarded = true;
        } else {
            sortedResult[0].item.active = false;
            sortedResult[0].item.discarded = true;
            sortedResult[1].item.active = false;
            sortedResult[1].item.discarded = true;
            sortedResult[2].item.active = true;
            sortedResult[2].item.discarded = false;
            sortedResult[3].item.active = true;
            sortedResult[3].item.discarded = false;
        }
    }

    if (this.results.length === 5) {
        // Grandmaster
        let sortedResult = this.results
            .slice(0, -1)
            .map((i) => {
                return {
                    result: i.result,
                    item: i,
                };
            })
            .sort((a, b) => {
                return a.result - b.result;
            });

        if (sortedResult[0].result < 2 && sortedResult[1].result < 3) {
            sortedResult[0].item.active = true;
            sortedResult[0].item.discarded = false;
            sortedResult[1].item.active = true;
            sortedResult[1].item.discarded = false;
            sortedResult[2].item.active = false;
            sortedResult[2].item.discarded = true;
            sortedResult[3].item.active = false;
            sortedResult[3].item.discarded = true;
            this.results[4].active = false;
            this.results[4].discarded = true;
        } else {
            let sortedResult = this.results
                .map((i) => {
                    return {
                        result: i.result,
                        item: i,
                    };
                })
                .sort((a, b) => {
                    return a.result - b.result;
                });
            sortedResult[0].item.active = false;
            sortedResult[0].item.discarded = true;
            sortedResult[1].item.active = false;
            sortedResult[1].item.discarded = true;
            sortedResult[2].item.active = false;
            sortedResult[2].item.discarded = true;
            sortedResult[3].item.active = true;
            sortedResult[3].item.discarded = false;
            sortedResult[4].item.active = true;
            sortedResult[4].item.discarded = false;
        }
    }

    if (this.results.length === 3) {
        // Grandmaster (Standard)
        let sortedResult = this.results
            .slice(0, -1)
            .map((i) => {
                return {
                    result: i.result,
                    item: i,
                };
            })
            .sort((a, b) => {
                return a.result - b.result;
            });

        if (sortedResult[0].result < 2 && sortedResult[1].result < 3) {
            sortedResult[0].item.active = true;
            sortedResult[0].item.discarded = false;
            sortedResult[1].item.active = true;
            sortedResult[1].item.discarded = false;
            this.results[2].active = false;
            this.results[2].discarded = true;
        } else {
            let sortedResult = this.results
                .map((i) => {
                    return {
                        result: i.result,
                        item: i,
                    };
                })
                .sort((a, b) => {
                    return a.result - b.result;
                });
            sortedResult[0].item.active = false;
            sortedResult[0].item.discarded = true;
            sortedResult[1].item.active = true;
            sortedResult[1].item.discarded = false;
            sortedResult[2].item.active = true;
            sortedResult[2].item.discarded = false;
        }
    }
}
