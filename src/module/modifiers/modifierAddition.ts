import type { IModifierSource } from "module/modifiers/IModifierSource";
import { foundryApi } from "../api/foundryApi";
import { ICostModifier } from "../util/costs/spellCostManagement";
import { type FocusModifier, parseModifiers, type ScalarModifier } from "./parsing";
import { Expression as ScalarExpression, of, times } from "./expressions/scalar";
import { Modifier } from "module/activeEffect";
import type { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import { withErrorLogger } from "module/modifiers/parsing/valueProcessor";
import { ParseErrors } from "module/modifiers/parsing/ParseErrors";
import type { IModifier, ModifierType } from "module/modifiers/index";
import { normalizeDescriptor } from "module/modifiers/parsing/normalizer";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";
import { getKeyByConstructor, type Constructor } from "module/data/dataModelRegistry";

export interface TaggedModifier {
    modifier: IModifier;
    rawFragment: string;
    implementation: string;
}

export interface TaggedCostModifier {
    modifier: ICostModifier;
    rawFragment: string;
}

export interface AddModifierResult {
    modifiers: TaggedModifier[];
    costModifiers: TaggedCostModifier[];
}

export function initAddModifier(
    registry: ModifierRegistry<ScalarModifier>,
    costRegistry: ModifierRegistry<FocusModifier>
) {
    return function addModifier(
        item: IModifierSource,
        str = "",
        type: ModifierType = null,
        multiplier = 1
    ): AddModifierResult {
        const modifiers: TaggedModifier[] = [];
        const costModifiers: TaggedCostModifier[] = [];

        if (str == "") {
            return { modifiers, costModifiers };
        }
        const allErrors = new ParseErrors(str, item.name);
        const { processCostValue, processScalarValue } = withErrorLogger(allErrors);
        const parsedResult = parseModifiers(str);
        allErrors.push(...parsedResult.errors);
        const handlerCache = registry.getCache(allErrors.consumer, item, type, of(multiplier));
        const costHandlerCache = costRegistry.getCache(allErrors.consumer, item, type, of(multiplier));
        const actorProvider: ActorProvider = () => item.actor;

        const unprocessedModifiers: Array<{ parsed: ScalarModifier; rawFragment: string }> = [];
        for (const parsedModifier of parsedResult.modifiers) {
            const rawFragment = parsedModifier.rawFragment;
            if (costHandlerCache.handles(parsedModifier.path)) {
                const normalized = processCostValue(parsedModifier, actorProvider);
                if (!normalized) continue;
                const produced = costHandlerCache.getHandler(normalized.path).processModifier(normalized);
                produced.forEach((modifier) => costModifiers.push({ modifier, rawFragment }));
            } else if (handlerCache.handles(parsedModifier.path)) {
                const normalized = processScalarValue(parsedModifier, actorProvider);
                if (!normalized) continue;
                const produced = handlerCache.getHandler(normalized.path).processModifier(normalized);
                produced.forEach((modifier) =>
                    modifiers.push({
                        modifier,
                        rawFragment,
                        implementation: getKeyByConstructor(modifier.constructor as Constructor) ?? "additive",
                    })
                );
            } else {
                const normalized = processScalarValue(parsedModifier, actorProvider);
                if (!normalized) continue;
                unprocessedModifiers.push({ parsed: normalized, rawFragment });
            }
        }

        //Backup processor for modifiers that have no dedicated handler
        //deprecated paths are also handled here
        unprocessedModifiers.forEach(({ parsed: modifier, rawFragment }) => {
            if (["damage", "weaponspeed"].includes(modifier.path.toLowerCase().split(".")[0])) {
                foundryApi.format("splittermond.modifiers.parseMessages.deprecatedPath", {
                    oldPath: modifier.path,
                    newPath: `item.${modifier.path}`,
                    itemName: item.name,
                });
                modifier.path = `item.${modifier.path}`;
            } else if ("gsw.mult" === modifier.path.toLowerCase()) {
                const newGroupId = "actor.speed.multiplier";
                foundryApi.format("splittermond.modifiers.parseMessages.deprecatedPath", {
                    oldPath: modifier.path,
                    newPath: newGroupId,
                    itemName: item.name,
                });
                modifier.path = newGroupId;
            } else {
                /* handles path translations for derived values and skills. Cannot be done in registry, because the language file loads too late for
                 * adding initializers in 'init'. You cannot place handlers in the "ready" hook however, because Actors are initialized before the
                 * 'ready' hook.
                 */
                const newGroupId = normalizeDescriptor(modifier.path).usingMappers("derivedAttributes", "skills").do();
                if (handlerCache.handles(newGroupId)) {
                    modifier.path = newGroupId;
                }
            }

            if (handlerCache.handles(modifier.path)) {
                const handler = handlerCache.getHandler(modifier.path);
                const produced = handler.processModifier(modifier);
                produced.forEach((m) =>
                    modifiers.push({
                        modifier: m,
                        rawFragment,
                        implementation: getKeyByConstructor(m.constructor as Constructor) ?? "additive",
                    })
                );
                return;
            }

            /**Deprecated*/
            const modifierLabel = modifier.path.toLowerCase();
            //mainly for internal modifiers.
            const mod = createModifier(
                modifierLabel,
                times(of(multiplier), modifier.value),
                item,
                type,
                {},
                actorProvider
            );
            modifiers.push({
                modifier: mod,
                rawFragment,
                implementation: getKeyByConstructor(mod.constructor as Constructor) ?? "additive",
            });
        });
        // Only display errors to the GM or the owner of the item
        // Otherwise players might get spoilers
        if (item.isOwner) allErrors.printAll();
        return { modifiers, costModifiers };
    };
}

function createModifier(
    path: string,
    value: ScalarExpression,
    item: IModifierSource,
    type: ModifierType,
    attributes: Record<string, string> = {},
    actorProvider?: ActorProvider
): IModifier {
    return Modifier.create(
        path,
        value,
        {
            name: attributes.emphasis ?? item.name,
            type,
        },
        !!attributes.emphasis,
        actorProvider
    );
}
