import { splittermond } from "./module/config";
import * as Dice from "./module/util/dice";
import * as Macros from "./module/util/macros";
import SplittermondCombatTracker from "./module/apps/sidebar/combat-tracker";
import ItemImporter from "./module/util/item-importer";
import SplittermondCompendiumBrowser from "./module/apps/compendiumBrowser/compendium-browser.js";
import { registerRequestedSystemSettings } from "./module/settings";
import { initTickBarHud } from "./module/apps/tick-bar-hud/tick-bar-hud";

import { chatActionFeature } from "./module/util/chat/chatActionFeature";
import { referencesUtils } from "./module/data/references/referencesUtils";
import { foundryApi } from "./module/api/foundryApi";
import { canEditMessageOf } from "./module/util/chat";
import { initTokenActionBar } from "./module/apps/token-action-bar/token-action-bar";

import "./less/splittermond.less";
import { initTheme } from "./module/theme";
import { initializeItem } from "./module/item";
import { DamageInitializer } from "./module/util/chat/damageChatMessage/initDamage";
import { CostBase } from "./module/util/costs/costTypes";
import { DamageRoll } from "./module/util/damage/DamageRoll.js";
import { ItemFeaturesModel } from "./module/item/dataModel/propertyModels/ItemFeaturesModel.js";
import { toggleElement } from "./module/util/animatedDisplay";
import { initializeActor } from "module/actor/index.js";
import { initializeModifiers } from "module/modifiers/index.js";
import { initializeCosts } from "module/util/costs/index.js";
import { addTicks } from "module/combat/addTicks.js";
import { initializeCombat } from "module/combat/index.js";
import { closestData } from "module/data/ClosestDataMixin.js";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";

$.fn.closestData = function (dataName, defaultValue = "") {
    let value = this.closest(`[data-${dataName}]`)?.data(dataName);
    return value ?? defaultValue;
};

function handlePdf(links) {
    if (!ui.PDFoundry) {
        ui.notifications.warn(game.i18n.localize("splittermond.pdfoundry.notinstalled"));
        return;
    }

    links.split(",").forEach((link) => {
        let t = link.trim();
        let i = t.indexOf(":");
        let book = "";
        let page = 0;

        if (i > 0) {
            book = t.substring(0, i).trim();
            page = parseInt(t.substring(i + 1));
        } else {
            book = t.replace(/[0-9]*/g, "").trim();
            page = parseInt(t.replace(/[a-zA-Z]*/g, ""));
        }

        const pdf = ui.PDFoundry.findPDFDataByCode(book);
        if (pdf) {
            ui.PDFoundry.openPDF(pdf, { page });
        } else {
            ui.notifications.warn(game.i18n.localize("splittermond.pdfoundry.notfound"));
        }
    });
}

Hooks.once("ready", async function () {
    return Promise.all([initTickBarHud(game.splittermond), initTokenActionBar(game.splittermond)]).then(() => {
        console.log("Splittermond | Ready");
        foundryApi.hooks.call("splittermond.ready");
    });
});

