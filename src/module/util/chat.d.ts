import type {User} from "../api/foundryTypes";

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

export function prepareStatusEffectMessage(
    actor: SplittermondActor,
    data: StatusEffectMessageData
): Promise<StatusEffectMessageResult>;