import type { SplittermondSkill } from "module/config/skillGroups";

export interface FumbledCheckData {
    eg: number;
    costs: string;
    skill: SplittermondSkill;
    askUser?: boolean;
}
export interface ConfirmedFumbledCheckData extends FumbledCheckData {
    lowerFumbleResult: number;
    rollTable: { min: number; max: number; text: string }[];
}
export type FumbleDialogResult = Omit<ConfirmedFumbledCheckData, "rollTable">;