Hooks.once("init", async function () {
    console.log(
        " __\n" +
            "(_  ._  | o _|_ _|_  _  ._ ._ _   _  ._   _|\n" +
            "__) |_) | |  |_  |_ (/_ |  | | | (_) | | (_|\n" +
            "    |"
    );
    console.log("Splittermond | Initialising Splittermond System ...");
    if (CONFIG.compatibility) {
        CONFIG.compatibility.excludePatterns.push(new RegExp("systems/splittermond/"));
        CONFIG.compatibility.excludePatterns.push(new RegExp("Splittermond"));
    }
    game.splittermond = {};
    const modifierModule = initializeModifiers();
    game.splittermond.API = {
        modifierRegistry: modifierModule.modifierRegistry,
        addTicks,
    };
    initializeActor(CONFIG.Actor, modifierModule);
    initializeItem(CONFIG, modifierModule.modifierRegistry);
    initializeCosts(modifierModule.costModifierRegistry);
    chatActionFeature(CONFIG.ChatMessage);

    initializeCombat(CONFIG.Combat);
    CONFIG.ui.combat = SplittermondCombatTracker;

    CONFIG.splittermond = {
        ...(CONFIG.splittermond ?? {}),
        ...splittermond,
    };

    initTheme();
    await registerRequestedSystemSettings();

    game.splittermond.skillCheck = Macros.skillCheck;
    game.splittermond.attackCheck = Macros.attackCheck;
    game.splittermond.itemCheck = Macros.itemCheck;
    game.splittermond.requestSkillCheck = Macros.requestSkillCheck;
    game.splittermond.importNpc = Macros.importNpc;
    game.splittermond.magicFumble = Macros.magicFumble;
    game.splittermond.attackFumble = Macros.attackFumble;
    game.splittermond.compendiumBrowser = new SplittermondCompendiumBrowser();
    Die.MODIFIERS.ri = Dice.riskModifier;

    Handlebars.registerHelper("modifierFormat", (data) => (parseInt(data) > 0 ? "+" + parseInt(data) : data));
    Handlebars.registerHelper("times", function (n, block) {
        var accum = "";
        for (var i = 0; i < n; ++i) accum += block.fn(i);
        return accum;
    });
    getTemplate(`${TEMPLATE_BASE_PATH}/chat/partials/degree-of-success-display.hbs`).then((template) => {
        Handlebars.registerPartial("degree-of-success-display", template);
    });
    getTemplate(`${TEMPLATE_BASE_PATH}/chat/partials/roll-result.hbs`).then((template) => {
        Handlebars.registerPartial("roll-result", template);
    });

    foundryApi.keybindings.register("splittermond", "paste", {
        name: foundryApi.localize("splittermond.keybindings.paste.name"),
        hint: foundryApi.localize("splittermond.keybindings.paste.hint"),
        uneditable: [
            {
                key: "KeyV",
                modifiers: ["Control"],
            },
        ],
        onDown: () => {
            if (CONFIG.debug.keybindings) {
                console.debug("Splittermond | Keybinding paste event triggered");
            }
            //Direct access of the clipboard is only allowed in a secure context (HTTPS or localhost), which not all users have.
            //Therefore, we set up a one time paste event to trigger the item importer.
            document.addEventListener("paste", (e) => ItemImporter.pasteEventhandler(e), { once: true });
            //Do not report as consumed such that the paste event gets produced.
            return false;
        },
        restricted: true,
        //Run after the default handler from foundry, we don't want to care about a document copy operation
        precedence: CONST.KEYBINDING_PRECEDENCE.DEFERRED,
    });

    if (import.meta.env.MODE !== "PROD") {
        const quenchTestsInit = (await import("./__tests__/integration/quench")).init;
        quenchTestsInit();
    }
});

Hooks.on("hotbarDrop", async (bar, data, slot) => {
    let macroData = {
        name: "",
        type: "script",
        img: "icons/svg/dice-target.svg",
        command: "",
    };

    if (data.type === "skill") {
        macroData.name = game.i18n.localize(`splittermond.skillLabel.${data.skill}`);
        macroData.command = `game.splittermond.skillCheck("${data.skill}")`;
    }
    if (data.type === "attack") {
        let actorId = data.actorId || "";
        let actor = game.actors.get(actorId);
        if (!actor) return;
        const attack = actor.attacks.find((a) => a._id === data.attackId);
        if (!attack) return;

        macroData.name = attack.name;
        macroData.img = attack.img;

        if (game.user.isGM) {
            macroData.name += ` (${actor.data.name})`;
        }

        macroData.command = `game.splittermond.attackCheck("${actorId}","${data.attackId}")`;
    }
    if (data.type === "Item") {
        if (data.id) {
            data.data = game.items.get(data.id).data;
        }
        if (data.data) {
            macroData.name = data.data.name;
            macroData.img = data.data.img;

            let actorId = data.actorId || "";

            if (actorId && game.user.isGM) {
                const actorName = game.actors.get(actorId)?.data.name;
                macroData.name += ` (${actorName})`;
            }

            macroData.command = `game.splittermond.itemCheck("${data.data.type}","${data.data.name}","${actorId}","${data.data._id}")`;
        }
    }
    if (macroData.command != "" && macroData.name != "") {
        let macro = await Macro.create(macroData, { displaySheet: false });

        game.user.assignHotbarMacro(macro, slot);
    }
});

