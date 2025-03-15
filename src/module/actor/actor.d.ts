import SplittermondItem from "../item/item";
import type {SplittermondSkill} from "../config/skillGroups";
import Attack from "./attack";
import {DamageType} from "../config/damageTypes";
import {Susceptibilities} from "./modifiers/Susceptibilities";

declare class SplittermondActor extends Actor {

    private _resistances: Susceptibilities;
    private _weaknesses: Susceptibilities;

    items: Collection<SplittermondItem>;

    async activeDefenseDialog(type?: "defense" | "vtd" | "kw" | "gw"): Promise<void>;

    get splinterpoints(): { value: number, max: number };

    get weaknesses(): Record<DamageType, number>;

    get resistances(): Record<DamageType, number>;

    get damageReduction(): number;

    get protectedDamageReduction(): number;

    spendSplinterpoint(): { pointSpent: boolean, getBonus(skillName: SplittermondSkill | "health"): number };

    async rollMagicFumble(eg: number, costs?: string, skill?: SplittermondSkill): Promise<void>;

    async addTicks(value: number, message?: string, askPlayer?: boolean): Promise<void>;

    consumeCost(type: "health" | "focus", valueStr: string, description: unknown): void;

    importFromJSON(json: string, overwriteData?): Promise<unknown>;

    attacks: Attack[];
    type: "character" | "npc";
}

export default SplittermondActor;