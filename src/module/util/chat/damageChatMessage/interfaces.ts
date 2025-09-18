// DO NOT CHANGE THIS FILE WITHOUT ALSO CHANGING THE damage-roll.hbs TEMPLATE

export interface DamageMessageData {
    source: string | null;
    features: { active: boolean; name: string; value: number }[];
    formulaToDisplay: string;
    total: number;
    tooltip: string;
    actions: DamageAction[];
}

export interface DamageAction {
    classes: string;
    data: Record<string, string>;
    icon: string;
    name: string;
}