Hooks.on("preCreateActor", async (actor) => {
    if (actor.type === "character") {
        await actor.prototypeToken.updateSource({ vision: true, actorLink: true, name: actor.name });
    }
});

Hooks.on("init", function () {
    // Patch enrichHTML function for Custom Links

    CONFIG.TextEditor.enrichers.push(
        {
            pattern: /@SkillCheck\[([^\]]+)\](?:\{([^}]*)\})?/g,
            enricher: (match, options) => {
                let skillCheckOptions = match[1];
                let label = skillCheckOptions;
                if (match.length > 2 && match[2]) {
                    label = match[2];
                }
                let parsedString = /(.+)\s*(>|gegen|gg\.)\s*([0-9]*)|(.+)/.exec(skillCheckOptions);
                let skill = "";
                let difficulty = 0;
                if (parsedString) {
                    let skillLabel = parsedString[0].trim().toLowerCase();
                    if (parsedString[3]) {
                        skillLabel = parsedString[1].trim().toLowerCase();
                        difficulty = parseInt(parsedString[3]);
                    }
                    skill = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].find(
                        (skill) =>
                            skill === skillLabel ||
                            game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase() === skillLabel
                    );
                }
                if (skill) {
                    return $(
                        `<a class="rollable" data-roll-type="skill" data-skill="${skill}" data-difficulty="${difficulty}"><i class="fas fa-dice"></i> ${label}</a>`
                    )[0];
                } else {
                    return match;
                }
            },
        },
        {
            pattern: /@RequestSkillCheck\[([^\]]+)\](?:\{([^}]*)\})?/g,
            enricher: (match, options) => {
                let requestSkillCheckOptions = match[1];
                let label = requestSkillCheckOptions;
                if (match.length > 2 && match[2]) {
                    label = match[2];
                }
                let parsedString = /(.+)\s*(>|gegen|gg\.)\s*([0-9]*)|(.+)/.exec(requestSkillCheckOptions);
                let skill = "";
                let difficulty = 0;
                if (parsedString) {
                    let skillLabel = parsedString[0].trim().toLowerCase();
                    if (parsedString[3]) {
                        skillLabel = parsedString[1].trim().toLowerCase();
                        difficulty = parseInt(parsedString[3]);
                    }
                    skill = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].find(
                        (skill) =>
                            skill === skillLabel ||
                            game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase() === skillLabel
                    );
                }
                if (skill) {
                    return $(
                        `<a class="request-skill-check" data-skill="${skill}" data-difficulty="${difficulty}"><i class="fas fa-comment"></i> ${label}</a>`
                    )[0];
                } else {
                    return match;
                }
            },
        },
        {
            pattern: /@Ticks\[([^\]]+)\](?:\{([^}]*)\})?/g,
            enricher: (match, options) => {
                let parsedString = match[1].split(",");
                let ticks = parsedString[0];
                let label = ticks;
                let message = "";

                if (match.length > 2 && match[2]) {
                    label = match[2];
                }

                if (parsedString[1]) {
                    message = parsedString[1];
                }

                return $(
                    `<a class="add-tick" data-ticks="${ticks}" data-message="${message}"><i class="fas fa-stopwatch"></i> ${label}</a>`
                )[0];
            },
        },
        {
            pattern: /@PdfLink\[([^\]]+)\](?:\{([^}]*)\})?/g,
            enricher: (match, options) => {
                let parsedString = match[1].split(",");
                let pdfcode = parsedString[0];
                let pdfpage = parsedString[1];
                let label = `${pdfcode} ` + game.i18n.localize(`splittermond.pdfoundry.page`) + ` ${pdfpage}`;

                if (match.length > 2 && match[2]) {
                    label = match[2];
                }

                return $(
                    `<a class="pdflink" data-pdfcode="${pdfcode}" data-pdfpage="${pdfpage}"><i class="fas fa-file-pdf"></i> ${label}</a>`
                )[0];
            },
        }
    );
});

/**
 *
 * @param {object} app
 * @param {HTMLElement} html
 * @param {Record<string,string>} data
 */
