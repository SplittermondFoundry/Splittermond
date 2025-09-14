export interface ConfigSegment {
    requiredAttributes: string[];
    optionalAttributes: string[];
    subSegments?: Record<string, any>
}

export type Config = { readonly topLevelPath: string } & Readonly<ConfigSegment>

// Updated to preserve original types in subsegments
type SubSegments<T> = T extends Record<string, any>
    ? Readonly<{ [K in keyof T]: Readonly<T[K] & ConfigSegment> }>
    : never;


type PartialConfig = {
    topLevelPath: string;
} & Record<string, any>; // Allow any additional properties including subsegments

// Updated to preserve the original CONFIG type including subsegments
export function makeConfig<CONFIG extends PartialConfig>(proto: CONFIG): CONFIG extends { subSegments: infer S }
    ? Readonly<Omit<CONFIG, 'subSegments'> & ConfigSegment & { subSegments: SubSegments<S> }>
    : Readonly<CONFIG & Config> {
    return {
        ...makeConfigSegment(proto),
        topLevelPath: proto.topLevelPath,
    } as any
}

function makeSubSegments<T extends Record<string, any>>(proto: T): { readonly [K in keyof T]: Readonly<T[K] & ConfigSegment> } {
    const mappedEntries = (Object.entries(proto))
        .map(([key, value]) => [key, makeConfigSegment(value)]);
    return Object.fromEntries(mappedEntries) as { readonly [K in keyof T]: Readonly<T[K] & ConfigSegment> };
}

function makeConfigSegment<SEGMENT extends Record<string, any>>(proto: SEGMENT): Readonly<SEGMENT & ConfigSegment> {
    return {
        ...proto,
        requiredAttributes: proto.requiredAttributes ?? [],
        optionalAttributes: proto.optionalAttributes ?? [],
        subSegments: proto.subSegments ? makeSubSegments(proto.subSegments) : undefined
    }
}