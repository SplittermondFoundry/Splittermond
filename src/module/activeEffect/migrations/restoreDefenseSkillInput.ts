import { splittermond } from "module/config";

export function from14_3_1_restoreDefenseSkillInput(source: unknown) {
    if (!isRecord(source) || !isRecord(source.flags) || !isRecord(source.flags.splittermond)) return source;
    const flags = source.flags.splittermond;
    const rawInput = flags.rawInput;
    if (rawInput !== "item.defenseTickCost skill= -1" && rawInput !== 'item.defenseTickCost skill="${skill}" -1') {
        return source;
    }
    if (!isRecord(source.system) || !Array.isArray(source.system.modifiers) || source.system.modifiers.length !== 1) {
        return source;
    }
    const entry: unknown = source.system.modifiers[0];
    if (!isRecord(entry) || entry.path !== "item.defenseTickCost" || !isRecord(entry.attributes)) return source;
    const skill = entry.attributes.skill;
    if (!splittermond.skillGroups.all.some((knownSkill) => knownSkill === skill)) return source;
    if (
        !isRecord(entry.serializedValue) ||
        entry.serializedValue.type !== "amount" ||
        entry.serializedValue.amount !== -1 ||
        entry.implementation !== "additive" ||
        entry.selectable !== false ||
        Object.keys(entry.attributes).some((key) => !["name", "type", "skill"].includes(key)) ||
        (Array.isArray(source.system.costModifiers) && source.system.costModifiers.length > 0)
    ) {
        return source;
    }
    // The old template retained its empty input even after its structured skill was assigned.
    const resolvedInput = `item.defenseTickCost skill="${skill}" -1`;
    flags.rawInput = resolvedInput;
    if (entry.attributes.name === rawInput) entry.attributes.name = resolvedInput;
    return source;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
