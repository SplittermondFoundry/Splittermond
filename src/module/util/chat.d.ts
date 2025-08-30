import type {User} from "../api/foundryTypes";
import {foundryApi} from "../api/foundryApi";

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

export function canEditMessageOf(userId:string):boolean{}


export function prepareStatusEffectMessage(
    actor: SplittermondActor,
    data: StatusEffectMessageData
): Promise<StatusEffectMessageResult>;