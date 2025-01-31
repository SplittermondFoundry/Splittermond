import SplittermondActor from "./module/actor/actor.js";
import SplittermondItem from "./module/item/item.js";
import SplittermondCharacterSheet from "./module/actor/sheets/character-sheet.js";
import SplittermondNPCSheet from "./module/actor/sheets/npc-sheet.js";
import SplittermondItemSheet from "./module/item/sheets/item-sheet.js";
import SplittermondSpellSheet from "./module/item/sheets/spell-sheet.js";
import SplittermondWeaponSheet from "./module/item/sheets/weapon-sheet.js";
import SplittermondShieldSheet from "./module/item/sheets/shield-sheet.js";
import SplittermondArmorSheet from "./module/item/sheets/armor-sheet.js";
import SplittermondAttackSheet from "./module/item/sheets/attack-sheet.js";
import ApplyDamageDialog from "./module/apps/dialog/apply-damage-dialog.js";
import { splittermond } from "./module/config.js";
import * as Dice from "./module/util/dice.js"
import * as Macros from "./module/util/macros.js"
import SplittermondCombat from "./module/combat/combat.js";
import SplittermondCombatTracker from "./module/apps/sidebar/combat-tracker.js";
import ItemImporter from "./module/util/item-importer.js";
import SplittermondCompendiumBrowser from "./module/apps/compendiumBrowser/compendium-browser.js";
import { registerSystemSettings } from "./module/settings.js";
import TickBarHud from "./module/apps/tick-bar-hud.js";
import TokenActionBar from "./module/apps/token-action-bar.js";

import {init as quenchTestsInit} from "./__tests__/integration/quench.ts";
import {chatActionFeature} from "./module/util/chat/chatActionFeature.ts";
import SplittermondWeaponItem from "./module/item/weapon.js";
import SplittermondShieldItem from "./module/item/shield.js";
import SplittermondArmorItem from "./module/item/armor.js";
import SplittermondSpellItem from "./module/item/spell.js";
import SplittermondEquipmentItem from "./module/item/equipment.js";
import SplittermondNPCAttackItem from "./module/item/npcattack.js";
import SplittermondMastery from "./module/item/mastery.js";
import {referencesUtils} from "./module/data/references/referencesUtils.ts";
import {foundryApi} from "./module/api/foundryApi.ts";
import {canEditMessageOf} from "./module/util/chat.js";

import './less/splittermond.less';
import {CharacterDataModel} from "./module/actor/dataModel/CharacterDataModel";
import {NpcDataModel} from "./module/actor/dataModel/NpcDataModel";
import {initializeItem} from "./module/item";


$.fn.closestData = function (dataName, defaultValue = "") {
    let value = this.closest(`[data-${dataName}]`)?.data(dataName);
    return  value ?? defaultValue;
};

function handlePdf(links) {
    if(!ui.PDFoundry){
        ui.notifications.warn(game.i18n.localize("splittermond.pdfoundry.notinstalled"))
        return
    }

    links.split(',').forEach(link => {
        let t = link.trim();
        let i = t.indexOf(':');
        let book = '';
        let page = 0;

        if (i > 0) {
            book = t.substring(0, i).trim();
            page = parseInt(t.substring(i + 1));
        } else {
            book = t.replace(/[0-9]*/g, '').trim()
            page = parseInt(t.replace(/[a-zA-Z]*/g, ''))
        }

        const pdf = ui.PDFoundry.findPDFDataByCode(book)
        if (pdf) {
            ui.PDFoundry.openPDF(pdf, {page})
        } else {
            ui.notifications.warn(game.i18n.localize("splittermond.pdfoundry.notfound"))
        }
});
};

Hooks.once("ready", function () {
    game.splittermond.tickBarHud = new TickBarHud();
});

