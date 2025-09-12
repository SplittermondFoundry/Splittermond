import {ModifierHandler} from "module/modifiers/ModiferHandler";
import type {ModifierType} from "module/actor/modifier-manager";
import {makeConfig} from "module/modifiers/ModifierConfig";
import {IllegalStateException} from "module/data/exceptions";
import type SplittermondItem from "module/item/item";


type ErrorLogger = (...messages: string[]) => void
type HandlerConstructor<T extends ModifierHandler> = new(logError: ErrorLogger, sourceItem: SplittermondItem, type: ModifierType) => T
type HandlerArgs<T extends ModifierHandler = ModifierHandler> = ConstructorParameters<HandlerConstructor<T>>

export class ModifierRegistry {

    private registeredHandlers: Map<string, HandlerConstructor<ModifierHandler>> = new Map();


    addHandler<T extends ModifierHandler>(groupId: string, handlerClass: HandlerConstructor<T>) {
        const lowerGroupId = groupId.toLowerCase();
        this.validateGroupId(lowerGroupId)
        this.checkHandlerShadowing(lowerGroupId);

        this.registeredHandlers.set(lowerGroupId, handlerClass);
    }

    getCache(...args: HandlerArgs) {
        return new ModifierCache(this.registeredHandlers, args);
    }

    private validateGroupId(groupId: string): void {
        if (this.registeredHandlers.has(groupId)) {
            throw new Error(`Modifier handler for groupId '${groupId}' is already registered.`);
        } else if (/[.]{2,}/.test(groupId)) {
            throw new Error(`Modifier handler for groupId '${groupId}' is invalid: multiple consecutive dots are not allowed.`);
        } else if (groupId.startsWith('.')) {
            throw new Error(`Modifier handler for groupId '${groupId}' is invalid: starting with a dot is not allowed.`);
        } else if (groupId.endsWith('.')) {
            throw new Error(`Modifier handler for groupId '${groupId}' is invalid: ending with a dot is not allowed.`);
        }
    }

    private checkHandlerShadowing(groupId: string): void {
        this.checkMoreSpecificHandlers(groupId);
        this.checkMoreGeneralHandlers(groupId);
    }

    private checkMoreSpecificHandlers(groupId: string): void {
        const moreSpecificHandlers = Array.from(this.registeredHandlers.keys())
            .filter(key => key.startsWith(groupId + "."))
        if (moreSpecificHandlers.length > 0) {
            console.debug("Splittermond | More specific handlers than groupId '" + groupId + "':", moreSpecificHandlers.join(", "));
        }
    }

    private checkMoreGeneralHandlers(groupId: string): void {
        const moreGeneralHandlers = Array.from(getSegmentList(groupId)).filter(key => this.registeredHandlers.has(key))
        if (moreGeneralHandlers.length > 0) {
            console.debug("Splittermond | More general handlers than groupId '" + groupId + "':", moreGeneralHandlers.join(", "));
        }
    }
}

type ModifierRegister<T> = { get(groupId: string): T | undefined, has(groupId: string): boolean }

class ModifierCache {

    private cachedHandlers: Map<string, ModifierHandler> = new Map();

    constructor(
        private readonly registry: ModifierRegister<HandlerConstructor<ModifierHandler>>,
        private readonly handlerArgs: HandlerArgs) {
    }

    getHandler(groupId: string): ModifierHandler {
        const lowerGroupId = groupId.toLowerCase();
        const cachedKey = firstMatchingSuperSegment(lowerGroupId, this.cachedHandlers);
        if (cachedKey !== null) {
            return this.cachedHandlers.get(cachedKey)!;
        }
        const registryKey = firstMatchingSuperSegment(lowerGroupId, this.registry);
        if (registryKey !== null) {
            return this.instantiateHandler(registryKey)
        }
        return new NoActionModifierHandler(...this.handlerArgs);
    }

    private instantiateHandler(groupId: string): ModifierHandler {
        const constructor = this.registry.get(groupId);
        if (!constructor) {
            throw new IllegalStateException("No constructor found for groupId " + groupId);
        }
        const handler = new constructor(...this.handlerArgs);
        this.cachedHandlers.set(groupId, handler);
        return handler;
    }
}

class NoActionModifierHandler extends ModifierHandler {

    constructor(logErrors: ErrorLogger, _:SplittermondItem, __: ModifierType) {
        super(logErrors, makeConfig({topLevelPath: ""}));
    }

    protected buildModifier(): null {
        return null;
    }

    protected omitForValue(): boolean {
        return false;
    }
}

function firstMatchingSuperSegment(groupId: string, registry: ModifierRegister<unknown>): string | null {
    for (const segment of getSegmentList(groupId)) {
        if (registry.has(segment)) {
            return segment;
        }
    }
    return null;
}

function* getSegmentList(groupId: string) {
    const groupIdSegments = groupId.split(".").map(s => s.toLowerCase());
    for (let i = groupIdSegments.length; i > 0; i--) {
        yield groupIdSegments.slice(0, i).join(".");
    }
}
