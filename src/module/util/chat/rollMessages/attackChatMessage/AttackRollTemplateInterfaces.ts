/**
 * WARNING: DO NOT CHANGE THIS FILE UNLESS YOU ALSO CHANGE THE HANDLEBARS TEMPLATE
 */

import { isMember } from "module/util/util";
import type {
    BaseChatCardRenderedData,
    ChatCardDegreeOfSuccessOption,
    DegreeOfSuccessOptionsPartialData,
} from "module/util/chat/rollMessages/ChatCardCommonInterfaces";

/**
 * Available actions as specified in attack-chat-card.hbs
 */
const availableActions = ["activeDefense", "applyDamage", "advanceToken", "useSplinterpoint", "rollFumble"] as const;
export type AvailableActions = (typeof availableActions)[number];

export function isAvailableAction(action: string): action is AvailableActions {
    return isMember(availableActions, action);
}

export interface AttackRollMessageRenderedData extends BaseChatCardRenderedData {
    maneuvers: Array<{
        name: string;
        description: string;
    }>;
    degreeOfSuccessOptions: DegreeOfSuccessOptionsPartialData;
    actions: Partial<Record<AvailableActions, object>>;
}

export interface DegreeOfSuccessOption extends ChatCardDegreeOfSuccessOption {}
