import type { User } from "../api/foundryTypes";
import type { VirtualToken } from "module/combat/VirtualToken";
import type SplittermondActor from "module/actor/actor";
import type { CheckReport } from "module/check";

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

export async function calculateDefenseTickCost(data: CheckReport, totalDegreeOfSuccess: number): number {}

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
