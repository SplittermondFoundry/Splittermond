import { parseFeatures } from "./propertyModels/ItemFeaturesModel";
import { splittermond } from "module/config";
import { type ItemFeature } from "module/config/itemFeatures";

/*
 * Keep modifier-string migrations even after their Foundry generation has aged out. Items can survive skipped system
 * releases, and 14.3 turns modifier strings into ActiveEffects. The legacy syntax must therefore be normalized before
 * that one-way conversion happens.
 */
export function migrateModifiers(source: unknown) {
    source = migrateFrom0_12_11(source);
    source = migrateFrom0_12_13(source);
    source = migrateFrom0_12_20(source);
    source = from13_5_2_migrate_fo_modifiers(source);
    source = from13_8_8_migrateSkillModifiers(source);
    source = from14_2_7_migrateModifiers(source);
    source = from14_3_0_migratePositionalSkillSelectors(source);
    return source;
}

export function migrateFrom0_12_11(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(source.modifier, (mod) => /^susceptibility(?=[./\s])/i.test(mod));
    const changed = change.map(mapSusceptibilityModifier);
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}
export function migrateFrom0_12_13(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(source.modifier, (mod) => /^\S+\//.test(mod));
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
            if (key in source && source[key] !== undefined) {
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
    const { keep, change } = separateModifiers(source.modifier, (mod) =>
        /^(?:damage|weaponspeed)(?=[./\s])/i.test(mod)
    );
    const changed = change.map(mapDamageModifier);
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}

export function from0_12_20_migrateFeatures(source: unknown) {
    if (hasStringKey(source, "features")) {
        const features = source.features;
        source.features = {
            internalFeatureList: parseFeatures(cleanFeatures(features)),
        };
    }
    if (
        hasKey(source, "secondaryAttack") &&
        hasKey(source.secondaryAttack, "features") &&
        typeof source.secondaryAttack.features === "string"
    ) {
        const features = source.secondaryAttack.features;
        source.secondaryAttack.features = {
            internalFeatureList: parseFeatures(cleanFeatures(features)),
        };
    }
    return source;
}
function cleanFeatures(features: string): string {
    return features
        .trim()
        .split(",")
        .map((f) => f.trim())
        .filter((f) => !(f.includes("-") || f.includes("–")))
        .filter((f) => !!f)
        .map((candidate) => {
            const bestMatch = splittermond.itemFeatures.find((f) => f.toLowerCase() === candidate);
            if (bestMatch) {
                return bestMatch;
            } else if (candidate.toLowerCase().includes("lange") && candidate.toLowerCase().includes("waffe")) {
                return "Lange Waffe" satisfies ItemFeature;
            } else {
                return candidate;
            }
        })
        .join(", ");
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
    const pathToken = /^\S+/.exec(mod)?.[0];
    if (!pathToken) return mod;

    const selectorIndex = pathToken.search(/[./]/);
    const path = (selectorIndex < 0 ? pathToken : pathToken.slice(0, selectorIndex)).toLowerCase();
    const itemName = selectorIndex < 0 ? null : pathToken.slice(selectorIndex + 1).trim();
    let remainder = mod.slice(pathToken.length).trim();

    // V12 used emphasis for the item selector. Preserve all other attributes verbatim, including quoted commas.
    remainder = remainder.replace(
        /(^|\s)emphasis=(?:"([^"]*)"|'([^']*)'|([^\s]+))(\s*)/i,
        (
            _match,
            prefix: string,
            doubleQuoted: string | undefined,
            singleQuoted: string | undefined,
            unquoted: string | undefined,
            trailingWhitespace: string
        ) => `${prefix}item="${doubleQuoted ?? singleQuoted ?? unquoted}"${trailingWhitespace ? " " : ""}`
    );
    if (itemName) {
        remainder = `item="${itemName}"${remainder ? ` ${remainder}` : ""}`;
    }

    return `item.${path}${remainder ? ` ${remainder}` : ""}`;
}

export function from13_5_2_migrate_fo_modifiers(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(source.modifier, (mod) =>
        /^(?:foreduction|foenhancedreduction)(?=[.\s])/i.test(mod)
    );
    const changed = change.map(mapFoReduction);
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}

function mapFoReduction(mod: string): string {
    const groupId = mod.split(" ")[0].split(".");
    const group = groupId[0].toLowerCase();
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
    const isGeneralSkillMod = (mod: string) => /^generalskills(?=[./\s])/i.test(mod);
    const isMagicSkillMod = (mod: string) => /^magicskills(?=[./\s])/i.test(mod);
    const isFightingSkillMod = (mod: string) => /^fightingskills(?=[./\s])/i.test(mod);
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
    const fragments = splitModifierString(mods)
        .map((mod) => mod.trim())
        .filter(Boolean);
    const keep = fragments.filter((mod) => !findChange(mod));
    const change = fragments.filter(findChange);
    return { keep, change };
}

function splitModifierString(modifiers: string): string[] {
    const fragments: string[] = [];
    let delimiter: "'" | '"' | null = null;
    let fragmentStart = 0;
    for (let index = 0; index < modifiers.length; index++) {
        const character = modifiers[index];
        if (delimiter === null && (character === "'" || character === '"')) {
            delimiter = character;
        } else if (character === delimiter) {
            delimiter = null;
        } else if (character === "," && delimiter === null) {
            fragments.push(modifiers.slice(fragmentStart, index));
            fragmentStart = index + 1;
        }
    }
    fragments.push(modifiers.slice(fragmentStart));
    return fragments;
}

function hasStringKey(source: unknown, key: string): source is { [key]: string | any } {
    return hasKey(source, key) && typeof source[key] === "string";
}
function hasKey(source: unknown, key: string): source is { [key]: unknown } {
    return isObject(source) && key in source;
}

function isObject(source: unknown): source is object {
    return !!source && typeof source === "object";
}

export function from14_2_6_migrateCombatEvent(source: unknown) {
    if (hasKey(source, "combatEvent")) return source;

    const hasStartTick = hasKey(source, "startTick");
    const hasInterval = hasKey(source, "interval");
    const hasTimes = hasKey(source, "times");
    if (!hasStartTick && !hasInterval && !hasTimes) return source;

    const record = source as Record<string, unknown>;
    const combatEvent: Record<string, unknown> = {};
    if (hasStartTick) combatEvent.startTick = Number(record.startTick) ? Number(record.startTick) : null;
    if (hasInterval) combatEvent.interval = !!Number(record.interval) ? Number(record.interval) : null;
    if (hasTimes) combatEvent.repeats = Number(record.times) ? Number(record.times) : null;
    record.combatEvent = combatEvent;
    delete record.startTick;
    delete record.interval;
    delete record.times;
    return source;
}

export function from14_2_7_migrateModifiers(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(source.modifier, (mod) => /^gsw[.]mult(?=\s)/i.test(mod));
    const changed = change.map((mod) => mod.replace(/^gsw[.]mult/i, "actor.speed.multiplier"));
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}

/**
 * Normalize the positional selector found in older world data. The current skill
 * handler expects the selected skill as an attribute (`skills skill="..."`),
 * while some V12-era items persisted it as a second bare token
 * (`skills perception ...`). Only known skill ids are rewritten so malformed
 * free-form modifiers remain visible to the user instead of being guessed at.
 */
export function from14_3_0_migratePositionalSkillSelectors(source: unknown) {
    if (!hasStringKey(source, "modifier")) {
        return source;
    }
    const { keep, change } = separateModifiers(source.modifier, hasPositionalSkillSelector);
    const changed = change.map(mapPositionalSkillSelector);
    source.modifier = [...keep, ...changed].join(", ");
    return source;
}

function hasPositionalSkillSelector(mod: string): boolean {
    const match = /^(actor[.]skills|skills)\s+([^\s=]+)(?=\s)/i.exec(mod);
    if (!match) return false;
    return splittermond.skillGroups.all.some((skill) => skill.toLowerCase() === match[2].toLowerCase());
}

function mapPositionalSkillSelector(mod: string): string {
    const match = /^(actor[.]skills|skills)\s+([^\s=]+)(?=\s)/i.exec(mod);
    if (!match) return mod;
    const skill = splittermond.skillGroups.all.find((candidate) => candidate.toLowerCase() === match[2].toLowerCase());
    if (!skill) return mod;
    return mod.replace(match[0], `${match[1]} skill="${skill}"`);
}

function mapSusceptibilityModifier(mod: string): string {
    const valueMatch = /[+-]?\d+(?:[.]\d+)?(?=\s*$)/.exec(mod);
    if (!valueMatch) return mod;

    const invertedValue = -Number(valueMatch[0]);
    const serializedValue = Object.is(invertedValue, -0) ? "0" : `${invertedValue}`;
    return mod.replace(/^susceptibility/i, "resistance").replace(/[+-]?\d+(?:[.]\d+)?(?=\s*$)/, serializedValue);
}
