/**
 * WARNING: DO NOT CHANGE THIS FILE UNLESS YOU ALSO CHANGE THE HANDLEBARS TEMPLATE
 */

/**
 * Available actions as specified in spell-chat-card.hbs
 */
const availableActions = [
    "activeDefense",
    "applyDamage",
    "consumeCosts",
    "advanceToken",
    "useSplinterpoint",
    "rollMagicFumble",
] as const;
export type AvailableActions = (typeof availableActions)[number];

export function isAvailableAction(action: string): action is AvailableActions {
    return (availableActions as readonly string[]).includes(action);
}

export interface SpellRollMessageRenderedData {
    header: {
        title: string;
        img: string;
        rollTypeMessage: string;
        difficulty: string;
        hideDifficulty: boolean;
    };
    rollResultClass: string;
    rollResult: {
        rollTotal: number;
        skillAndModifierTooltip: { type: string; classes: string; value: string; description: string }[];
        rollTooltip: string;
        actionDescription: string;
    };
    degreeOfSuccessDisplay: {
        degreeOfSuccessMessage: string;
        totalDegreesOfSuccess: number;
        usedDegreesOfSuccess: number;
        openDegreesOfSuccess: number;
    };
    degreeOfSuccessOptions: SpellDegreesOfSuccessRenderedData[];
    actions: Partial<Record<AvailableActions, object>>;
}

interface SpellDegreesOfSuccessRenderedData {
    id: string;
    text: string;
    action: string;
    checked: boolean;
    disabled: boolean;
    multiplicity: string;
}

export interface DegreeOfSuccessOption {
    checked: boolean;
    disabled: boolean;
    action: string;
    multiplicity: string;
    text: string;
}