Hooks.once("init", function () {
    console.log(
        " __\n"+
        "(_  ._  | o _|_ _|_  _  ._ ._ _   _  ._   _|\n" +
        "__) |_) | |  |_  |_ (/_ |  | | | (_) | | (_|\n" +
        "    |");
    console.log("Splittermond | Initialising Splittermond System ...");
    if (CONFIG.compatibility) {
        CONFIG.compatibility.excludePatterns.push(new RegExp("systems/splittermond/"));
        CONFIG.compatibility.excludePatterns.push(new RegExp("Splittermond"));
    }

    CONFIG.Actor.documentClass = SplittermondActor;
    CONFIG.Actor.dataModels.character = CharacterDataModel;
    CONFIG.Actor.dataModels.npc = NpcDataModel;

    initializeItem();

    CONFIG.Combat.documentClass = SplittermondCombat;
    CONFIG.ui.combat = SplittermondCombatTracker;

    CONFIG.splittermond = {
        ...(CONFIG.splittermond ?? {}),
        ...splittermond};


    registerSystemSettings();

    game.splittermond = {
        skillCheck: Macros.skillCheck,
        attackCheck: Macros.attackCheck,
        itemCheck: Macros.itemCheck,
        requestSkillCheck: Macros.requestSkillCheck,
        importNpc: Macros.importNpc,
        magicFumble: Macros.magicFumble,
        attackFumble: Macros.attackFumble,
        heroLevel: CONFIG.splittermond.heroLevel.map(function (x) { return x * game.settings.get("splittermond", "HGMultiplier") }),
        compendiumBrowser: new SplittermondCompendiumBrowser()
    }
    Die.MODIFIERS.ri = Dice.riskModifier;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("splittermond", SplittermondCharacterSheet, {
        types: ["character"],
        makeDefault: true,
        label: "splittermond.character"
    });

    Actors.registerSheet("splittermond", SplittermondNPCSheet, {
        types: ["npc"],
        makeDefault: true,
        label: "splittermond.npc"
    });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("splittermond", SplittermondItemSheet, {
        makeDefault: true
    });
    Items.registerSheet("splittermond", SplittermondSpellSheet, {
        types: ["spell"],
        makeDefault: true,
        label: "splittermond.spell"
    });
    Items.registerSheet("splittermond", SplittermondWeaponSheet, {
        types: ["weapon"],
        makeDefault: true,
        label: "splittermond.weapon"
    });
    Items.registerSheet("splittermond", SplittermondShieldSheet, {
        types: ["shield"],
        makeDefault: true,
        label: "splittermond.shield"
    });
    Items.registerSheet("splittermond", SplittermondArmorSheet, {
        types: ["armor"],
        makeDefault: true,
        label: "splittermond.armor"
    });
    Items.registerSheet("splittermond", SplittermondAttackSheet, {
        types: ["npcattack"],
        makeDefault: true,
        label: "splittermond.npcattack"
    });


    const templateBasePath = "systems/splittermond/templates"

    loadTemplates([
        // Actor Partials
        `${templateBasePath}/sheets/actor/parts/attribute-input.hbs`,
        `${templateBasePath}/sheets/actor/parts/derived-attributes.hbs`,
        `${templateBasePath}/sheets/actor/parts/focus-health.hbs`,
        `${templateBasePath}/sheets/actor/parts/mastery-list.hbs`,
        `${templateBasePath}/sheets/actor/parts/spells-list.hbs`,
        `${templateBasePath}/sheets/actor/parts/combat-actions.hbs`,
        `${templateBasePath}/sheets/actor/parts/inventory-list.hbs`,
        `${templateBasePath}/sheets/actor/parts/status-tab.hbs`
    ]);

    Handlebars.registerHelper('times', function (n, block) {
        var accum = '';
        for (var i = 0; i < n; ++i)
            accum += block.fn(i);
        return accum;
    });
    getTemplate(`${templateBasePath}/chat/partials/degree-of-success-display.hbs`)
        .then(template => {Handlebars.registerPartial("degree-of-success-display", template)});
    getTemplate(`${templateBasePath}/chat/partials/roll-result.hbs`)
        .then(template => {Handlebars.registerPartial("roll-result", template)});

    //if (game.data.version.startsWith("0.")) {
        document.addEventListener('paste', (e) => ItemImporter.pasteEventhandler(e), false);
        /*
        
    } else {
        document.addEventListener('paste', (e) => ItemImporter.pasteEventhandler(e), false);
        game.keybindings.register("splittermond", "paste", {
            name: "KEYBINDINGS.Paste",
            restricted: true,
            uneditable: [
                {key: "V", modifiers: [ "CONTROL" ]}
            ],
            onDown: (e) => {ItemImporter.pasteEventhandler(e)},
            reservedModifiers: [ "ALT", "SHIFT" ]
        });
    }
    */  
    quenchTestsInit(); //starts quench tests when ready
    console.log("Splittermond | DONE!");
});

Hooks.on("redraw-combat-tick", async () => {
    await game.splittermond.tickBarHud.render(false);

    //yes i know this is not ideal, but either this or a websocket lib like https://github.com/manuelVo/foundryvtt-socketlib to signal the update of the combat tracker
    //Update: Since foundry now has its own socket system, this should maybe be changed?
    const currentScene = game.scenes.current?.id || null;    
    let activeCombat = game.combats.find(c => (c.scene === null) || (c.scene.id === currentScene));
    if(activeCombat == null)
    {
        return;
    }
    
    var combatant = activeCombat.combatants.contents[0];
    if(combatant == null)
    {
        return;
    }       
    
    await game.combat.setInitiative(combatant.id, combatant.initiative);
});

