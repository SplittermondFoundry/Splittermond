import type { EffectDataObject } from "module/activeEffect";

export function stripSchwerpunktPrefix(name: string): string {
    if (name.startsWith("Schwerpunkt")) {
        return name.substring(12).trim();
    }
    return name;
}

export function substituteSkill(skill: string | undefined): (data: EffectDataObject) => void {
    return (data) => {
        const system = data.system;
        if (!system?.modifiers) return;
        for (const entry of system.modifiers) {
            if (entry.attributes && "skill" in entry.attributes) {
                entry.attributes.skill = skill;
            }
        }
    };
}
