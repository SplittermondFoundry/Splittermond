import type { ActionEffectSchemaType } from "./dataModel/ActionEffectDataModel";

export type ModifierEntry = ActionEffectSchemaType["modifiers"][number];
export type CostModifierEntry = ActionEffectSchemaType["costModifiers"][number];

export interface EffectSystem {
    changes?: unknown[];
    modifiers?: ModifierEntry[];
    costModifiers?: CostModifierEntry[];
}

export interface SplittermondEffectFlags {
    splittermond?: { rawInput?: string; [k: string]: unknown };
    core?: { sourceId?: string; [k: string]: unknown };
    [k: string]: unknown;
}

export interface EffectDataObject {
    _id?: string;
    name?: string;
    origin?: string | null;
    type?: string;
    transfer?: boolean;
    disabled?: boolean;
    system?: EffectSystem;
    flags?: SplittermondEffectFlags;
    [k: string]: unknown;
}

export type EffectSubstitutor = (effectData: EffectDataObject) => EffectDataObject;
