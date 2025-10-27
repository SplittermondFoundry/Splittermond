import type { SplittermondSkill } from "module/config/skillGroups";

export interface FumbledCheckData {
    eg: number;
    costs: string;
    skill: SplittermondSkill;
    askUser?: boolean;
}
export interface ConfirmedFumbledCheckData extends Omit<FumbledCheckData, "skill" | "askUser"> {
    lowerFumbleResult: number;
}
export type FumbleDialogResult = ConfirmedFumbledCheckData;