function commonEventHandlerHTMLEdition(app, html, data) {
    html.querySelectorAll(".rollable").forEach((el) => {
        el.addEventListener("click", (event) => {
            const element = event.target;
            const type = element.closest("[data-roll-type]").getAttribute("data-roll-type");
            if (type === "skill") {
                event.preventDefault();
                event.stopPropagation();
                console.debug("Splittermond | Invoked Skill Check handler");
                /**@type {HTMLElement}*/
                const element = event.currentTarget;
                const difficulty = element.dataset.difficulty;
                const skill = element.dataset.skill;
                Macros.skillCheck(skill, { difficulty: difficulty });
            }
        });
    });

    html.querySelectorAll(".request-skill-check").forEach((el) => {
        el.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.debug("Splittermond | Invoked Request Skill Check handler");
            /**@type {HTMLElement}*/
            const element = event.currentTarget;
            const type = element.dataset.rollType;

            const difficulty = element.dataset.difficulty;
            const skill = element.dataset.skill;
            return Macros.requestSkillCheck(skill, difficulty);
        });
    });

    html.querySelectorAll(".pdflink").forEach((el) => {
        el.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.debug("Splittermond | Invoked PDF link handler");
            /**@type {HTMLElement}*/
            const element = event.currentTarget;

            let pdfcode = element.dataset.pdfcode;
            let pdfpage = element.dataset.pdfpage;

            let pdfcodelink = pdfcode + pdfpage;

            handlePdf(pdfcodelink);
        });
    });

    html.querySelectorAll(".add-tick").forEach((el) => {
        el.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.debug("Splittermond | Invoked Tick addition handler");
            /**@type {HTMLElement}*/
            const element = event.currentTarget;
            let value = element.dataset.ticks;
            let message = element.dataset.message;
            let chatMessageId = closestData(element, "message-id");

            const speaker = foundryApi.messages.get(chatMessageId).speaker;
            let actor;
            if (speaker.token) actor = foundryApi.collections.actors.tokens[speaker.token];
            if (!actor) actor = foundryApi.getActor(speaker.actor);
            if (!actor) {
                foundryApi.informUser("splittermond.pleaseSelectAToken");
                return;
            }
            actor.addTicks(value, message);
        });
    });

    html.querySelectorAll(".maneuver").forEach((element) => {
        element.addEventListener("click", (event) => {
            let descriptionElement = element.querySelector(".description");

            if (descriptionElement.classList.contains("expanded")) {
                descriptionElement.style.display = "none";
            } else {
                descriptionElement.style.display = "block";
            }

            descriptionElement.classList.toggle("expanded");
        });
    });
}
Hooks.on("renderApplicationV2", function (app, html, data) {
    if (["JournalEntryPage"].includes(data?.document?.documentName)) {
        commonEventHandlerHTMLEdition(app, html, data);
    }
});

Hooks.on("renderItemSheet", function (app, html, data) {
    commonEventHandlerHTMLEdition(app, html[0], data);
});

