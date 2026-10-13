import { foundryApi } from "module/api/foundryApi";
import { derivedAttributes } from "module/config/attributes";
import { skillGroups } from "module/config/skillGroups";
import { modifierDescription, type ModifierDefinition } from "./catalogue";

export const modifierCategories = ["general", "magic", "fighting", "other"] as const;
export const modifierCategoryHeadings = [
    { value: "skills", parent: "" },
    ...modifierCategories.map((value) => ({ value, parent: value === "other" ? "" : "skills" })),
];
export type ModifierCategory = (typeof modifierCategories)[number];
export const modifierSortModes = ["category", "alphabetical"] as const;
export type ModifierSortMode = (typeof modifierSortModes)[number];

interface ModifierGroupEntry {
    path: string;
    definition: ModifierDefinition;
}

export interface ModifierGroup {
    path: string;
    category: ModifierCategory;
    entries: ModifierGroupEntry[];
    search: string;
}

export interface ModifierPathStep {
    path: string;
    choices: { value: string; label: string; description: string; selected: boolean }[];
}

export function canonicalDefinition(definition: ModifierDefinition, definitions: readonly ModifierDefinition[]) {
    return (
        definitions.find((entry) => entry.path.toLowerCase() === definition.helperAlias?.toLowerCase()) ?? definition
    );
}

export function modifierGroups(definitions: readonly ModifierDefinition[]): ModifierGroup[] {
    const groups = new Map<string, ModifierGroup>();
    for (const definition of definitions) {
        const canonical = canonicalDefinition(definition, definitions);
        const path = selectionPath(canonical.path);
        const parts = path.split(".");
        const depth = path.startsWith("actor.skills.") ? 3 : ["actor", "item", "check"].includes(parts[0]) ? 2 : 1;
        const groupPath = parts.slice(0, depth).join(".");
        const group = groups.get(groupPath) ?? {
            path: groupPath,
            category: categoryFor(groupPath),
            entries: [],
            search: "",
        };
        if (!group.entries.some((entry) => entry.definition === canonical))
            group.entries.push({ path, definition: canonical });
        group.search += ` ${definition.path} ${modifierDescription(definition)}`;
        groups.set(groupPath, group);
    }
    return [...groups.values()];
}

function selectionPath(path: string): string {
    const [prefix, attribute] = path.split(".");
    // Derived values mix short base paths with actor-prefixed multiplier paths in the registry.
    return prefix === "actor" && derivedAttributes.some((entry) => entry === attribute) ? path.slice(6) : path;
}

function categoryFor(path: string): ModifierCategory {
    if (path === "actor.skills" || path === "actor.skills.social") return "general";
    for (const category of modifierCategories) {
        if (
            category !== "other" &&
            (path === `actor.skills.${category}` || skillGroups[category].some((skill) => skill === path))
        )
            return category;
    }
    return "other";
}

export function groupDescription(group: ModifierGroup): string {
    const key = `splittermond.modifierHelper.groups.${group.path.replace(/^actor\./, "").replace(/\./g, "_")}`;
    const localized = foundryApi.localize(key);
    if (localized !== key) return localized;
    const base = group.entries.find((entry) => entry.path === group.path);
    return base
        ? modifierDescription(base.definition)
        : foundryApi.format("splittermond.modifierHelper.unknownDescription", { target: group.path });
}

export function modifierPathSteps(group: ModifierGroup, selectedPath: string): ModifierPathStep[] {
    const steps: ModifierPathStep[] = [];
    let path = group.path;
    while (true) {
        const depth = path.split(".").length;
        const children = [
            ...new Set(
                group.entries
                    .filter((entry) => entry.path.startsWith(`${path}.`))
                    .map((entry) =>
                        entry.path
                            .split(".")
                            .slice(0, depth + 1)
                            .join(".")
                    )
            ),
        ];
        if (!children.length) break;
        const base = group.entries.some((entry) => entry.path === path);
        const choices = [
            ...(base ? [{ value: path, label: foundryApi.localize("splittermond.modifierHelper.baseValue") }] : []),
            ...children.sort().map((child) => ({ value: child, label: variantLabel(child.split(".")[depth]) })),
        ].map((choice) => ({
            ...choice,
            description: variantDescription(group, choice.value),
            selected:
                selectedPath === choice.value || (choice.value !== path && selectedPath.startsWith(`${choice.value}.`)),
        }));
        steps.push({ path, choices });
        const selected = choices.find((choice) => choice.selected)?.value;
        if (!selected || selected === path) break;
        path = selected;
    }
    return steps;
}

function variantDescription(group: ModifierGroup, path: string): string {
    const entry = group.entries.find((entry) => entry.path === path);
    return entry
        ? modifierDescription(entry.definition)
        : foundryApi.format("splittermond.modifierHelper.unknownDescription", { target: path });
}

function variantLabel(segment: string): string {
    const key = `splittermond.modifierHelper.variants.${segment.toLowerCase()}`;
    const label = foundryApi.localize(key);
    return label === key ? segment : `${label} (${segment})`;
}
