import type { EffectDataObject } from "module/activeEffect";

export function stripSchwerpunktPrefix(name: string): string {
    if (name.startsWith("Schwerpunkt")) {
        return name.substring(12).trim();
    }
    return name;
}

export function substituteSkill(skill: string | undefined) {
    return (data: EffectDataObject) => {
        const system = data.system;
        if (system?.modifiers) {
            for (const entry of system.modifiers) {
                if (entry.attributes && "skill" in entry.attributes) {
                    entry.attributes.skill = skill;
                }
            }
        }
        return data;
    };
}

export function substituteName(name: string) {
    return (data: EffectDataObject) => {
        const system = data.system;
        if (system?.modifiers) {
            for (const entry of system.modifiers) {
                if (entry.attributes) {
                    entry.attributes.name = name;
                }
            }
        }
        return data;
    };
}
