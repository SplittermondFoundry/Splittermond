export interface TickBarHudCombatant {
    id: string;
    name: string;
    img: string;
    active: boolean;
    owner: boolean;
    defeated: boolean;
    hidden: boolean;
    initiative: number;
    hasRolled: boolean;
}

export interface TickBarHudStatusEffect {
    id: string;
    owner: boolean;
    active: boolean;
    img: string;
    description: string;
    name: string;
}

export interface TickBarHudTick {
    tickNumber: number;
    isCurrentTick: boolean;
    combatants: TickBarHudCombatant[];
    statusEffects: TickBarHudStatusEffect[];
}

export interface TickBarHudTemplateData {
    ticks: TickBarHudTick[];
    wait: TickBarHudCombatant[];
    keepReady: TickBarHudCombatant[];
}

