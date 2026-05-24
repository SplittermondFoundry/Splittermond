import { SplittermondSkill } from "../config/skillGroups";
import type { DefenseType } from "module/actor/actor";
import type { GenericRollEvaluation } from "module/check/types";

export interface CheckReport extends Omit<GenericRollEvaluation, "roll"> {
    skill: {
        id: SplittermondSkill;
        attributes: Record<string, number>;
        points: number;
    };
    roll: {
        total: number;
        dice: { total: number }[];
        tooltip: string;
    };
    defenseType: DefenseType | null;
    modifierElements: { isMalus: boolean; value: string; description: string }[];
    hideDifficulty: boolean;
    maneuvers: UsedManeuver[];
}

interface UsedManeuver {
    uuid: string;
    name: string;
    description: string;
}
