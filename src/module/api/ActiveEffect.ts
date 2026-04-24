/**
 * Minimal type declaration for Foundry's ActiveEffect document class.
 * Mirrors the pattern used by other API types (e.g. {@link FoundryChatMessage}).
 */
export declare class FoundryActiveEffect extends FoundryDocument {
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
    setFlag(scope: string, key: string, value: unknown): Promise<FoundryActiveEffect>;

    update(data: object, context?: any): Promise<FoundryActiveEffect>;

    static defineSchema(): object;
}
