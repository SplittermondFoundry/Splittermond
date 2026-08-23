import { RollType } from "module/config/check";

export interface DegreeOfSuccessContainer {
    degreeOfSuccess: {
        fromRoll: number;
        modification: number;
        limitedTo: number;
    };
}
interface RollResultForSplittermond {
    total: number;
    getTooltip(): Promise<string>;
    dice: { total: number }[];
}

export interface GenericRollEvaluation extends DegreeOfSuccessContainer {
    difficulty: number;
    rollType: RollType;
    succeeded: boolean;
    isFumble: boolean;
    isCrit: boolean;
    degreeOfSuccessMessage: string;
    roll: RollResultForSplittermond;
}
