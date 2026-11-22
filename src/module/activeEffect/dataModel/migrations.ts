const legacyDerivedValuePaths = new Map([
    ["actor.initiative", "initiative"],
    ["actor.speed", "speed"],
    ["actor.healthpoints", "healthpoints"],
    ["actor.focuspoints", "focuspoints"],
    ["actor.defense", "defense"],
    ["actor.bodyresist", "bodyresist"],
    ["actor.mindresist", "mindresist"],
]);

export function from14_3_1_migrateDerivedValuePaths(source: unknown) {
    if (!source || typeof source !== "object" || !("modifiers" in source) || !Array.isArray(source.modifiers)) {
        return source;
    }
    const entries: unknown[] = source.modifiers;
    for (const entry of entries) {
        if (!entry || typeof entry !== "object" || !("path" in entry) || typeof entry.path !== "string") continue;
        // Bundled effects used actor-prefixed paths that derived values never consume.
        const canonicalPath = legacyDerivedValuePaths.get(entry.path.toLowerCase());
        if (canonicalPath) entry.path = canonicalPath;
    }
    return source;
}
