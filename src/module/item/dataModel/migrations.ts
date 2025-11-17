import { parseModifiers } from "module/modifiers/parsing";
import { validateDescriptors } from "module/modifiers/parsing/validators";
import { isRoll } from "module/api/Roll";
import { parseFeatures } from "./propertyModels/ItemFeaturesModel";

/* Remove migrations after advancing two major versions. I.e. remove 12.x migrations with Foundry v14 */
export function migrateFrom0_12_13(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(source.modifier, (mod) => mod.includes("/"));
    const changed = change.map((mod) => {
        const path = mod.split("/")?.[0].trim() ?? "";
        const value = /\S+(?=\s*$)/.exec(mod)?.[0].trim() ?? "";
        const emphasis = /(?<=\/).*?(?=\S+\s*$)/.exec(mod)?.[0].trim() ?? "";
        return `${path} emphasis="${emphasis}" ${value}`;
    });
    source.modifier = [...keep, ...changed].join(", ");

    //We need to enforce that boolean values are actually boolean values. Otherwise they might behave weirdly when displayed
    ["equipped", "multiSelectable", "onCreationOnly", "isGrandmaster", "isManeuver", "prepared", "active"].forEach(
        (key) => {
            if (key in source) {
                source[key] = !!source[key];
            }
        }
    );
    return source;
}

export function migrateFrom0_12_20(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(
        source.modifier,
        (mod) => mod.startsWith("damage") || mod.startsWith("weaponspeed")
    );
    const changed = change.map(mapDamageModifier);
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}

export function from0_12_20_migrateFeatures(source: unknown) {
    if (hasStringKey(source, "features")) {
        const features = source.features;
        source.features = {
            internalFeatureList: parseFeatures(features),
        };
    }
    if (
        hasKey(source, "secondaryAttack") &&
        hasKey(source.secondaryAttack, "features") &&
        typeof source.secondaryAttack.features === "string"
    ) {
        const features = source.secondaryAttack.features;
        source.secondaryAttack.features = {
            internalFeatureList: parseFeatures(features),
        };
    }
    return source;
}

export function from0_12_20_migrateDamage(source: unknown) {
    if (!hasKey(source, "damage") && !hasKey(source, "secondaryAttack")) {
        return source;
    }
    // Migrate primary damage if it's a string
    if (hasStringKey(source, "damage")) {
        source.damage = {
            stringInput: source.damage,
        };
    }
    // Migrate secondary attack damage if it's a string
    if (
        source &&
        typeof source === "object" &&
        "secondaryAttack" in source &&
        typeof source["secondaryAttack"] === "object" &&
        source.secondaryAttack &&
        "damage" in source.secondaryAttack &&
        typeof source.secondaryAttack["damage"] === "string"
    ) {
        source.secondaryAttack.damage = {
            stringInput: source.secondaryAttack["damage"],
        };
    }
    return source;
}

function mapDamageModifier(mod: string): string {
    if (!mod.includes("/") && !/^\s*\S+[.]\S+/.test(mod) && !/emphasis=\S+/.test(mod)) {
        return mod;
    }
    const parsedModifier = parseModifiers(mod).modifiers[0];
    const path = parsedModifier.path.split(".")[0];
    const nameFromPath = parsedModifier.path.split(".")[1];
    let itemName: string | null = null;
    if (nameFromPath && nameFromPath.length > 0) {
        itemName = nameFromPath.trim();
    } else if (parsedModifier.attributes.emphasis) {
        const errors = validateDescriptors(parsedModifier.attributes.emphasis);
        itemName = errors.length > 0 ? null : (parsedModifier.attributes.emphasis as string);
    }
    let valueAsString: string;
    if (isRoll(parsedModifier.attributes.value)) {
        valueAsString = parsedModifier.attributes.value.formula;
    } else if (typeof parsedModifier.attributes.value === "object") {
        valueAsString = parsedModifier.attributes.value.original;
    } else {
        valueAsString = `${parsedModifier.attributes.value}`;
    }

    if (itemName) {
        return `${path} item="${itemName}" ${valueAsString}`;
    } else {
        return `${path} ${valueAsString}`;
    }
}

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
    const isGeneralSkillMod = (mod: string) => mod.startsWith("generalskills");
    const isMagicSkillMod = (mod: string) => mod.startsWith("magicskills");
    const isFightingSkillMod = (mod: string) => mod.startsWith("fightingskills");
    const { keep, change } = separateModifiers(
        source.modifier,
        (mod) => isMagicSkillMod(mod) || isFightingSkillMod(mod) || isGeneralSkillMod(mod)
    );
    const changed = change.map((mod) => {
        if (isGeneralSkillMod(mod)) {
            return mod.replace(/^generalskills/, "actor.skills.general");
        } else if (isMagicSkillMod(mod)) {
            return mod.replace(/^magicskills/, "actor.skills.magic");
        } else if (isFightingSkillMod(mod)) {
            return mod.replace(/^fightingskills/, "actor.skills.fighting");
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
