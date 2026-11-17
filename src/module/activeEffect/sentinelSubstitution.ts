import type { EffectDataObject } from "module/activeEffect";
import { from14_3_1_restoreDefenseSkillInput } from "./migrations/restoreDefenseSkillInput";

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
        from14_3_1_restoreDefenseSkillInput(data);
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
