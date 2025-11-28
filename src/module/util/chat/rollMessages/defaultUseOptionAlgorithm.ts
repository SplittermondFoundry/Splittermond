import { isMember } from "module/util/util";

export interface DegreeOfSuccessOptionData {
    action: string;
    multiplicity: string;
}

export function isDegreeOfSuccessOptionData(data: unknown): data is DegreeOfSuccessOptionData {
    return !!data && typeof data === "object" && "action" in data && "multiplicity" in data;
}

export interface DegreeOfSuccessAction {
    usedDegreesOfSuccess: number;
    action: () => void;
}

export type DegreeOfSuccessOptionInput = Record<string, unknown> & { action: string };

export const noOptionToUse = {
    usedDegreesOfSuccess: 0,
    action: () => {},
} as const;

type TypedDoSData<T extends string> = DegreeOfSuccessOptionData & { action: T };

export function configureUseOption<T extends string = never>(
    usedEvaluator: () => boolean = () => false,
    isOptionEvaluator: () => boolean = () => true,
    optionsOnHandler: Readonly<T[]> = []
) {
    function withUsed(used: () => boolean) {
        return configureUseOption(used, isOptionEvaluator, optionsOnHandler);
    }

    function withHandlesOptions<U extends string>(optionsHandled: Readonly<U[]>) {
        const newOptionsHandled = [...optionsOnHandler, ...optionsHandled];
        return configureUseOption<T | U>(usedEvaluator, isOptionEvaluator, newOptionsHandled);
    }

    function withIsOption(isOption: () => boolean) {
        return configureUseOption(usedEvaluator, isOption, optionsOnHandler);
    }

    function whenAllChecksPassed(
        optionConsumer: (degreeOfSuccessOptionData: TypedDoSData<T>) => DegreeOfSuccessAction
    ) {
        return {
            useOption: (degreeOfSuccessOptionData: DegreeOfSuccessOptionInput) =>
                useOption(optionConsumer, degreeOfSuccessOptionData),
        };
    }

    function useOption(
        optionConsumer: (degreeOfSuccessOptionData: TypedDoSData<T>) => DegreeOfSuccessAction,
        degreeOfSuccessOptionData: DegreeOfSuccessOptionInput
    ): DegreeOfSuccessAction {
        if (!isDegreeOfSuccessOptionData(degreeOfSuccessOptionData)) {
            console.warn("Data passed from HTML object is not a valid degree of success option data");
            return noOptionToUse;
        }
        const action = degreeOfSuccessOptionData.action;
        if (!isMember(optionsOnHandler, action)) {
            console.warn("Attempt to perform an action that is not handled by this handler");
            return noOptionToUse;
        }
        if (!isOptionEvaluator()) {
            console.warn("Attempt to use an option that should not have been provided to the user");
            return noOptionToUse;
        }
        if (usedEvaluator()) {
            console.warn("Attempt to alter a used cost action");
            return noOptionToUse;
        }
        return optionConsumer({ ...degreeOfSuccessOptionData, action });
    }

    return {
        withUsed,
        withHandlesOptions,
        withIsOption,
        whenAllChecksPassed,
    };
}
