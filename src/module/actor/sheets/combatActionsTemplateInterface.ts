export interface CombatActionsAttackTemplateItem {
    id: string;
    img: string;
    name: string;
    isDamaged?: boolean;
    skill: { value: string };
    damage: string;
    damageType: string;
    costType: string;
    damageImplements: string;
    range: string;
    weaponSpeed: string;
    features: string;
    editable: boolean;
    deletable: boolean;
}

export interface CombatActionsActiveDefenseItem {
    id: string;
    img: string | null;
    name: string;
    skill: { value: { display: string } };
    features?: string;
}

export interface CombatActionsActiveDefense {
    defense: CombatActionsActiveDefenseItem[];
    mindresist: CombatActionsActiveDefenseItem[];
    bodyresist: CombatActionsActiveDefenseItem[];
}

export interface CombatActionsTab {
    id: string;
    group: string;
    label: string;
}

export interface CombatActionsTabs {
    tabs: CombatActionsTab[];
    initial: string;
}

/**
 * Documents the template context for `templates/sheets/actor/parts/combat-actions.hbs`.
 * Forward-looking: the legacy JS actor sheets (`src/module/actor/sheets/actor-sheet.js`) are exempt
 * from the template-context interface rule and do not consume this type. It exists to pin the
 * template contract for a future TS/ApplicationV2 migration.
 */
export interface CombatActionsTemplateData {
    attacks: CombatActionsAttackTemplateItem[];
    activeDefense: CombatActionsActiveDefense;
    combatTabs: CombatActionsTabs;
}
