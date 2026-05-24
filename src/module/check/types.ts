import { RollType } from "module/config/check";

export interface DegreeOfSuccessContainer {
    degreeOfSuccess: {
        fromRoll: number;
        modification: number;
    };
}
interface RollResultForSplittermond {
    total: number;
    getTooltip(): Promise<string>;
    dice: { total: number }[];
}

export interface GenericRollEvaluation {
    difficulty: number;
    rollType: RollType;
    succeeded: boolean;
    isFumble: boolean;
    isCrit: boolean;
    degreeOfSuccess: {
        fromRoll: number;
        modification: number;
    };
    degreeOfSuccessMessage: string;
    roll: RollResultForSplittermond;
}
