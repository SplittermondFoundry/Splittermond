// noinspection JSUnusedGlobalSymbols

import {type Config, makeConfig} from "module/modifiers/ModifierConfig";


export namespace ModifierConfigGuaranteesConfig {
    export const topLevelPathOnly = {topLevelPath: "soAloneHere"}

    export const result: Config = makeConfig(topLevelPathOnly)
}

export namespace topLevelPathIsRequired {
    export const missingTopLevelPath = {}

    // @ts-expect-error topLevelPath is required
    export const result: Config = makeConfig(missingTopLevelPath)
}

export namespace configWithSubsegmentsGuaranteesTopLevelPath{
    export const input = {
        topLevelPath: "some.path",
        subSegments: {
            subPath1: {
                requiredAttributes: ["argument"],
                optionalAttributes: ["opinion"],
            }
        }
    }

    const result: Config = makeConfig(input)
    export const topLevelPath = result.topLevelPath
}

export namespace makeConfigPreservesNonConfigInput {
    export const input = {
        topLevelPath: "some.path",
        subSegments: {
            subPath1: {
                requiredAttributes: ["argument"],
                optionalAttributes: ["opinion"],
            },
            subPath2: {
                operator: (a: number, b: number) => a + b,
            }
        }

    }
    export const result = makeConfig(input)

    export const operationResult= result.subSegments.subPath2.operator(1,2)
    // @ts-expect-error operator is not part of this ConfigSegment
    export const noOperationError = result.subSegments.subPath1.operator(1,2)
}

export namespace ensuresEveryThingIsReadOnly {
    export const input = {
        topLevelPath: "some.path",
        subSegments: {
            subPath1: {
                requiredAttributes: ["argument"],
                optionalAttributes: ["opinion"],
                randomArray: [{a:1,b:2}],
            },
            subPath2: {
                operator: (a: number, b: number) => a + b,
            }
        }

    }
    export const result = makeConfig(input)

    type IsReadonly<T> = T extends Readonly<T> ? true : false;

    export const topLevelPathReadonly:IsReadonly<typeof result.topLevelPath>=true
    export const subSegmentsReadonly:IsReadonly<typeof result.subSegments>=true
    export const subPath1Readonly:IsReadonly<typeof result.subSegments.subPath1>=true
    export const subPath2Readonly:IsReadonly<typeof result.subSegments.subPath2>=true
    export const requiredAttributesReadonly:IsReadonly<typeof result.subSegments.subPath1.requiredAttributes>=true
    export const optionalAttributesReadonly:IsReadonly<typeof result.subSegments.subPath1.optionalAttributes>=true
    export const randomArrayReadonly:IsReadonly<typeof result.subSegments.subPath1.randomArray[0]>=true
    export const operatorReadonly:IsReadonly<typeof result.subSegments.subPath2.operator>=true
}

export namespace tracesDeeplyNestedSegment {
    export const input = {
        topLevelPath: "some.path",
        subSegments: {
            subPath1: {
                subPath2: {
                    subSegment3: {
                        subSegment4: {
                            subSegment5: {
                                operator: (a: number, b: number) => a + b,
                            }
                        }
                    }
                },
                requiredAttributes: ["argument"],
                optionalAttributes: ["opinion"],
            },
        }

    }
    export const result = makeConfig(input)

    export const operationResult= result.subSegments.subPath1.subPath2.subSegment3.subSegment4.subSegment5.operator(1,2)
    // @ts-expect-error operator is not part of this ConfigSegment
    export const noOperationError = result.subSegments.subPath1.subPath2.subSegment3.operator(1,2)
}

export namespace complexExample {

// Test that additional properties are preserved at the type level
    const testInput = {
        topLevelPath: "test.path",
        subSegments: {
            subPath1: {
                requiredAttributes: ["arg1"],
                optionalAttributes: ["opt1"],
            },
            subPath2: {
                operator: (a: number, b: number) => a + b,
                customProperty: "custom value",
            },
            subPath3: {
                someFunction: () => "hello",
                someNumber: 42,
                requiredAttributes: ["required"],
            }
        }
    };

    const result = makeConfig(testInput);

    // Test that we can access the preserved properties with proper typing
    export const operatorFunction = result.subSegments?.subPath2.operator;
    export const customProperty = result.subSegments?.subPath2.customProperty;
    export const someFunction = result.subSegments?.subPath3.someFunction;
    export const someNumber = result.subSegments?.subPath3.someNumber;
}