import SplittermondItem from "../item/item";
import type { SplittermondSkill } from "../config/skillGroups";
import type Skill from "./skill";
import Attack from "./attack";
import { DamageType } from "../config/damageTypes";
import { CharacterDataModel } from "./dataModel/CharacterDataModel";
import { NpcDataModel } from "./dataModel/NpcDataModel";
import { Susceptibilities } from "./Susceptibilities";
import ModifierManager from "./modifiers/modifier-manager";
import type { BonusGrant } from "./bonusPool";
import type { PrimaryCost } from "module/util/costs/PrimaryCost";
import type { VirtualToken } from "../combat/VirtualToken";
import type { ItemType } from "module/config/itemTypes";
import type { FoundryChatMessage } from "module/api/ChatMessage";
import type { ExpressionBundle, ValueBundle } from "module/util/util";
import type { Expression } from "module/modifiers/expressions/scalar";
import { SplittermondActiveEffect } from "module/activeEffect";
import type { PreparedAction } from "module/actor/PreparedAction";
import type SplittermondSpellItem from "../item/spell";

export type DefenseType = "defense" | "mindresist" | "bodyresist" | "vtd" | "kw" | "gw";

interface SusceptibilityBundle {
    get display(): Record<DamageType, string>;
    get expression(): Record<DamageType, Expression>;
    calculate(): Promise<Record<DamageType, number>>;
    calculateSync(): Record<DamageType, number>;
}

declare class SplittermondActor extends Actor {
    private _resistances: Susceptibilities;
    private _weaknesses: Susceptibilities;
    public readonly modifier: ModifierManager;
    public preparedSpells: PreparedAction;
    public preparedAttacks: PreparedAction;
    public bonusGrants: { healthpoints: BonusGrant[]; focuspoints: BonusGrant[] };
    public readonly type: "character" | "npc";

    items: Collection<SplittermondItem>;

    system: CharacterDataModel | NpcDataModel;

    public readonly skills: Record<SplittermondSkill, Skill>;
    public readonly attacks: Attack[];
    public spells: SplittermondSpellItem[];

    async activeDefenseDialog(type?: DefenseType): Promise<void>;

    get splinterpoints(): { value: number; max: number };

    get weaknesses(): SusceptibilityBundle;

    get resistances(): SusceptibilityBundle;
    addModifier(item: SplittermondItem, str: string, type: string, multiplier?: number): void;

    get damageReduction(): ExpressionBundle;

    get protectedDamageReduction(): ValueBundle;

    get tickMalus(): ExpressionBundle;

    get handicap(): ExpressionBundle;

    get woundMalusMod(): ExpressionBundle;

    get healthRegenMultiplier(): ExpressionBundle;

    get healthRegenBonus(): ExpressionBundle;

    get focusRegenMultiplier(): ExpressionBundle;

    get focusRegenBonus(): ExpressionBundle;

    spendSplinterpoint(): { pointSpent: boolean; getBonus(skillName: SplittermondSkill | "health"): Promise<number> };

    async rollMagicFumble(eg: number, costs?: string, skill?: SplittermondSkill, askUser = true): Promise<void>;
    async rollAttackFumble(): Promise<FoundryChatMessage>;

    async addTicks(value: number, message?: string, askPlayer?: boolean): Promise<void>;

    applyCost(type: "health" | "focus", primaryCost: PrimaryCost, description: string): Promise<void>;

    endChannel(type: "health" | "focus", index: number): Promise<void> | undefined;

    removeChannel(type: "health" | "focus", index: number): Promise<void> | undefined;

    importFromJSON(json: string, overwriteData?): Promise<unknown>;

    findItem(): FindOptions;

    getVirtualStatusTokens(): VirtualToken[];

    get bonusCap(): ExpressionBundle;
    allApplicableEffects(): Generator<SplittermondActiveEffect, void, void>;
    isEffectIneffective(effect: SplittermondActiveEffect): boolean;
}

interface FindOptions {
    withType(type: ItemType): Omit<FindOptions, "withType">;
    withName(name: string): SplittermondItem | undefined;
}

export default SplittermondActor;
export function calculateHeroLevels(): number[];
