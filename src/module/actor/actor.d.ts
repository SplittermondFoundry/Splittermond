import SplittermondItem from "../item/item";
import type { SplittermondSkill } from "../config/skillGroups";
import Attack from "./attack";
import { DamageType } from "../config/damageTypes";
import { CharacterDataModel } from "./dataModel/CharacterDataModel";
import { NpcDataModel } from "./dataModel/NpcDataModel";
import { Susceptibilities } from "./Susceptibilities";
import ModifierManager from "./modifiers/modifier-manager";
import type { VirtualToken } from "../combat/VirtualToken";
import type { ItemType } from "module/config/itemTypes";

export type DefenseType = "defense" | "mindresist" | "bodyresist" | "vtd" | "kw" | "gw";
declare class SplittermondActor extends Actor {
    private _resistances: Susceptibilities;
    private _weaknesses: Susceptibilities;
    public readonly modifier: ModifierManager;

    items: Collection<SplittermondItem>;

    system: CharacterDataModel | NpcDataModel;

    async activeDefenseDialog(type?: DefenseType): Promise<void>;

    get splinterpoints(): { value: number; max: number };

    get weaknesses(): Record<DamageType, number>;

    get resistances(): Record<DamageType, number>;
    addModifier(item: SplittermondItem, str: string, type: string, multiplier?: number): void;

    get damageReduction(): number;

    get protectedDamageReduction(): number;

    spendSplinterpoint(): { pointSpent: boolean; getBonus(skillName: SplittermondSkill | "health"): number };

    async rollMagicFumble(eg: number, costs?: string, skill?: SplittermondSkill, askUser = true): Promise<void>;

    async addTicks(value: number, message?: string, askPlayer?: boolean): Promise<void>;

    consumeCost(type: "health" | "focus", valueStr: string, description: unknown): Promise<void>;

    importFromJSON(json: string, overwriteData?): Promise<unknown>;

    findItem(): FindOptions;

    getVirtualStatusTokens(): VirtualToken[];

    attacks: Attack[];
    type: "character" | "npc";
}

interface FindOptions {
    withType(type: ItemType): Omit<FindOptions, "withType">;
    withName(name: string): SplittermondItem | undefined;
}

export default SplittermondActor;
export function calculateHeroLevels(): number[];
