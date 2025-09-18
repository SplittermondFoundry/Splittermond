/**
 * This is the reproduction of the data the Token action bar template actually uses.
 * DO NOT CHANGE THIS INTERFACE, unless you also change the template.
 */
export interface TokenActionBarSkill {
    id: string;
    value: string;
    label: string;
}

export interface TokenActionBarAttack {
    id: string;
    name: string;
    img: string;
    isPrepared: boolean;
    skill: {
        label: string;
        value: string;
    };
    weaponSpeed: string;
    damage: string;
    range: string;
    featureList: string[];
}

export interface TokenActionBarWeapon {
    _id: string;
    name: string;
    img: string;
    type: string;
    system: {
        equipped: boolean;
        // ...other properties if needed
    };
}

export interface TokenActionBarSpell {
    id: string;
    name: string;
    img: string;
    skill: {
        label: string;
        value: string;
    };
    spellTypeList: string[];
    description: string;
    enhancementCosts: string;
    enhancementDescription: string;
    difficulty: string;
    castDuration: string;
    damage?: string;
    range: string;
    costs: string;
    effectDuration: string;
    enoughFocus?: boolean;
}

export interface TokenActionBarSpellsBySkill {
    label: string;
    skillValue: number;
    spells: TokenActionBarSpell[];
}

export interface TokenActionBarPreparedSpell extends TokenActionBarSpell {}

export interface TokenActionBarDerivedValues {
    defense: { value: string };
    bodyresist: { value: string };
    mindresist: { value: string };
}

export interface TokenActionBarTemplateData {
    name?: string;
    actorId?: string;
    img?: string;
    skills?: {
        general: TokenActionBarSkill[];
        magic: TokenActionBarSkill[];
    };
    attacks?: TokenActionBarAttack[];
    weapons?: TokenActionBarWeapon[];
    spells?: Record<string, TokenActionBarSpellsBySkill> | undefined;
    preparedSpell?: TokenActionBarPreparedSpell | null;
    derivedValues?: TokenActionBarDerivedValues;
}
