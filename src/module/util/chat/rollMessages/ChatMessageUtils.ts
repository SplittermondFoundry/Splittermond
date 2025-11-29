import { CheckReport } from "module/check";
import { isMember } from "module/util/util";

/**
 * Gets CSS classes for roll result styling based on check report outcomes
 */
export function getRollResultClass(checkReport: CheckReport): string {
    const resultClasses = [];
    if (checkReport.isCrit) {
        resultClasses.push("critical");
    }
    if (checkReport.isFumble) {
        resultClasses.push("fumble");
    }
    if (checkReport.succeeded) {
        resultClasses.push("success");
    }
    return resultClasses.join(" ");
}

// ============================================================================
// Action Configuration Utilities
// ============================================================================

export interface ActionInput<T = string> {
    action: T;
    [key: string]: unknown;
}

/**
 * Configures a reusable action handler with validation checks for usage state,
 * option availability, and action type matching.
 *
 * @template TActions - Type union of action names handled by this configuration
 * @example
 * const handler = configureUseAction()
 *   .withUsed(() => this.used)
 *   .withHandlesActions(['action1', 'action2'] as const)
 *   .whenAllChecksPassed(async (data) => { ... });
 */
export function configureUseAction<TActions extends string>() {
    let usedEvaluator: () => boolean = () => false;
    let handledActions: Readonly<TActions[]> = [];
    let isOptionEvaluator: () => boolean = () => true;

    function withUsed(used: () => boolean) {
        usedEvaluator = used;
        return { withHandlesActions, withIsOptionEvaluator, whenAllChecksPassed };
    }
    function withHandlesActions(actionsOfHandler: Readonly<TActions[]>) {
        handledActions = actionsOfHandler;
        return { withUsed, withIsOptionEvaluator, whenAllChecksPassed };
    }
    function withIsOptionEvaluator(optionEvaluator: () => boolean) {
        isOptionEvaluator = optionEvaluator;
        return { withUsed, withHandlesActions, whenAllChecksPassed };
    }

    function whenAllChecksPassed(action: (actionData: ActionInput<TActions>) => Promise<void>) {
        return {
            useAction: (actionData: ActionInput<TActions>) => useAction(action, actionData),
        };
    }

    function useAction(
        action: (actionData: ActionInput<TActions>) => Promise<void>,
        actionData: ActionInput<TActions>
    ) {
        if (usedEvaluator()) {
            console.warn("Attempt to use a used action");
            return Promise.resolve();
        }
        if (!isOptionEvaluator()) {
            console.warn(`Attempt to use an action that should not have been offered. Action: ${actionData.action}`);
            return Promise.resolve();
        }
        if (!isMember(handledActions, actionData.action)) {
            console.warn(`action ${actionData.action} is not handled by this handler`);
            return Promise.resolve();
        }
        return action(actionData);
    }
    return { withUsed, withIsOptionEvaluator, withHandlesOptions: withHandlesActions };
}

// ============================================================================
// Degree of Success Option Utilities
// ============================================================================

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

/**
 * Configures a reusable degree-of-success option handler with validation for
 * usage state, option availability, and option type matching.
 *
 * @template T - Type union of option action names handled by this configuration
 * @param usedEvaluator - Function that returns whether the handler has been used
 * @param isOptionEvaluator - Function that returns whether options should be available
 * @param optionsOnHandler - Array of option names this handler manages
 * @example
 * const handler = configureUseOption()
 *   .withUsed(() => this.used)
 *   .withHandlesOptions(['option1', 'option2'] as const)
 *   .whenAllChecksPassed((data) => ({ usedDegreesOfSuccess: 1, action: () => {...} }));
 */
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