Hooks.on("hotbarDrop", async (bar, data, slot) => {
    let macroData = {
        name: "",
        type: "script",
        img: "icons/svg/dice-target.svg",
        command: ""
    };

    if (data.type === "skill") {
        macroData.name = game.i18n.localize(`splittermond.skillLabel.${data.skill}`);
        macroData.command = `game.splittermond.skillCheck("${data.skill}")`;
    };

    if (data.type === "attack") {
        let actorId = data.actorId || "";
        let actor = game.actors.get(actorId);
        if (!actor) return;
        const attack = actor.attacks.find(a => a._id === data.attackId);
        if (!attack) return;

        macroData.name = attack.name;
        macroData.img = attack.img;



        if (game.user.isGM) {
            macroData.name += ` (${actor.data.name})`;
        }

        macroData.command = `game.splittermond.attackCheck("${actorId}","${data.attackId}")`;

    };

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
    };


    if (macroData.command != "" && macroData.name != "") {
        let macro = await Macro.create(macroData, { displaySheet: false });

        game.user.assignHotbarMacro(macro, slot);
    }



});

Hooks.on('preCreateActor', async (actor) => {
    if (actor.type === 'character') {
        await actor.prototypeToken.updateSource({vision: true, actorLink: true, name: actor.name});
    }
});

Hooks.on('init', function(){

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
                    skill = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].find((skill) => skill === skillLabel || game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase() === skillLabel);
                }
                if (skill) {
                    return $(`<a class="rollable" data-roll-type="skill" data-skill="${skill}" data-difficulty="${difficulty}"><i class="fas fa-dice"></i> ${label}</a>`)[0]
                } else {
                    return match;
                }
            }
        },
        {
            pattern:/@RequestSkillCheck\[([^\]]+)\](?:\{([^}]*)\})?/g,
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
                    skill = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].find((skill) => skill === skillLabel || game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase() === skillLabel);
                }
                if (skill) {
                    return $(`<a class="request-skill-check" data-skill="${skill}" data-difficulty="${difficulty}"><i class="fas fa-comment"></i> ${label}</a>`)[0]
                } else {
                    return match;
                }
            }
        },
        {
            pattern:/@Ticks\[([^\]]+)\](?:\{([^}]*)\})?/g,
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

                return $(`<a class="add-tick" data-ticks="${ticks}" data-message="${message}"><i class="fas fa-stopwatch"></i> ${label}</a>`)[0]
            }
        },
        {
            pattern:/@PdfLink\[([^\]]+)\](?:\{([^}]*)\})?/g,
            enricher: (match, options) => {
                let parsedString = match[1].split(",");
                let pdfcode = parsedString[0];
                let pdfpage = parsedString[1];
                let label = `${pdfcode} ` + game.i18n.localize(`splittermond.pdfoundry.page`) + ` ${pdfpage}`;
                
                if (match.length > 2 && match[2]) {
                    label = match[2];
                }
    
                return $(`<a class="pdflink" data-pdfcode="${pdfcode}" data-pdfpage="${pdfpage}"><i class="fas fa-file-pdf"></i> ${label}</a>`)[0];
            }
        });

})

function commonEventHandler(app, html, data) {
    
    html.find(".rollable").click(event => {
        
        const type = $(event.currentTarget).closestData("roll-type");
        if (type === "skill") {
            event.preventDefault();
            event.stopPropagation()
            const difficulty = $(event.currentTarget).closestData("difficulty");
            const skill = $(event.currentTarget).closestData("skill");
            Macros.skillCheck(skill, {difficulty: difficulty});
        }

    });

    html.find(".request-skill-check").click(event => {
        event.preventDefault();
        event.stopPropagation()
        const type = $(event.currentTarget).closestData("roll-type");

        const difficulty = $(event.currentTarget).closestData("difficulty");
        const skill = $(event.currentTarget).closestData("skill");

        Macros.requestSkillCheck(skill,difficulty);

    });

    html.find(".pdflink").click(event => {
        event.preventDefault();
        event.stopPropagation();

        let pdfcode = $(event.currentTarget).closestData("pdfcode");
        let pdfpage = $(event.currentTarget).closestData("pdfpage");

        let pdfcodelink = pdfcode + pdfpage;

        handlePdf(pdfcodelink);
    });

    html.find(".add-tick").click(event => {
        event.preventDefault();
        event.stopPropagation()
        let value = $(event.currentTarget).closestData("ticks");
        let message = $(event.currentTarget).closestData("message");
        let chatMessageId = $(event.currentTarget).closestData("message-id");
        
        const speaker = game.messages.get(chatMessageId).speaker;
        let actor;
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        if (!actor) actor = game.actors.get(speaker.actor);
        if (!actor) {
            ui.notifications.info(game.i18n.localize("splittermond.pleaseSelectAToken"));
            return
        };
        
        actor.addTicks(value, message);
    });

    html.find(".maneuver").click(event => {
        let descriptionElement = $(event.currentTarget).find(".description")

        if (descriptionElement.hasClass("expanded")) {
            descriptionElement.slideUp(200);
        } else {
            descriptionElement.slideDown(200);
        }

        descriptionElement.toggleClass("expanded");


    });

}

