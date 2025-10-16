import * as Tooltip from "./tooltip.js";
import { foundryApi } from "../api/foundryApi.ts";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel.js";

/**
 * @param {string|null} userId
 * @return {boolean}
 */
export function canEditMessageOf(userId) {
    return userId === foundryApi.currentUser.id || foundryApi.currentUser.isGM;
}

/**
 * @param {SplittermondActor} actor
 * @param {string} rollMode
 * @param {string} roll
 * @param {CheckReport} data
 * @returns {Promise<*>}
 */
export async function prepareCheckMessageData(actor, rollMode, roll, data) {
    let templateContext = {
        ...data,
        roll: roll,
        rollMode: rollMode,
        tooltip: await roll.getTooltip(),
        actions: [],
    };

    let template = "systems/splittermond/templates/chat/skill-check.hbs";

    let flagsData = data;

    let formula = new Tooltip.TooltipFormula();

    Object.keys(data.skillAttributes).forEach((key) => {
        formula.addPart(data.skillAttributes[key], game.i18n.localize(`splittermond.attribute.${key}.short`));
        formula.addOperator("+");
    });

    formula.addPart(data.skillPoints, game.i18n.localize(`splittermond.skillPointsAbbrev`));
    data.modifierElements.forEach((e) => {
        if (e.isMalus) {
            formula.addMalus(e.value, e.description);
        } else {
            formula.addBonus(e.value, e.description);
        }
    });

    templateContext.tooltip = $(templateContext.tooltip)
        .prepend(
            `
        <section class="tooltip-part">
        <p>${formula.render()}</p>
        </section>`
        )
        .wrapAll("<div>")
        .parent()
        .html();

    templateContext.degreeOfSuccessMessage = game.i18n.localize(
        `splittermond.${data.succeeded ? "success" : "fail"}Message.${Math.min(Math.abs(data.degreeOfSuccess), 5)}`
    );
    if (data.isCrit) {
        templateContext.degreeOfSuccessMessage = game.i18n.localize(`splittermond.critical`);
    }
    if (data.isFumble) {
        templateContext.degreeOfSuccessMessage = game.i18n.localize(`splittermond.fumble`);
    }

    templateContext.title = game.i18n.localize(`splittermond.skillLabel.${data.skill}`);
    templateContext.rollType = game.i18n.localize(`splittermond.rollType.${data.rollType}`);

    switch (data.type) {
        case "attack":
            templateContext.title = data.weapon.name;
            templateContext.img = data.weapon.img;
            let ticks = ["longrange", "throwing"].includes(data.weapon.skill.id) ? 3 : data.weapon.weaponSpeed;
            if (data.succeeded) {
                if (data.maneuvers.length > data.degreeOfSuccess) {
                    templateContext.degreeOfSuccessMessage = game.i18n.localize(`splittermond.grazingHit`);
                    templateContext.isGrazingHit = true;
                }

                if (data.maneuvers.length > 0) {
                    templateContext.degreeOfSuccessDescription =
                        "<h3>" + game.i18n.localize(`splittermond.maneuver`) + "</h3>";
                    templateContext.degreeOfSuccessDescription += "<ol>";
                    for (let i = 0; i < data.maneuvers.length; i++) {
                        templateContext.degreeOfSuccessDescription += `<li class="maneuver">
                        ${data.maneuvers[i].name}
                        <div class="description">${data.maneuvers[i].system.description}</div>
                        </li>`;
                    }
                    templateContext.degreeOfSuccessDescription += "</ol>";
                }
                if (data.degreeOfSuccess >= 5) {
                    ticks = ticks - 1;
                }

                templateContext.actions.push({
                    name: `${game.i18n.localize("splittermond.activeDefense")} (${game.i18n.localize("splittermond.derivedAttribute.defense.short")})`,
                    icon: "fa-shield-alt",
                    classes: "active-defense",
                    data: {
                        type: "defense",
                    },
                });

                //Officially damage modifier is a private member. We're exploiting the fact that we're using JS here
                //where the TS compile will not notice. I find this hack acceptable, because this code should be
                //migrated
                const serializedImplements = {
                    principalComponent: {
                        formula: data.weapon.damageImplements.principalComponent.damageRoll.backingRoll.formula,
                        features: data.weapon.damageImplements.principalComponent.damageRoll._features.features,
                        modifier: data.weapon.damageImplements.principalComponent.damageRoll._damageModifier,
                        damageSource: data.weapon.damageImplements.principalComponent.damageSource,
                        damageType: data.weapon.damageImplements.principalComponent.damageType,
                    },
                    otherComponents: data.weapon.damageImplements.otherComponents.map((i) => {
                        return {
                            formula: i.damageRoll.backingRoll.formula,
                            features: i.damageRoll._features.features,
                            modifier: i.damageRoll._damageModifier,
                            damageSource: i.damageSource,
                            damageType: i.damageType,
                        };
                    }),
                };
                templateContext.actions.push({
                    name: game.i18n.localize(`splittermond.damage`) + " (" + data.weapon.damage + ")",
                    icon: "fa-heart-broken",
                    classes: "rollable",
                    data: {
                        "roll-type": "damage",
                        actorId: actor.id,
                        costType: data.weapon.costType,
                        grazingHitPenalty: data.maneuvers.length * 2,
                        isGrazingHit: true,
                        damageImplements: JSON.stringify(serializedImplements),
                    },
                });
            }

            if (data.isFumble || data.degreeOfSuccess <= -5) {
                templateContext.actions.push({
                    name: game.i18n.localize("splittermond.fumbleTableLabel"),
                    icon: "fa-dice",
                    classes: "rollable",
                    data: {
                        "roll-type": "attackFumble",
                    },
                });
            }

            templateContext.actions.push({
                name: `${ticks} ` + game.i18n.localize(`splittermond.ticks`),
                icon: "fa-stopwatch",
                classes: "add-tick",
                data: {
                    ticks: ticks,
                    message: data.weapon.name,
                },
            });
            break;
        case "spell":
            foundryApi.reportError("splittermond.unknownError");
            throw new Error("Spells are handled wia the chat card module and you should not have reached this point.");
        case "defense":
            templateContext.title = data.itemData.name;
            templateContext.img = data.itemData.img;
            templateContext.rollType =
                game.i18n.localize(`splittermond.activeDefense`) +
                " | " +
                game.i18n.localize(`splittermond.rollType.${data.rollType}`);
            let tickCost = 3;
            let defenseValue = data.baseDefense;
            if (data.succeeded) {
                const itemFeatures =
                    data.itemData.itemFeatures instanceof ItemFeaturesModel
                        ? data.itemData.itemFeatures
                        : new ItemFeaturesModel(data.itemData.itemFeatures);
                defenseValue = defenseValue + 1 + data.degreeOfSuccess + itemFeatures.featureValue("Defensiv");
                templateContext.degreeOfSuccessDescription =
                    "<p style='text-align: center'><strong>" +
                    game.i18n.localize(`splittermond.derivedAttribute.${data.defenseType}.short`) +
                    `: ${defenseValue}</strong></p>`;

                if (data.degreeOfSuccess >= 5) {
                    templateContext.degreeOfSuccessDescription += `<p>${game.i18n.localize("splittermond.defenseResultDescription.outstanding")}</p>`;
                    tickCost = 2;
                }
            } else {
                if (data.degreeOfSuccess === 0) {
                    defenseValue += 1;
                }
                templateContext.degreeOfSuccessDescription =
                    "<p style='text-align: center'><strong>" +
                    game.i18n.localize(`splittermond.derivedAttribute.${data.defenseType}.short`) +
                    `: ${defenseValue}</strong></p>`;
                if (data.degreeOfSuccess === 0) {
                    templateContext.degreeOfSuccessDescription += `<p>${game.i18n.localize("splittermond.defenseResultDescription.nearmiss")}</p>`;
                }

                const fumbledFightingSkillCheck =
                    data.isFumble && !["acrobatics", "determination", "endurance"].includes(data.itemData.id);
                if (data.degreeOfSuccess <= -5 || fumbledFightingSkillCheck) {
                    if (data.itemData.id === "acrobatics") {
                        templateContext.degreeOfSuccessDescription += `<p>${game.i18n.localize("splittermond.defenseResultDescription.devastating.acrobatics")}</p>`;
                    } else if (data.itemData.id === "determination") {
                        templateContext.degreeOfSuccessDescription += `<p>${game.i18n.localize("splittermond.defenseResultDescription.devastating.determination")}</p>`;
                    } else if (data.itemData.id === "endurance") {
                        templateContext.degreeOfSuccessDescription += `<p>${game.i18n.localize("splittermond.defenseResultDescription.devastating.endurance")}</p>`;
                    } else {
                        templateContext.degreeOfSuccessDescription += `<p>${game.i18n.localize("splittermond.defenseResultDescription.devastating.melee")}</p>`;
                        templateContext.actions.push({
                            name: game.i18n.localize("splittermond.fumbleTableLabel"),
                            icon: "fa-dice",
                            classes: "rollable",
                            data: {
                                "roll-type": "attackFumble",
                            },
                        });
                    }
                }
            }

            templateContext.actions.push({
                name: `${tickCost} ` + game.i18n.localize(`splittermond.ticks`),
                icon: "fa-stopwatch",
                classes: "add-tick",
                data: {
                    ticks: tickCost,
                    message:
                        game.i18n.localize(`splittermond.activeDefense`) +
                        " (" +
                        game.i18n.localize(`splittermond.derivedAttribute.${data.defenseType}.short`) +
                        "): " +
                        templateContext.title,
                },
            });

            break;

        default:
            break;
    }

    if (data.availableSplinterpoints > 0 && !data.isFumble) {
        templateContext.actions.push({
            name: game.i18n.localize(`splittermond.splinterpoint`),
            icon: "fa-moon",
            classes: "use-splinterpoint",
        });
    }
    let checkMessageData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        rolls: [roll],
        content: await renderTemplate(template, templateContext),
        sound: CONFIG.sounds.dice,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        flags: {
            splittermond: {
                check: flagsData,
            },
        },
    };

    return ChatMessage.applyRollMode(checkMessageData, rollMode);
}

