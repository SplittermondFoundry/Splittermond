export interface ModifierChoice {
    value: string;
    label: string;
}

export interface ModifierAttributeOptions {
    values?: readonly ModifierChoice[];
    // Suggestions may be narrower than the values accepted by existing consumers.
    suggestions?: readonly ModifierChoice[];
    label?: string;
    hint?: string;
    // true retains existing values for editing; "always" also omits the attribute from helper output.
    hidden?: boolean | "always";
    groupChoices?: boolean;
}

export type ModifierAttributes = Readonly<Record<string, ModifierAttributeOptions | null>>;

export type ConfigSegment = {
    requiredAttributes: ModifierAttributes;
    optionalAttributes: ModifierAttributes;
    hasEffect: boolean;
    subSegments?: Record<string, ConfigSegment>;
    description?: string;
    helperAlias?: string;
    helperGroup?: { path: string; attribute: string; choice: ModifierChoice };
};

export function modifierChoices<T extends string>(values: readonly T[], label: (value: T) => string): ModifierChoice[] {
    return values.map((value) => ({ value, label: label(value) }));
}

export type Config = { readonly topLevelPath: string } & Readonly<ConfigSegment>;

export function getAttributeConfig(
    config: ConfigSegment,
    attribute: string
): ModifierAttributeOptions | null | undefined {
    if (Object.prototype.hasOwnProperty.call(config.requiredAttributes, attribute))
        return config.requiredAttributes[attribute];
    if (Object.prototype.hasOwnProperty.call(config.optionalAttributes, attribute))
        return config.optionalAttributes[attribute];
    return undefined;
}

export type ConfigSegmentInput = Partial<Omit<ConfigSegment, "subSegments">> & {
    subSegments?: Record<string, ConfigSegmentInput>;
    [key: string]: unknown;
};

export type ConfigInput = ConfigSegmentInput & { topLevelPath: string };

type CompleteSegment<T extends ConfigSegmentInput> = Readonly<
    T &
        ConfigSegment &
        (T extends { subSegments: infer S extends Record<string, ConfigSegmentInput> }
            ? { subSegments: { readonly [K in keyof S]: CompleteSegment<S[K]> } }
            : object)
>;

export function makeConfig<CONFIG extends ConfigInput>(proto: CONFIG): CompleteSegment<CONFIG> {
    return makeConfigSegment(proto);
}

function makeConfigSegment<SEGMENT extends ConfigSegmentInput>(proto: SEGMENT): CompleteSegment<SEGMENT> {
    return {
        ...proto,
        requiredAttributes: proto.requiredAttributes ?? { value: null },
        optionalAttributes: proto.optionalAttributes ?? {},
        hasEffect: proto.hasEffect ?? true,
        subSegments: proto.subSegments
            ? Object.fromEntries(
                  Object.entries(proto.subSegments).map(([key, value]) => [key, makeConfigSegment(value)])
              )
            : undefined,
    } as CompleteSegment<SEGMENT>;
}
