export interface ConfigSegment {
    requiredAttributes: string[];
    optionalAttributes: string[];
    subSegments?: SubSegments
}

export type Config = { readonly topLevelPath: string } & Readonly<ConfigSegment>
type SubSegments = Readonly<Record<string, Readonly<ConfigSegment>>>;

type PartialConfigSegment = {
    requiredAttributes?: string[];
    optionalAttributes?: string[];
    subSegments?: Record<string, PartialConfigSegment>;
};

type PartialConfig = PartialConfigSegment & { topLevelPath: string };

export function makeConfig(proto: PartialConfig): Config {
    return {
        topLevelPath: proto.topLevelPath,
        ...makeConfigSegment(proto),
    }
}

function makeSubSegments(proto: Record<string, PartialConfigSegment>): SubSegments {
    const mappedEntries = (Object.entries(proto))
        .map(([key, value]) => [key, makeConfigSegment(value)]);
    return Object.fromEntries(mappedEntries);
}

function makeConfigSegment(proto: PartialConfigSegment): Readonly<ConfigSegment> {
    return {
        requiredAttributes: proto.requiredAttributes ?? [],
        optionalAttributes: proto.optionalAttributes ?? [],
        subSegments: proto.subSegments ? makeSubSegments(proto.subSegments) : undefined
    }
}