import { AvailableActions, DegreeOfSuccessOption } from "./AttackRollTemplateInterfaces";
import { CheckReport } from "module/check";
import { DegreeOfSuccessAction, DegreeOfSuccessOptionInput } from "../ChatMessageUtils";
import type {
    ActionHandler as CommonActionHandler,
    ActionInput as CommonActionInput,
} from "module/util/chat/rollMessages/ChatCardCommonInterfaces";

// Re-export shared types for local usage
export { DegreeOfSuccessAction, DegreeOfSuccessOptionInput };

export type AttackCheckReport = CheckReport & { grazingHitPenalty: number };

export interface Action {
    type: AvailableActions;
    disabled: boolean;
    isLocal: boolean;
}
export interface ValuedAction extends Action {
    type: "applyDamage" | "advanceToken" | "activeDefense" | "consumeCost";
    /** Text displayed on the  action button*/
    value: string;
    /**Only for the active defense action, should be value*/
    difficulty?: string;
}

export interface UnvaluedAction extends Action {
    type: "useSplinterpoint" | "rollFumble";
}

export interface DegreeOfSuccessOptionSuggestion {
    render: DegreeOfSuccessOption;
    /**
     * should be positive if the next user action is option selection
     * and negative if the next user acion on the option is deselection.
     */
    cost: number;
}

export type ActionHandler = CommonActionHandler<ValuedAction | UnvaluedAction, AvailableActions>;
export type ActionInput = CommonActionInput<AvailableActions>;
