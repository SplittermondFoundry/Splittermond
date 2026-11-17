import type { CharacterBiography } from "module/actor/dataModel/CharacterDataModel";

export function genesisBiographyImport(data: Record<string, unknown>): Partial<CharacterBiography> {
    const biography: Partial<CharacterBiography> = {};
    for (const [source, target] of [
        ["hairColor", "hairColor"],
        ["eyeColor", "eyeColor"],
        // Genesis uses furColor for both skin and fur in its character editor.
        ["furColor", "skinColor"],
        ["birthplace", "birthplace"],
    ] as const) {
        const value = data[source];
        if (typeof value === "string" && value.trim()) biography[target] = value.trim();
    }
    for (const [source, target, unit] of [
        ["size", "height", "cm"],
        ["weight", "weight", "kg"],
    ] as const) {
        const value = data[source];
        // Unfilled Genesis measurements are zero; omit them to preserve manual entries on updates.
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
            biography[target] = `${value} ${unit}`;
        }
    }
    return biography;
}
