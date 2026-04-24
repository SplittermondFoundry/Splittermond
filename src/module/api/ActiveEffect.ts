import { DataModel } from "./DataModel";

/**
 * Minimal type declaration for Foundry's ActiveEffect document class.
 * Mirrors the pattern used by other API types (e.g. {@link FoundryChatMessage}).
 */
declare class _FoundryActiveEffect extends DataModel<any, any> {
    readonly id: string;
    readonly uuid: string;
    readonly parent: FoundryDocument;
    readonly name: string;
    readonly origin: string;
    readonly transfer: boolean;
    readonly disabled: boolean;
    readonly changes: Array<{
        key: string;
        value: string;
        mode: number;
    }>;

    get isSuppressed(): boolean;

    /** The source item, if this effect was transferred from an item. */
    get item(): Item | undefined;

    getFlag(scope: string, key: string): unknown;
    setFlag(scope: string, key: string, value: unknown): Promise<_FoundryActiveEffect>;

    update(data: object, context?: any): Promise<_FoundryActiveEffect>;

    static defineSchema(): object;
}

// @ts-ignore -- ActiveEffect is a Foundry global
export const FoundryActiveEffect: typeof _FoundryActiveEffect = ActiveEffect;
export type FoundryActiveEffect = _FoundryActiveEffect;
