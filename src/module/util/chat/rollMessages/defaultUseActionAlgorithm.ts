import { isMember } from "module/util/util";

export interface ActionInput<T = string> {
    action: T;
    [key: string]: unknown;
}

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
