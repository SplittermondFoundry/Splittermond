export function from13_5_2_migrate_fo_modifiers(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(
        source.modifier,
        (mod) => mod.startsWith("foreduction") || mod.startsWith("foenhancedreduction")
    );
    const changed = change.map(mapFoReduction);
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}

function mapFoReduction(mod: string): string {
    const groupId = mod.split(" ")[0].split(".");
    const group = groupId[0];
    const skill = groupId[1] ?? "";
    const type = groupId[2] ?? "";
    const newGroup = group === "foreduction" ? "focus.reduction" : "focus.enhancedreduction";
    const skillAttribute = skill ? ` skill="${skill}"` : "";
    const typeAttribute = type ? ` type="${type}"` : "";
    return `${newGroup}${skillAttribute}${typeAttribute} ${mod.replace(/^\S+/, "").trim()}`;
}

export function from13_8_8_migrateSkillModifiers(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const isGeneralSkillMod = (mod: string) => mod.toLowerCase().startsWith("generalskills");
    const isMagicSkillMod = (mod: string) => mod.toLowerCase().startsWith("magicskills");
    const isFightingSkillMod = (mod: string) => mod.toLowerCase().startsWith("fightingskills");
    const { keep, change } = separateModifiers(
        source.modifier,
        (mod) => isMagicSkillMod(mod) || isFightingSkillMod(mod) || isGeneralSkillMod(mod)
    );
    const changed = change.map((mod) => {
        if (isGeneralSkillMod(mod)) {
            return mod.replace(/^generalskills/i, "actor.skills.general");
        } else if (isMagicSkillMod(mod)) {
            return mod.replace(/^magicskills/i, "actor.skills.magic");
        } else if (isFightingSkillMod(mod)) {
            return mod.replace(/^fightingskills/i, "actor.skills.fighting");
        }
        return mod;
    });
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}

function separateModifiers(mods: string, findChange: (mod: string) => boolean): { keep: string[]; change: string[] } {
    const keep = mods
        .split(",")
        .map((mod) => mod.trim())
        .filter((mod) => !findChange(mod));
    const change = mods
        .split(",")
        .map((mod) => mod.trim())
        .filter(findChange);
    return { keep, change };
}

function hasStringKey(source: unknown, key: string): source is { [key]: string | any } {
    return hasKey(source, key) && typeof source[key] === "string";
}
function hasKey(source: unknown, key: string): source is { [key]: unknown } {
    return !!source && typeof source === "object" && key in source;
}