Hooks.on(
    "renderChatMessageHTML",
    /**@param {HTMLElement} html*/ function (app, html, data) {
        let actor = ChatMessage.getSpeakerActor(data.message.speaker);

        if (!game.user.isGM) {
            html.querySelectorAll(".gm-only").forEach((el) => el.remove());
        }

        if (!((actor && actor.isOwner) || canEditMessageOf(data.author.id))) {
            //splittermond-chat-action is handled by chatActionFeature
            html.querySelectorAll(".actions button:not(.splittermond-chat-action):not(.active-defense)").forEach((el) =>
                el.remove()
            );
        }

        html.querySelectorAll(".actions:not(:has(button))").forEach((el) => el.remove());

        commonEventHandlerHTMLEdition(app, html, data);

        html.querySelector(".rollable")?.addEventListener("click", (event) => {
            const type = $(event.currentTarget).closestData("roll-type");

            if (type === "damage") {
                //Don't ask me why the serialized json we put into the attribute comes out deserialized, but it does.
                const serializedImplementsParsed = $(event.currentTarget).closestData("damageimplements");
                const implementsAsArray = [
                    serializedImplementsParsed.principalComponent,
                    ...serializedImplementsParsed.otherComponents,
                ];
                const damageImplements = implementsAsArray.map((i) => {
                    const features = ItemFeaturesModel.from(i.features);
                    const damageRoll = DamageRoll.from(i.formula, features);
                    //the modifier we 'reflected' from inside damage roll already accounted for "Wuchtig" so, if we reapply modifiers,
                    //we have to make sure we don't double damage by accident
                    const modifier = features.hasFeature("Wuchtig") ? Math.floor(i.modifier * 0.5) : i.modifier;
                    damageRoll.increaseDamage(modifier);
                    return {
                        damageRoll,
                        damageType: i.damageType,
                        damageSource: i.damageSource,
                    };
                });

                const costType = $(event.currentTarget).closestData("costtype") ?? "V";
                const actorId = $(event.currentTarget).closestData("actorid");
                const grazingHitPenalty = $(event.currentTarget).closestData("grazinghitpenalty") ?? 0;
                const actor = foundryApi.getActor(actorId) ?? null; //May fail if ID refers to a token
                /** @type DamageRollOptions */
                const rollOptions = {
                    costBase: CostBase.create(costType),
                    grazingHitPenalty: grazingHitPenalty,
                };
                return DamageInitializer.rollFromDamageRoll(damageImplements, rollOptions, actor).then((message) =>
                    message.sendToChat()
                );
            }

            if (type === "magicFumble") {
                event.preventDefault();
                event.stopPropagation();
                const eg = $(event.currentTarget).closestData("success");
                const costs = $(event.currentTarget).closestData("costs");
                const skill = $(event.currentTarget).closestData("skill");

                actor.rollMagicFumble(eg, costs, skill);
            }

            if (type === "attackFumble") {
                event.preventDefault();
                actor.rollAttackFumble();
            }
        });

        html.querySelectorAll(".consume").forEach((el) =>
            el.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const type = $(event.currentTarget).closestData("type");
                const value = $(event.currentTarget).closestData("value");
                const description = $(event.currentTarget).closestData("description");
                actor.consumeCost(type, value, description);
            })
        );

        html.querySelectorAll(".active-defense").forEach((el) =>
            el.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                let type = $(event.currentTarget).closestData("type");
                try {
                    const actorReference = referencesUtils.findBestUserActor();
                    actorReference.getAgent().activeDefenseDialog(type);
                } catch (e) {
                    foundryApi.informUser("splittermond.pleaseSelectAToken");
                }
            })
        );

        html.querySelectorAll(".fumble-table-result").forEach((el) =>
            el.addEventListener("click", (event) => {
                html.querySelectorAll(".fumble-table-result-item:not(.fumble-table-result-item-active)").forEach(
                    toggleElement
                );
            })
        );

        html.querySelectorAll(".use-splinterpoint").forEach((el) =>
            el.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                let chatMessageId = $(event.currentTarget).closestData("message-id");
                let message = game.messages.get(chatMessageId);

                const speaker = message.speaker;
                let actor;
                if (speaker.token) actor = game.actors.tokens[speaker.token];
                if (!actor) actor = game.actors.get(speaker.actor);

                actor.useSplinterpointBonus(message);
            })
        );

        html.querySelectorAll(".remove-status").forEach((el) =>
            el.addEventListener("click", async (event) => {
                const statusId = $(event.currentTarget).closestData("status-id");

                let chatMessageId = $(event.currentTarget).closestData("message-id");
                let message = foundryApi.messages.get(chatMessageId);

                const speaker = message.speaker;
                let actor;
                if (speaker.token) actor = game.actors.tokens[speaker.token];
                if (!actor) actor = game.actors.get(speaker.actor);

                await actor.deleteEmbeddedDocuments("Item", [statusId]);
            })
        );
    }
);

Hooks.on("renderCompendiumDirectory", (app, /**@type HTMLElement*/ html) => {
    html.querySelector(".header-actions").innerHTML += `
        <button type="button" data-action="open-compendium">
            <i class="fas fa-university"></i>
            ${foundryApi.localize("splittermond.compendiumBrowser")}
        </button>
        `;
    html.querySelector(".header-actions button[data-action='open-compendium']")?.addEventListener("click", () => {
        game.splittermond.compendiumBrowser.render(true);
    });
});
