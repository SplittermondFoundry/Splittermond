import { AvailableActions, DegreeOfSuccessOption } from "./AttackRollTemplateInterfaces";

export interface Action {
    type: AvailableActions;
    disabled: boolean;
    isLocal: boolean;
}
export interface ValuedAction extends Action {
    type: "applyDamage" | "advanceToken" | "activeDefense";
    /** Text displayed on the  action button*/
    value: string;
    /**Only for the active defense action, should be value*/
    difficulty?: string;
}

export interface UnvaluedAction extends Action {
    type: "useSplinterpoint" | "rollFumble";
}

export interface DegreeOfSuccessOptionData {
    action: string;
    multiplicity: string;
}

export function isDegreeOfSuccessOptionData(data: unknown): data is DegreeOfSuccessOptionData {
    return !!data && typeof data === "object" && "action" in data && "multiplicity" in data;
}

export interface DegreeOfSuccessAction {
    usedDegreesOfSuccess: number;
    action: () => void;
}
export type DegreeOfSuccessOptionInput = Record<string, unknown> & { action: string };

export interface DegreeOfSuccessOptionSuggestion {
    render: DegreeOfSuccessOption;
    /**
     * should be positive if the next user action is option selection
     * and negative if the next user acion on the option is deselection.
     */
    cost: number;
}
export type ActionInput = Record<string, unknown> & { action: AvailableActions };
export interface ActionHandler {
    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[];
    renderActions(): (ValuedAction | UnvaluedAction)[];
    readonly handlesActions: readonly string[];
    readonly handlesDegreeOfSuccessOptions: readonly string[];

    useAction(actionData: ActionInput): Promise<void>;
    useDegreeOfSuccessOption(degreeOfSucccessOptionData: DegreeOfSuccessOptionInput): DegreeOfSuccessAction;
}
