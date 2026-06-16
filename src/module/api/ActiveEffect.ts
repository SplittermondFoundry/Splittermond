import { DataModel } from "./DataModel";

/**
 * Minimal type declaration for Foundry's ActiveEffect document class.
 * Mirrors the pattern used by other API types (e.g. {@link FoundryChatMessage}).
 */
declare class _FoundryActiveEffect extends FoundryDocument {
    readonly id: string;
    readonly uuid: string;
    readonly parent: FoundryDocument | undefined;
    readonly name: string;
    readonly origin: string;
    readonly transfer: boolean;
    readonly disabled: boolean;

    get isSuppressed(): boolean;

    /** The source item, if this effect was transferred from an item. */
    get item(): Item | null;

    /** The owning actor or parent of the owning item, if any */
    get actor(): Actor | null;

    duration: {
        value: number | null;
        units: string;
        expiry: string | null;
        expired: boolean;
        remaining: number;
        label: string;
        start?: { round?: number; turn?: number; time?: number };
    };

    static defineSchema(): object;
}

// @ts-ignore -- ActiveEffect is a Foundry global
export const FoundryActiveEffect: typeof _FoundryActiveEffect = ActiveEffect;
export type FoundryActiveEffect = _FoundryActiveEffect;

// @ts-ignore
export const FoundryActiveEffectTypeDataModel = foundry.data.ActiveEffectTypeDataModel as typeof DataModel;
