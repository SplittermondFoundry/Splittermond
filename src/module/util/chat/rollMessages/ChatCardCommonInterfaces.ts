/**
 * Common interfaces shared between different chat card types (spell, attack, etc.)
 */

import type { DegreeOfSuccessDisplay } from "module/util/chat/renderDegreesOfSuccess";

/**
 * Common header structure for chat cards
 */
export interface ChatCardHeader {
    title: string;
    img: string;
    rollTypeMessage: string;
    difficulty: string;
    hideDifficulty: boolean;
}

/**
 * Common roll result structure for chat cards
 */
export interface ChatCardRollResult {
    rollTotal: number;
    skillAndModifierTooltip: { type: string; classes: string; value: string; description: string }[];
    rollTooltip: string;
    actionDescription: string | null;
}

/**
 * Base structure for degree of success options rendered data
 */
export interface ChatCardDegreeOfSuccessRenderedData {
    id: string;
    text: string;
    action: string;
    checked: boolean;
    disabled: boolean;
    multiplicity: string;
}

/**
 * Base structure for degree of success options
 */
export interface ChatCardDegreeOfSuccessOption {
    checked: boolean;
    disabled: boolean;
    action: string;
    multiplicity: string;
    text: string;
}

/**
 * Base interface for chat card rendered data
 */
export interface BaseChatCardRenderedData {
    header: ChatCardHeader;
    rollResultClass: string;
    rollResult: ChatCardRollResult;
    degreeOfSuccessDisplay: DegreeOfSuccessDisplay;
}
