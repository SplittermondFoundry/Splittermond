import SplittermondItem from "../item/item";
import { foundryApi } from "../api/foundryApi";
import { ICostModifier } from "../util/costs/spellCostManagement";
import { type FocusModifier, parseModifiers, type ScalarModifier } from "./parsing";
import { Expression as ScalarExpression, of, times } from "./expressions/scalar";
import Modifier from "module/modifiers/impl/modifier";
import type { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import { withErrorLogger } from "module/modifiers/parsing/valueProcessor";
import { ParseErrors } from "module/modifiers/parsing/ParseErrors";
import type { IModifier, ModifierType } from "module/modifiers/index";

export interface AddModifierResult {
    modifiers: IModifier[];
    costModifiers: ICostModifier[];
}

export function initAddModifier(
    registry: ModifierRegistry<ScalarModifier>,
    costRegistry: ModifierRegistry<FocusModifier>
) {
    return function addModifier(
        item: SplittermondItem,
        str = "",
        type: ModifierType = null,
        multiplier = 1
    ): AddModifierResult {
        const modifiers: IModifier[] = [];
        const costModifiers: ICostModifier[] = [];

        if (str == "") {
            return { modifiers, costModifiers };
        }
        const allErrors = new ParseErrors(str, item.name);
        const { processCostValue, processScalarValue } = withErrorLogger(allErrors);
        const parsedResult = parseModifiers(str);
        allErrors.push(...parsedResult.errors);
        const handlerCache = registry.getCache(allErrors.consumer, item, type, of(multiplier));
        const costHandlerCache = costRegistry.getCache(allErrors.consumer, item, type, of(multiplier));

        const unprocessedModifiers: ScalarModifier[] = [];
        for (const parsedModifier of parsedResult.modifiers) {
            if (costHandlerCache.handles(parsedModifier.path)) {
                const normalized = processCostValue(parsedModifier, item.actor);
                if (!normalized) continue;
                const modifier = costHandlerCache.getHandler(normalized.path).processModifier(normalized);
                costModifiers.push(...modifier);
            } else if (handlerCache.handles(parsedModifier.path)) {
                const normalized = processScalarValue(parsedModifier, item.actor);
                if (!normalized) continue;
                const modifier = handlerCache.getHandler(normalized.path).processModifier(normalized);
                modifiers.push(...modifier);
            } else {
                const normalized = processScalarValue(parsedModifier, item.actor);
                if (!normalized) continue;
                unprocessedModifiers.push(normalized);
            }
        }

        //Backup processor for modifiers that have no dedicated handler
        //deprecated paths are also handled here
        unprocessedModifiers.forEach((modifier) => {
            if (["damage", "weaponspeed"].includes(modifier.path.toLowerCase().split(".")[0])) {
                foundryApi.format("splittermond.modifiers.parseMessages.deprecatedPath", {
                    old: modifier.path,
                    new: `item.${modifier.path}`,
                    itemName: item.name,
                });
                modifier.path = `item.${modifier.path}`;
            }
            if ("gsw.mult" === modifier.path.toLowerCase()) {
                const newGroupId = "actor.speed.multiplier";
                foundryApi.format("splittermond.modifiers.parseMessages.deprecatedPath", {
                    old: modifier.path,
                    new: newGroupId,
                });
                modifier.path = newGroupId;
            }

            if (handlerCache.handles(modifier.path)) {
                const handler = handlerCache.getHandler(modifier.path);
                const createdModifier = handler.processModifier(modifier);
                modifiers.push(...createdModifier);
                return;
            }

            const modifierLabel = modifier.path.toLowerCase();
            switch (modifierLabel) {
                //This setup is a bit of a hack, it uses the (private) knowledge that Attack objects add the item id as listener to skill modifiers
                //And also sneaks in actor knowledge via item.actor
                case "npcattacks":
                    item.actor?.items
                        .filter((item) => item.type === "npcattack")
                        .map((item) => `skill.${item.id}`) //name would be better thematically (skill name for npc attacks is the item name) but id is more reliable
                        .forEach((skill) => {
                            modifiers.push(createModifier(skill, times(of(multiplier), modifier.value), item, type));
                        });
                    break;
                default:
                    //mainly for internal modifiers.
                    modifiers.push(createModifier(modifierLabel, times(of(multiplier), modifier.value), item, type));
                    break;
            }
        });
        allErrors.printAll();
        return { modifiers, costModifiers };
    };
}

function createModifier(path: string, value: ScalarExpression, item: SplittermondItem, type: ModifierType): IModifier {
    return new Modifier(
        path,
        value,
        {
            name: item.name,
            type,
        },
        item
    );
}
