import { RollType } from "../config/RollType";

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
    degreeOfSuccess: number;
    degreeOfSuccessMessage: string;
    roll: RollResultForSplittermond;
}
