import { SplittermondDataModel } from "module/data/SplittermondDataModel";
import { ChatMessageModel } from "module/data/SplittermondChatMessage";
import type { Action } from "module/util/chat/rollMessages/ChatCardCommonInterfaces";
import { ActionHandler, type ActionInput } from "module/util/chat/rollMessages/ChatCardCommonInterfaces";
import { foundryApi } from "module/api/foundryApi";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";

export abstract class RollMessage<
        T extends { openDegreesOfSuccess: number },
        ACTIONS extends Action<AVAILABLE>,
        AVAILABLE extends string,
    >
    extends SplittermondDataModel<T>
    implements ChatMessageModel
{
    private readonly optionsHandlerMap = new Map<string, ActionHandler<ACTIONS, AVAILABLE>>();
    private readonly actionsHandlerMap = new Map<string, ActionHandler<ACTIONS, AVAILABLE>>();

    protected registerHandler(handler: ActionHandler<ACTIONS, AVAILABLE>) {
        handler.handlesDegreeOfSuccessOptions.forEach((value) => this.optionsHandlerMap.set(value, handler));
        handler.handlesActions.forEach((value) => this.actionsHandlerMap.set(value, handler));
    }

    //We could implement a barebones getData that just passes renderActions and renderOptions on the child that needs to implement _onGetData, but then we would have to pass another type :(
    abstract getData(): object;

    protected renderActions() {
        return deduplicate(this.actionsHandlerMap).flatMap((handler) => handler.renderActions());
    }

    protected renderOptions() {
        return deduplicate(this.optionsHandlerMap).flatMap((handler) => handler.renderDegreeOfSuccessOptions());
    }

    async handleGenericAction(optionData: ActionInput<string>): Promise<void> {
        const degreeOfSuccessOption = this.optionsHandlerMap.get(optionData.action);
        const action = this.actionsHandlerMap.get(optionData.action);
        if (!action && !degreeOfSuccessOption) {
            foundryApi.warnUser("splittermond.chatCard.spellMessage.noHandler", { action: optionData.action });
        } else if (!!action && !!degreeOfSuccessOption) {
            foundryApi.warnUser("splittermond.chatCard.spellMessage.tooManyHandlers", { action: optionData.action });
        } else if (action) {
            return this.handleActions(action, optionData as ActionInput<AVAILABLE> /*conversion after type checking*/);
        } else if (degreeOfSuccessOption) {
            const preparedOption = degreeOfSuccessOption.useDegreeOfSuccessOption(optionData);
            if (preparedOption.usedDegreesOfSuccess <= this.openDegreesOfSuccess) {
                try {
                    preparedOption.action();
                    this.updateSource({
                        openDegreesOfSuccess: this.openDegreesOfSuccess - preparedOption.usedDegreesOfSuccess,
                    } as Partial<T>);
                } catch (e) {
                    return Promise.reject(e);
                }
            }
        }
    }

    private async handleActions(action: ActionHandler<ACTIONS, AVAILABLE>, actionData: ActionInput<AVAILABLE>) {
        const actionKeyword = actionData.action;
        if (this.isAvailableAction(actionKeyword)) {
            return action.useAction({ ...actionData, action: actionKeyword });
        } else {
            throw new Error(
                `Somehow ${actionKeyword} is not a keyword that is in AvailableActions. This should never happen.`
            );
        }
    }

    protected abstract isAvailableAction(actionKeyword: string): actionKeyword is AVAILABLE;

    get template() {
        return `${TEMPLATE_BASE_PATH}/chat/attack-chat-card.hbs`;
    }
}
function deduplicate<T>(handlers: Map<string, T>) {
    const allHandlers = new Set(handlers.values());
    return Array.from(allHandlers);
}
