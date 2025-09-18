import SplittermondItem from "../item/item";
import { splittermond } from "../config";
import { foundryApi } from "../api/foundryApi";
import { ICostModifier } from "../util/costs/spellCostManagement";
import { parseModifiers, processValues, Value } from "./parsing";
import { condense, Expression as ScalarExpression, of, pow, times } from "./expressions/scalar";
import { times as timesCost } from "./expressions/cost";
import Modifier from "../actor/modifier";
import { validateDescriptors } from "./parsing/validators";
import { normalizeDescriptor } from "./parsing/normalizer";
import { InverseModifier } from "../actor/InverseModifier";
import { MultiplicativeModifier } from "../actor/MultiplicativeModifier";
import type { IModifier, ModifierType } from "../actor/modifier-manager";
import type { ModifierRegistry } from "module/modifiers/ModifierRegistry";

export interface AddModifierResult {
    modifiers: IModifier[];
    costModifiers: ICostModifier[];
}

export function initAddModifier(registry: ModifierRegistry) {
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

        const parsedResult = parseModifiers(str);
        const normalizedModifiers = processValues(parsedResult.modifiers, item.actor);

        const allErrors = [...parsedResult.errors, ...normalizedModifiers.errors];
        const errorLogger = (...msg: string[]) => allErrors.push(...msg);
        const handlerCache = registry.getCache(errorLogger, item, type, of(multiplier));

        normalizedModifiers.vectorModifiers.forEach((mod) => {
            const modifierLabel = mod.path.toLowerCase();
            const itemSkill = "skill" in item.system ? item.system.skill : null;
            if (modifierLabel.startsWith("foreduction") || modifierLabel.startsWith("foenhancedreduction")) {
                const costModifier: ICostModifier = {
                    label: mod.path,
                    value: timesCost(of(multiplier), mod.value),
                    skill: itemSkill,
                };
                costModifiers.push(costModifier);
            } else {
                console.warn(
                    `Splittermond | Encountered a focus modifier for whose path '${modifierLabel} is unknown.`
                );
            }
            return;
        });

        normalizedModifiers.scalarModifiers.forEach((modifier) => {
            if (["damage", "weaponspeed"].includes(modifier.path.toLowerCase().split(".")[0])) {
                foundryApi.format("splittermond.modifiers.parseMessages.deprecatedPath", {
                    old: modifier.path,
                    new: `item.${modifier.path}`,
                    itemName: item.name,
                });
                modifier.path = `item.${modifier.path}`;
            }

            const handler = handlerCache.getHandler(modifier.path);
            //Workaround as long as we have no handler for most modifiers. Once that is the case, we can remove both if statements.
            if (handler.constructor.name !== "NoActionModifierHandler") {
                const createdModifier = handler.processModifier(modifier);
                if (createdModifier) {
                    modifiers.push(createdModifier);
                    return;
                }
            }

            const modifierLabel = modifier.path.toLowerCase();
            if (!validateAllDescriptors(modifier.attributes, allErrors)) {
                return;
            }

            switch (modifierLabel) {
                case "bonuscap":
                    modifiers.push(
                        createModifier(
                            "bonuscap",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type
                        )
                    );
                    break;
                case "speed.multiplier":
                case "gsw.mult":
                case "actor.speed.multiplier":
                    const speedModifier = new MultiplicativeModifier(
                        "actor.speedmultiplier",
                        pow(modifier.value, of(multiplier)),
                        { ...modifier.attributes, name: item.name, type },
                        item,
                        false
                    );
                    modifiers.push(speedModifier);
                    break;
                case "sr":
                    modifiers.push(
                        createModifier(
                            "damagereduction",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "handicap.shield.mod":
                case "handicap.shield":
                    modifiers.push(
                        createModifier(
                            "handicap.shield",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "handicap.mod":
                case "handicap":
                    modifiers.push(
                        createModifier(
                            "handicap",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "handicap.armor.mod":
                case "handicap.armor":
                    modifiers.push(
                        createModifier(
                            "handicap.armor",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "tickmalus.shield.mod":
                case "tickmalus.shield":
                    modifiers.push(
                        createModifier(
                            "tickmalus.shield",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "tickmalus.armor.mod":
                case "tickmalus.armor":
                    modifiers.push(
                        createModifier(
                            "tickmalus.armor",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "tickmalus.mod":
                case "tickmalus":
                    modifiers.push(
                        createModifier(
                            "tickmalus",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "woundmalus.nbrlevels":
                case "actor.woundmalus.nbrlevels":
                    modifiers.push(
                        createModifier(
                            "actor.woundmalus.nbrLevels",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type
                        )
                    );
                    break;
                case "woundmalus.mod":
                case "actor.woundmalus.mod":
                    modifiers.push(
                        createModifier(
                            "actor.woundMalus.mod",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type
                        )
                    );
                    break;
                case "woundmalus.levelmod":
                case "actor.woundmalus.levelmod":
                    modifiers.push(
                        createModifier(
                            "actor.woundMalus.levelMod",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type
                        )
                    );
                    break;
                case "splinterpoints.bonus":
                    if (!("skill" in modifier.attributes)) {
                        console.warn(
                            "Encountered a splinterpoint bonus modifier without a skill. This may be uninteded by the user."
                        );
                    } else {
                        modifier.attributes.skill = normalizeDescriptor(modifier.attributes.skill)
                            .usingMappers("skills")
                            .do();
                    }
                    const splinterpointModifier = new Modifier(
                        "splinterpoints.bonus",
                        times(of(multiplier), modifier.value),
                        {
                            name: item.name,
                            type,
                        },
                        item,
                        false
                    );
                    modifiers.push(splinterpointModifier);
                    break;
                case "splinterpoints":
                case "actor.splinterpoints":
                    modifiers.push(
                        createModifier(
                            "actor.splinterpoints",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type
                        )
                    );
                    break;
                case "healthregeneration.multiplier":
                case "actor.healthregeneration.multiplier":
                    const healthRegenModifier = new MultiplicativeModifier(
                        "actor.healthregeneration.multiplier",
                        times(of(multiplier), modifier.value),
                        { ...modifier.attributes, name: item.name, type },
                        item,
                        false
                    );
                    modifiers.push(healthRegenModifier);
                    break;
                case "focusregeneration.multiplier":
                case "actor.focusregeneration.multiplier":
                    const focusRegenModifier = new MultiplicativeModifier(
                        "actor.focusregeneration.multiplier",
                        times(of(multiplier), modifier.value),
                        { ...modifier.attributes, name: item.name, type },
                        item,
                        false
                    );
                    modifiers.push(focusRegenModifier);
                    break;
                case "healthregeneration.bonus":
                case "actor.healthregeneration.bonus":
                    modifiers.push(
                        createModifier(
                            "actor.healthregeneration.bonus",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type
                        )
                    );
                    break;
                case "focusregeneration.bonus":
                case "actor.focusregeneration.bonus":
                    modifiers.push(
                        createModifier(
                            "actor.focusregeneration.bonus",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type
                        )
                    );
                    break;
                case "lowerfumbleresult":
                    if (!("skill" in modifier.attributes) && "skill" in item.system && item.system.skill) {
                        modifier.attributes.skill = item.system.skill;
                    } else if ("skill" in modifier.attributes) {
                        modifier.attributes.skill = normalizeDescriptor(modifier.attributes.skill)
                            .usingMappers("skills")
                            .do();
                    }
                    modifiers.push(
                        createModifier(
                            "lowerfumbleresult",
                            times(of(multiplier), modifier.value),
                            modifier.attributes,
                            item,
                            type,
                            ""
                        )
                    );
                    break;
                case "generalskills":
                    //Within the foreach function the compiler cannot figure out that the type guard happens first and complains
                    //Therefore, we assign attributes to a new variable so that the order of operations is obvious.
                    const generalSkillAttributes = modifier.attributes;
                    splittermond.skillGroups.general.forEach((skill) => {
                        modifiers.push(
                            createModifier(
                                skill,
                                times(of(multiplier), modifier.value),
                                generalSkillAttributes,
                                item,
                                type
                            )
                        );
                    });
                    break;
                case "magicskills":
                    const magicSkillAttributes = modifier.attributes;
                    splittermond.skillGroups.magic.forEach((skill) => {
                        modifiers.push(
                            createModifier(
                                skill,
                                times(of(multiplier), modifier.value),
                                magicSkillAttributes,
                                item,
                                type
                            )
                        );
                    });
                    break;
                case "fightingskills":
                    const fightingSkillAttributes = modifier.attributes;
                    splittermond.skillGroups.fighting.forEach((skill) => {
                        modifiers.push(
                            createModifier(
                                skill,
                                times(of(multiplier), modifier.value),
                                fightingSkillAttributes,
                                item,
                                type
                            )
                        );
                    });
                    break;
                //This setup is a bit of a hack, it uses the (private) knowledge that Attack objects add the item id as listener to skill modifiers
                //And also sneaks in actor knowledge via item.actor
                case "npcattacks":
                    const npcAttackAttributes = modifier.attributes;
                    item.actor?.items
                        .filter((item) => item.type === "npcattack")
                        .map((item) => `skill.${item.id}`) //name would be better thematically (skill name for npc attacks is the item name) but id is more reliable
                        .forEach((skill) => {
                            modifiers.push(
                                createModifier(
                                    skill,
                                    times(of(multiplier), modifier.value),
                                    npcAttackAttributes,
                                    item,
                                    type
                                )
                            );
                        });
                    break;
                default:
                    let element: string | undefined = splittermond.derivedAttributes.find((attr) => {
                        return (
                            modifierLabel ===
                                foundryApi.localize(`splittermond.derivedAttribute.${attr}.short`).toLowerCase() ||
                            modifierLabel.toLowerCase() ===
                                foundryApi.localize(`splittermond.derivedAttribute.${attr}.long`).toLowerCase()
                        );
                    });
                    if (!element) {
                        element = modifier.path;
                    }
                    let adjustedValue = times(of(multiplier), modifier.value);
                    if (element === "initiative") {
                        const initiativeModifier = new InverseModifier(
                            "initiative",
                            condense(adjustedValue),
                            {
                                ...modifier.attributes,
                                name: modifier.attributes.emphasis ?? item.name,
                                type,
                            },
                            item,
                            !!modifier.attributes.emphasis
                        );
                        modifiers.push(initiativeModifier);
                    } else {
                        modifiers.push(createModifier(element, adjustedValue, modifier.attributes, item, type));
                    }

                    break;
            }
        });
        if (allErrors.length > 0) {
            const introMessage = foundryApi.format("splittermond.modifiers.parseMessages.allErrorMessage", {
                str,
                objectName: item.name,
            });
            foundryApi.reportError(`${introMessage}\n${allErrors.join("\n")}`);
        }

        return { modifiers, costModifiers };
    };
}

function createModifier(
    path: string,
    value: ScalarExpression,
    attributes: Record<string, string>,
    item: SplittermondItem,
    type: ModifierType,
    emphasisOverride?: string
): IModifier {
    const emphasis = emphasisOverride ?? (attributes.emphasis as string) ?? "";
    return new Modifier(
        path,
        condense(value),
        {
            ...attributes,
            name: emphasis || item.name,
            type,
        },
        item,
        !!emphasis
    );
}

/**
 * Runs the {@link validateDescriptors} function on all values of the given object. Fails if a single does not comply.
 *
 * This function is indeed a bit sketchy, as it does three things at once: a) validate, b) write an error array c) tell the compiler
 * that attributes is a-ok (or not). But it is also so incredibly concise.
 * @param attributes The attributes to validate
 * @param allErrors The array to which report validation failures
 */
function validateAllDescriptors(
    attributes: Record<string, Value>,
    allErrors: string[]
): attributes is Record<string, string> {
    const validationErrors = Object.values(attributes).flatMap((v) => validateDescriptors(v));
    if (validationErrors.length > 0) {
        allErrors.push(...validationErrors);
        return false;
    }
    return true;
}
