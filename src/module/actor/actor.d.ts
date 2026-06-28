import SplittermondItem from "../item/item";
import type { SplittermondSkill } from "../config/skillGroups";
import type Skill from "./skill"
import Attack from "./attack";
import { DamageType } from "../config/damageTypes";
import { CharacterDataModel } from "./dataModel/CharacterDataModel";
import { NpcDataModel } from "./dataModel/NpcDataModel";
import { Susceptibilities } from "./Susceptibilities";
import ModifierManager from "./modifiers/modifier-manager";
import type { VirtualToken } from "../combat/VirtualToken";
import type { ItemType } from "module/config/itemTypes";
import type { FoundryChatMessage } from "module/api/ChatMessage";
import type { ExpressionBundle, ValueBundle } from "module/util/util";
import type {Expression} from "module/modifiers/expressions/scalar";

export type DefenseType = "defense" | "mindresist" | "bodyresist" | "vtd" | "kw" | "gw";

declare class SplittermondActor extends Actor {
    private _resistances: Susceptibilities;
    private _weaknesses: Susceptibilities;
    public readonly modifier: ModifierManager;
    public readonly type: "character" | "npc";

    items: Collection<SplittermondItem>;

    system: CharacterDataModel | NpcDataModel;

    public readonly skills: Record<SplittermondSkill,Skill>;
    public readonly attacks: Attack[];


    async activeDefenseDialog(type?: DefenseType): Promise<void>;

    get splinterpoints(): { value: number; max: number };

    get weaknesses(): ExpressionBundle<Record<DamageType, Expression>>;

    get resistances(): ExpressionBundle<Record<DamageType, Expression>>;
    addModifier(item: SplittermondItem, str: string, type: string, multiplier?: number): void;

    get damageReduction(): ExpressionBundle;

    get protectedDamageReduction(): ValueBundle;

    get tickMalus(): ExpressionBundle;

    get handicap(): ValueBundle;

    get woundMalusMod(): ExpressionBundle;

    get healthRegenMultiplier(): ValueBundle;

    get healthRegenBonus(): ExpressionBundle;

    get focusRegenMultiplier(): ValueBundle;

    get focusRegenBonus(): ExpressionBundle;

    spendSplinterpoint(): { pointSpent: boolean; getBonus(skillName: SplittermondSkill | "health"): Promise<number> };

    async rollMagicFumble(eg: number, costs?: string, skill?: SplittermondSkill, askUser = true): Promise<void>;
    async rollAttackFumble(): Promise<FoundryChatMessage>;

    async addTicks(value: number, message?: string, askPlayer?: boolean): Promise<void>;

    consumeCost(type: "health" | "focus", valueStr: string, description: unknown): Promise<void>;

    importFromJSON(json: string, overwriteData?): Promise<unknown>;

    findItem(): FindOptions;

    getVirtualStatusTokens(): VirtualToken[];

    get bonusCap(): ExpressionBundle;
}

interface FindOptions {
    withType(type: ItemType): Omit<FindOptions, "withType">;
    withName(name: string): SplittermondItem | undefined;
}

export default SplittermondActor;
export function calculateHeroLevels(): number[];