Hooks.on('renderJournalPageSheet',  function (app, html, data) {
    commonEventHandler(app, html, data);


});

Hooks.on('renderItemSheet',  function (app, html, data) {
    commonEventHandler(app, html, data);
});

Hooks.on('renderChatMessage', function (app, html, data) {
    let actor = ChatMessage.getSpeakerActor(data.message.speaker);

    if (!game.user.isGM) {
        html.find(".gm-only").remove();
    }

    if (!((actor && actor.isOwner) || canEditMessageOf(data.author.id))) {
        //splittermond-chat-action is handled by chatActionFeature
        html.find(".actions button").not(".splittermond-chat-action").not(".active-defense").remove();
    }

    
    html.find(".actions").not(":has(button)").remove();

    commonEventHandler(app, html, data)

    html.find(".rollable").click(event => {
        
        const type = $(event.currentTarget).closestData("roll-type");

        if (type === "damage") {
            const damage = $(event.currentTarget).closestData("damage");
            const features = $(event.currentTarget).closestData("features");
            const source = $(event.currentTarget).closestData("source");
            Dice.damage(damage, features, source);
        }

        if (type === "magicFumble") {
            event.preventDefault();
            event.stopPropagation()
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

    html.find(".consume").click(event => {
        event.preventDefault();
        event.stopPropagation()
        const type = $(event.currentTarget).closestData('type');
        const value = $(event.currentTarget).closestData('value');
        const description = $(event.currentTarget).closestData('description');
        actor.consumeCost(type, value, description);
    });

    html.find(".apply-damage").click(event => {
        event.preventDefault();
        event.stopPropagation()
        let value = $(event.currentTarget).closestData("damage");
        let type = $(event.currentTarget).closestData("type");
        let source = $(event.currentTarget).closestData("source");
        ApplyDamageDialog.create(value,type, source);
    });

    html.find(".active-defense").click(event => {
        event.preventDefault();
        event.stopPropagation()
        let type = $(event.currentTarget).closestData("type");
        try {
            const actorReference = referencesUtils.findBestUserActor();
            actorReference.getAgent().activeDefenseDialog(type)
        }catch(e){
            foundryApi.informUser("splittermond.pleaseSelectAToken")
        }
    });

    html.find(".fumble-table-result").click(event => {
        html.find(".fumble-table-result-item").not(".fumble-table-result-item-active").toggle(200);
    });

    html.find(".use-splinterpoint").click(event => {
        event.preventDefault();
        event.stopPropagation()
        
        let chatMessageId = $(event.currentTarget).closestData("message-id");
        let message = game.messages.get(chatMessageId);
        
        const speaker = message.speaker;
        let actor;
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        if (!actor) actor = game.actors.get(speaker.actor);
        
        actor.useSplinterpointBonus(message);
    });

    html.find('.remove-status').click(async event => {
        const statusId = $(event.currentTarget).closestData('status-id');

        let chatMessageId = $(event.currentTarget).closestData("message-id");
        let message = game.messages.get(chatMessageId);
        
        const speaker = message.data.speaker;
        let actor;
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        if (!actor) actor = game.actors.get(speaker.actor);

        await actor.deleteEmbeddedDocuments("Item", [statusId]);
        await Hooks.call("redraw-combat-tick");
    });

});

Hooks.on("renderCompendiumDirectory", (app, html, data) => {
    const compendiumBrowserButton = $(`<button><i class="fas fa-university"></i>${game.i18n.localize("splittermond.compendiumBrowser")}</button>`).click(() => { game.splittermond.compendiumBrowser.render(true) });
    html.find(".header-actions").append(compendiumBrowserButton);
});

chatActionFeature()
