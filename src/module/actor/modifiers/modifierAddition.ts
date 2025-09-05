import SplittermondActor from "../actor";
import SplittermondItem from "../../item/item";
import {splittermond} from "../../config";
import {foundryApi} from "../../api/foundryApi";
import {NpcDataModel} from "../dataModel/NpcDataModel";
import {CharacterDataModel} from "../dataModel/CharacterDataModel";
import {SpellCostReductionManager} from "../../util/costs/spellCostManagement";
import {parseModifiers, processValues, Value} from "./parsing";
import {condense, evaluate, Expression as ScalarExpression, of, pow, times} from "./expressions/scalar";
import {evaluate as evaluateCost, times as timesCost} from "./expressions/cost";
import {ModifierType} from "../modifier";
import {validateDescriptors} from "./parsing/validators";
import {normalizeDescriptor} from "./parsing/normalizer";
import {InitiativeModifier} from "../InitiativeModifier";
import {ItemModifierHandler} from "./itemModifierHandler";

type Regeneration = { multiplier: number, bonus: number };

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
export function addModifier(actor: SplittermondActor, item: SplittermondItem, str = "", type: ModifierType = null, multiplier = 1,) {

    function addInitiativeModifier(value: ScalarExpression, attributes: Record<string, string>) {
        const emphasis = (attributes.emphasis as string) ?? ""; /*conversion validated by descriptor validator*/
        if (emphasis) {
            actor.modifier.addModifier(new InitiativeModifier("initiative",condense(value),{...attributes, name: emphasis, type}, item, true));
        } else {
            actor.modifier.addModifier(new InitiativeModifier("initiative", condense(value), {...attributes, name: item.name, type}, item, false));
        }
    }

    function addModifierHelper(path: string, value: ScalarExpression, attributes: Record<string, string>, emphasisOverride?: string) {
        const emphasis = (emphasisOverride ?? attributes.emphasis as string) ?? ""; /*conversion validated by descriptor validator*/
        if (emphasis) {
            actor.modifier.add(path, {...attributes, name: emphasis, type}, condense(value), item, true);
        } else {
            actor.modifier.add(path, {...attributes, name: item.name, type}, condense(value), item, false);
        }
    }

    if (str == "") {
        return;
    }

    const data = asPreparedData(actor.system);

    const parsedResult = parseModifiers(str);
    const normalizedModifiers = processValues(parsedResult.modifiers, actor);

    const allErrors = [...parsedResult.errors, ...normalizedModifiers.errors];
    const itemModifierHandler = new ItemModifierHandler(allErrors, item, type)

    normalizedModifiers.vectorModifiers.forEach((mod) => {
        const modifierLabel = mod.path.toLowerCase();
        const itemSkill = "skill" in item.system ? item.system.skill : undefined;
        if (modifierLabel.startsWith("foreduction")) {
            data.spellCostReduction.addCostModifier(mod.path, evaluateCost(timesCost(of(multiplier), mod.value)), itemSkill);
        } else if (modifierLabel.toLowerCase().startsWith("foenhancedreduction")) {
            data.spellEnhancedCostReduction.addCostModifier(mod.path, evaluateCost(timesCost(of(multiplier), mod.value)), itemSkill);
        } else {
            console.warn(`Splittermond | Encountered a focus modifier for whose path '${modifierLabel} is unknown.`)
        }
        return;
    })

    normalizedModifiers.scalarModifiers.forEach(modifier => {
        const modifierLabel = modifier.path.toLowerCase();

        if (!validateAllDescriptors(modifier.attributes, allErrors)) {
            return;
        }

        switch (modifierLabel) {
            case "bonuscap":
                addModifierHelper("bonuscap", times(of(multiplier), modifier.value), modifier.attributes );
                break;
            case "speed.multiplier":
            case "gsw.mult":
            case "actor.speed.multiplier":
                addModifierHelper("actor.speedmultiplier", pow(modifier.value,of(multiplier)), modifier.attributes, "");
                break;
            case "sr":
                addModifierHelper("damagereduction", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "handicap.shield.mod":
            case "handicap.shield":
                addModifierHelper("handicap.shield", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "handicap.mod":
            case "handicap":
                addModifierHelper("handicap", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "handicap.armor.mod":
            case "handicap.armor":
                addModifierHelper("handicap.armor", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "tickmalus.shield.mod":
            case "tickmalus.shield":
                addModifierHelper("tickmalus.shield", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "tickmalus.armor.mod":
            case "tickmalus.armor":
                addModifierHelper("tickmalus.armor", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "tickmalus.mod":
            case "tickmalus":
                addModifierHelper("tickmalus", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "woundmalus.nbrlevels":
            case "actor.woundmalus.nbrlevels":
                addModifierHelper("actor.woundmalus.nbrLevels", times(of(multiplier), modifier.value), modifier.attributes);
                break;
            case "woundmalus.mod":
            case "actor.woundmalus.mod":
                addModifierHelper("actor.woundMalus.mod", times(of(multiplier), modifier.value), modifier.attributes);
                break;
            case "woundmalus.levelmod":
            case "actor.woundmalus.levelmod":
                addModifierHelper("actor.woundMalus.levelMod", times(of(multiplier), modifier.value), modifier.attributes);
                break;
            case "splinterpoints.bonus":
                if (!("skill" in modifier.attributes)) {
                    console.warn("Encountered a splinterpoint bonus modifier without a skill. This may be uninteded by the user.")
                } else {
                    modifier.attributes.skill = normalizeDescriptor(modifier.attributes.skill).usingMappers("skills").do();
                }
                actor.modifier.add("splinterpoints.bonus", {
                    name: item.name,
                    type
                }, times(of(multiplier), modifier.value), item, false);
                break;
            case "splinterpoints":
            case "actor.splinterpoints":
                addModifierHelper("actor.splinterpoints", times(of(multiplier), modifier.value), modifier.attributes);
                break;
            case "healthregeneration.multiplier":
            case "actor.healthregeneration.multiplier":
                addModifierHelper("actor.healthregeneration.multiplier", times(of(multiplier), modifier.value), modifier.attributes);
                break;
            case "focusregeneration.multiplier":
                data.focusRegeneration.multiplier = evaluate(times(of(multiplier), modifier.value));
                break;
            case "healthregeneration.bonus":
                data.healthRegeneration.bonus += evaluate(times(of(multiplier), modifier.value));
                break;
            case "focusregeneration.bonus":
                data.focusRegeneration.bonus += evaluate(times(of(multiplier), modifier.value));
                break;
            case "lowerfumbleresult":
                if (!("skill" in modifier.attributes) && "skill" in item.system && item.system.skill) {
                    modifier.attributes.skill = item.system.skill;
                } else if ("skill" in modifier.attributes) {
                    modifier.attributes.skill = normalizeDescriptor(modifier.attributes.skill).usingMappers("skills").do();
                }
                addModifierHelper("lowerfumbleresult", times(of(multiplier), modifier.value), modifier.attributes, "");
                break;
            case "generalskills":
                //Within the foreach function the compiler cannot figure out that the type guard happens first and complains
                //Therefore, we assign attributes to a new variable so that the order of operations is obvious.
                const generalSkillAttributes = modifier.attributes;
                splittermond.skillGroups.general.forEach((skill) => {
                    addModifierHelper(skill, times(of(multiplier), modifier.value), generalSkillAttributes);
                });
                break;
            case "magicskills":
                const magicSkillAttributes = modifier.attributes;
                splittermond.skillGroups.magic.forEach((skill) => {
                    addModifierHelper(skill, times(of(multiplier), modifier.value), magicSkillAttributes);
                });
                break;
            case "fightingskills":
                const fightingSkillAttributes = modifier.attributes;
                splittermond.skillGroups.fighting.forEach((skill) => {
                    addModifierHelper(skill, times(of(multiplier), modifier.value), fightingSkillAttributes);
                });
                break;
            //This setup is a bit of a hack, it uses the (private) knowledge that Attack objects add the item id as listener to skill modifiers
            //And also sneaks in actor knowledge via item.actor
            case "npcattacks":
                const npcAttackAttributes = modifier.attributes;
                item.actor?.items
                    .filter(item => item.type === "npcattack")
                    .map(item => `skill.${item.id}`) //name would be better thematically (skill name for npc attacks is the item name) but id is more reliable
                    .forEach((skill) => {
                        addModifierHelper(skill, times(of(multiplier), modifier.value), npcAttackAttributes);
                    });
                break;
            case "damage":
                modifier.path = "item.damage";
                foundryApi.format("splittermond.modifiers.parseMessages.deprecatedPath",{old: "damage", new: "item.damage", itemName: item.name});
                actor.modifier.addModifier(itemModifierHandler.convertToDamageModifier(modifier));
                break;
            case "item.damage":
                actor.modifier.addModifier(itemModifierHandler.convertToDamageModifier(modifier));
                break;
            case "weaponspeed":
                modifier.path = "item.weaponspeed";
                foundryApi.format("splittermond.modifiers.parseMessages.deprecatedPath",{old: "weaponspeed", new: "item.weaponspeed", itemName: item.name});
                actor.modifier.addModifier(itemModifierHandler.convertToWeaponSpeedModifier(modifier));
                break;
            case "item.weaponspeed":
                actor.modifier.addModifier(itemModifierHandler.convertToWeaponSpeedModifier(modifier));
                break;
            case "item.addfeature":
            case "item.mergefeature":
                actor.modifier.addModifier(itemModifierHandler.convertToItemFeatureModifier(modifier));
                return
            default:
                let element: string | undefined = splittermond.derivedAttributes.find(attr => {
                    return modifierLabel === foundryApi.localize(`splittermond.derivedAttribute.${attr}.short`).toLowerCase() || modifierLabel.toLowerCase() === foundryApi.localize(`splittermond.derivedAttribute.${attr}.long`).toLowerCase()
                });
                if (!element) {
                    element = modifier.path;
                }
                let adjustedValue = times(of(multiplier), modifier.value);
                if(element === "initiative") {
                    addInitiativeModifier(adjustedValue, modifier.attributes);
                }else {
                    addModifierHelper(element, adjustedValue, modifier.attributes);
                }

                break;
        }
    });
    if (allErrors.length > 0) {
        const introMessage = foundryApi.format("splittermond.modifiers.parseMessages.allErrorMessage", {
            str,
            objectName: item.name
        });
        foundryApi.reportError(`${introMessage}\n${allErrors.join("\n")}`);
    }
}

/**
 * Runs the {@link validateDescriptors} function on all values of the given object. Fails if a single does not comply.
 *
 * This function is indeed a bit sketchy, as it does three things at once: a) validate, b) write an error array c) tell the compiler
 * that attributes is a-ok (or not). But it is also so incredibly concise.
 * @param attributes The attributes to validate
 * @param allErrors The array to which report validation failures
 */
function validateAllDescriptors(attributes: Record<string, Value>, allErrors: string[]): attributes is Record<string, string> {
    const validationErrors = Object.values(attributes).flatMap(v => validateDescriptors(v));
    if (validationErrors.length > 0) {
        allErrors.push(...validationErrors);
        return false;
    }
    return true;
}