/**
 * @typedef {Object} StatusEffectMessageData
 * @property {VirtualToken} virtualToken
 * @property {number} activationNo
 * @property {number} onTick
 * @property {number} maxActivation
 */

/**
 * @param {SplittermondActor} actor
 * @param {StatusEffectMessageData} data
 * @return {Promise<{user, speaker: any, content: string, sound: string, type: (0 & CHAT_MESSAGE_STYLES) | (3 & DetectionMode.DETECTION_TYPES) | number}>}
 */
export async function prepareStatusEffectMessage(actor, data) {
    let template = "systems/splittermond/templates/chat/status-effect.hbs";
    let templateContext = {
        ...data,
        actions: [],
        title: `${data.virtualToken.name} ${data.virtualToken.level}`,
        subtitle: foundryApi.format("splittermond.combatEffect.statusEffectActivated.subtitle", {
            onTick: data.onTick,
            activationNo: data.activationNo,
            maxActivation: data.virtualToken.times,
        }),
    };

    if (data.activationNo == data.virtualToken.times) {
        templateContext.actions.push({
            name: foundryApi.localize(`splittermond.combatEffect.statusEffectActivated.remove`),
            icon: "fa-remove",
            classes: "remove-status",
            data: {
                "status-id": data.virtualToken.statusId,
            },
        });
    }

    //TODO add actions based on the status effect to allow per-button execution for effect

    let statusEffectData = {
        user: foundryApi.currentUser.id,
        speaker: foundryApi.getSpeaker({ actor: actor }),
        content: await foundryApi.renderer(template, templateContext),
        sound: CONFIG.sounds.notification,
        type: foundryApi.chatMessageTypes.OTHER,
    };
    return statusEffectData;
}
