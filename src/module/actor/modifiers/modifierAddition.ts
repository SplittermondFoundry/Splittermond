import SplittermondActor from "../actor";
import SplittermondItem from "../../item/item";
import {splittermond} from "../../config";
import {foundryApi} from "../../api/foundryApi";
import {NpcDataModel} from "../dataModel/NpcDataModel";
import {CharacterDataModel} from "../dataModel/CharacterDataModel";
import {SpellCostReductionManager} from "../../util/costs/spellCostManagement";
import {createExpressions, normalizeModifiers, parseModifiers} from "./parsing";
import {expressions} from "./expressions/definitions";
import {evaluate} from "./expressions/evaluation";

type Regeneration = { multiplier: number, bonus: number };
const {times, of} = expressions;

interface PreparedSystem {
    spellCostReduction: SpellCostReductionManager,
    spellEnhancedCostReduction: SpellCostReductionManager,
    healthRegeneration: Regeneration,
    focusRegeneration: Regeneration,
}


function asPreparedData<T extends CharacterDataModel | NpcDataModel>(system: T): T & PreparedSystem {
    const qualifies = "healthRegeneration" in system && isRegeneration(system.healthRegeneration) &&
        "focusRegeneration" in system && isRegeneration(system.focusRegeneration) &&
        "spellCostReduction" in system && "spellEnhancedCostReduction" in system;
    if (qualifies) {
        return system as (T & PreparedSystem); //There's not really much chance for error with the type of Spell cost reduction.
    } else {
        throw new Error("System not prepared for modifiers");
    }

}

function isRegeneration(regeneration: unknown): regeneration is Regeneration {
    return !!regeneration && typeof regeneration === "object" && "multiplier" in regeneration && "bonus" in regeneration;
}

//this function is used in item.js to add modifiers to the actor
export function addModifier(actor: SplittermondActor, item: SplittermondItem, name = "", str = "", type = "", multiplier = 1) {

    function addModifierHelper(path: string, emphasis = "", value: number) {
        if (value != 0) {
            if (emphasis) {
                actor.modifier.add(path, emphasis, value, item, type, true);
            } else {
                actor.modifier.add(path, name, value * multiplier, item, type, false);
            }
        }
    }
    if (str == "") {
        return;
    }

    const data = asPreparedData(actor.system);

    const parsedResult = parseModifiers(str);
    const normalizedModifiers = normalizeModifiers(parsedResult.modifiers);
    const expressionResult = createExpressions(normalizedModifiers, data);

    const allErrors = [...parsedResult.errors, ...expressionResult.errors];

    expressionResult.modifiers.forEach(modifier => {
        const value = typeof modifier.attributes.value === "string" ?
            modifier.attributes.value :
            evaluate(times(of(multiplier), modifier.attributes.value));
        const modifierLabel = modifier.path.toLowerCase();

        if (modifier.attributes.emphasis && typeof (modifier.attributes.emphasis) !== "string") {
            allErrors.push("Emphasis attributes must be strings");
        }
        const emphasis = (modifier.attributes.emphasis ?? "")as string;
        if (typeof value === "string") {
            const itemSkill = "skill" in item.system ? item.system.skill : undefined;
            if (modifierLabel.startsWith("foreduction")) {
                data.spellCostReduction.addCostModifier(modifier.path, value, itemSkill);
            } else if (modifierLabel.toLowerCase().startsWith("foenhancedreduction")) {
                data.spellEnhancedCostReduction.addCostModifier(modifier.path, value, itemSkill);
            } else {
                allErrors.push("Cannot have a string value in a non-foreduction modifier");
            }
            return;
        }

        switch (modifierLabel) {
            case "bonuscap":
                addModifierHelper("bonuscap", "", value);
                break;
            case "speed.multiplier":
            case "gsw.mult":
                actor.derivedValues.speed.multiplier *= Math.pow(value / multiplier, multiplier);
                break;
            case "sr":
                addModifierHelper("damagereduction", "", value);
                break;
            case "handicap.shield.mod":
            case "handicap.shield":
                addModifierHelper("handicap.shield", "", value);
                break;
            case "handicap.mod":
            case "handicap":
                addModifierHelper("handicap", "", value);
                break;
            case "handicap.armor.mod":
            case "handicap.armor":
                addModifierHelper("handicap.armor", "", value);
                break;
            case "tickmalus.shield.mod":
            case "tickmalus.shield":
                addModifierHelper("tickmalus.shield", "", value);
                break;
            case "tickmalus.armor.mod":
            case "tickmalus.armor":
                addModifierHelper("tickmalus.armor", "", value);
                break;
            case "tickmalus.mod":
            case "tickmalus":
                addModifierHelper("tickmalus", "", value);
                break;
            case "woundmalus.nbrlevels":
                data.health.woundMalus.nbrLevels = value;
                break;
            case "woundmalus.mod":
                data.health.woundMalus.mod += value;
                break;
            case "woundmalus.levelmod":
                data.health.woundMalus.levelMod += value;
                break;
            case "splinterpoints":
                if ("splinterpoints" in data) {
                    data.splinterpoints.max = (data.splinterpoints?.max || 3) + value;
                }
                break;
            case "healthregeneration.multiplier":
                data.healthRegeneration.multiplier = value;
                break;
            case "focusregeneration.multiplier":
                data.focusRegeneration.multiplier = value;
                break;
            case "healthregeneration.bonus":
                data.healthRegeneration.bonus += value;
                break;
            case "focusregeneration.bonus":
                data.focusRegeneration.bonus += value;
                break;
            case "lowerfumbleresult":
                let skill = "skill" in item.system && item.system.skill ? item.system?.skill : "*";
                addModifierHelper(modifier.path + "/" + skill, "", value);
                break;
            case "generalskills":
                splittermond.skillGroups.general.forEach((skill) => {
                    addModifierHelper(skill, emphasis, value);
                });
                break;
            case "magicskills":
                splittermond.skillGroups.magic.forEach((skill) => {
                    addModifierHelper(skill, emphasis, value);
                });
                break;
            case "fightingskills":
                splittermond.skillGroups.fighting.forEach((skill) => {
                    addModifierHelper(skill, emphasis, value);
                });
                break;
            case "damage":
                actor.modifier.add("damage." + emphasis, name, value, item, type, false);
                break;
            case "weaponspeed":
                actor.modifier.add("weaponspeed." + emphasis, name, value, item, type, false);
                break;
            default:

                let element: string | undefined = splittermond.derivedAttributes.find(attr => {
                    return modifierLabel === foundryApi.localize(`splittermond.derivedAttribute.${attr}.short`).toLowerCase() || modifierLabel.toLowerCase() === foundryApi.localize(`splittermond.derivedAttribute.${attr}.long`).toLowerCase()
                });
                if (!element) {
                    element = modifier.path;
                }
                let adjustedValue = value * (element.toLowerCase() === "initiative" ? -1 : 1);
                addModifierHelper(element, emphasis, adjustedValue);

                break;
        }
    });
    if(allErrors.length > 0) {
        foundryApi.reportError(`Syntax Error in modifier-string "${str}" in ${name}!\n${allErrors.join("\n")}`);
    }
}

