import type { User } from "../api/foundryTypes";
import type { VirtualToken } from "module/combat/VirtualToken";
import type SplittermondActor from "module/actor/actor";
import type { DefenseType } from "module/actor/actor";
import type ActiveDefense from "module/actor/active-defense";

interface RollResultForSplittermond {
    total: number;
    getTooltip(): Promise<string>;
    dice: { total: number }[];
}

export interface StatusEffectMessageData {
    virtualToken: VirtualToken;
    activationNo: number;
    onTick: number;
    maxActivation: number;
}

export interface StatusEffectMessageResult {
    user: User;
    speaker: unknown;
    content: string;
    sound: string;
    type: number;
}

export const Chat: {
    canEditMessageOf: typeof canEditMessageOf;
    prepareCheckMessageData: typeof prepareCheckMessageData;
    prepareStatusEffectMessage: typeof prepareStatusEffectMessage;
};

export function canEditMessageOf(userId: string): boolean {}

export function calculateDefenseTickCost(
    data: { defenseType: DefenseType | null; itemData?: ActiveDefense },
    totalDegreeOfSuccess: number
): Promise<number>;

export function prepareCheckMessageData(
    actor: SplittermondActor,
    rollMode: string,
    roll: RollResultForSplittermond,
    data: Record<string, unknown>
): Promise<Record<string, unknown>> {}

export function prepareStatusEffectMessage(
    actor: SplittermondActor,
    data: StatusEffectMessageData
): Promise<StatusEffectMessageResult>;
