import {foundryApi} from "../api/foundryApi";

export default class TokenActionBar extends Application {

    constructor(options) {
        super();
        this.currentActor = undefined;

        this.updateTimeout = 0;

        this.showHotbar = false;
     
        
    }


    static get defaultOptions() {
        return foundryApi.mergeObject(super.defaultOptions, {
            template: "systems/splittermond/templates/apps/action-bar.hbs",
            id: "token-action-bar",
            popOut: false,
            minimizable: false,
            resizable: false
        });
    }

    update() {
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            if (!game.settings.get("splittermond", "showActionBar")) {
                this.currentActor = undefined;
                this.render(true);
                $("#hotbar").show(200);
                return;
            }

            let speaker = ChatMessage.getSpeaker();
            this.currentActor = undefined;
            if (speaker.token) this.currentActor = game.actors.tokens[speaker.token];
            if (!this.currentActor) this.currentActor = game.actors.get(speaker.actor);

            if (this.currentActor == undefined) {
                $("#hotbar").parent().show(200);
                if ($("#custom-hotbar").length > 0) {
                    $("#custom-hotbar").attr("style", "display: flex !important");
                }
            } else {
                if (!game.settings.get("splittermond", "showHotbarDuringActionBar")) {
                    $("#hotbar").parent().hide(200);
                    if ($("#custom-hotbar").length > 0) {
                        $("#custom-hotbar").attr("style", "display: none !important");
                    }
                }
                    
            }
            this.render(true);
        }, 100);
    }

    getData(options) {
        const data = super.getData();
        data.id = options.id;
        
        if (this.currentActor) {
            data.name = this.currentActor.isToken ? this.currentActor.token.name : this.currentActor.name;
            data.actorId = this.currentActor.id;
            data.img = this.currentActor.isToken ? this.currentActor.token.texture.src : this.currentActor.img;
            data.skills = {
                general: CONFIG.splittermond.skillGroups.general.filter(skillId => ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(skillId) ||
                (parseInt(this.currentActor.skills[skillId].points) > 0)).map(skillId => this.currentActor.skills[skillId]),
                magic: CONFIG.splittermond.skillGroups.magic.filter(skillId => ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(skillId) ||
                (parseInt(this.currentActor.skills[skillId].points) > 0)).map(skillId => this.currentActor.skills[skillId])
            }

            data.attacks = this.currentActor.attacks;

            data.weapons = this.currentActor.items.filter(item => ["weapon", "shield"].includes(item.type)).sort((a,b) => (a.sort - b.sort)).map(w => w.toObject());

            data.spells = this.currentActor.spells.reduce((result, item) => {
                if (!result[item.skill.id]) {
                    result[item.skill.id] = {
                        label: `splittermond.skillLabel.${item.skill.id}`,
                        skillValue: item.skill.value,
                        spells: []
                    };
                }
                result[item.skill.id].spells.push(item);
                return result;
            }, {});
    
            if (Object.keys(data.spells).length == 0) {
                data.spells = undefined;
            }

            data.preparedSpell = this.currentActor.items.get(this.currentActor.getFlag("splittermond", "preparedSpell"));

            data.derivedValues = this.currentActor.derivedValues;


        }

        return data;
    
    }

    activateListeners(html) {
        console.log("activateListeners");
        

        
        if (game.settings.get("splittermond", "showHotbarDuringActionBar")) {
            let bottomPosition = Math.max($("#ui-bottom").outerHeight(), $("#hotbar").outerHeight());
            if ($("#custom-hotbar").length) {
                bottomPosition = Math.max($("body").outerHeight()-$("#custom-hotbar").position().top, bottomPosition);
            }
            $(html).css({bottom: bottomPosition});
        } else {
            setTimeout(() => {
                let bottomPosition = $("#ui-bottom").outerHeight();                    
                $(html).css({bottom: bottomPosition});
            }, 200);
        }
            
        

        //if (game.settings.get("splittermond", "showHotbarDuringActionBar")) {
            
        //}

        html.find(".rollable").click(async event => {
            const type = $(event.currentTarget).closestData('roll-type');
            if (type === "skill") {
                const skill = $(event.currentTarget).closestData('skill');
                this.currentActor.rollSkill(skill);
            }

            if (type === "attack") {
                const attackId = $(event.currentTarget).closestData('attack-id');
                const prepared = $(event.currentTarget).closestData('prepared');
                if (prepared) {
                    let success = await this.currentActor.rollAttack(attackId);
                    if (success) this.currentActor.setFlag("splittermond","preparedAttack", {})
                    return;
                }
                let attack = this.currentActor.attacks.find(attack => attack.id == attackId);
                this.currentActor.addTicks(attack.weaponSpeed, `${game.i18n.localize("splittermond.attack")}: ${attack.name}`);
                this.currentActor.setFlag("splittermond", "preparedAttack", attackId);
            }
            if (type === "spell") {
                const itemId = $(event.currentTarget).closestData('item-id');
                let success = await this.currentActor.rollSpell(itemId);
                if (success) {
                    this.currentActor.setFlag("splittermond","preparedSpell", {});
                }
                
            }

            if (type === "activeDefense") {
                const defenseType = $(event.currentTarget).closestData('defense-type');
                this.currentActor.activeDefenseDialog(defenseType);
            }
        });

        html.find('.toggle-equipped').click(event => {
            const itemId = $(event.currentTarget).closestData('item-id');
            const item = this.currentActor.items.get(itemId);
            item.update({ "system.equipped": !item.system.equipped });
        });

        html.find('.prepare-spell').click(event => {
            const itemId = $(event.currentTarget).closestData('spell-id');
            const spell = this.currentActor.items.get(itemId);
            if (!spell) return;
            this.currentActor.addTicks(spell.system.castDuration, `${game.i18n.localize("splittermond.castDuration")}: ${spell.name}`);
            this.currentActor.setFlag("splittermond", "preparedSpell", itemId);
        });

        html.find('[data-action="open-sheet"]').click(event => {
            this.currentActor.sheet.render(true);
        });
    }

}

Hooks.on("ready", () => {
    if(game.splittermond === undefined){
        game.splittermond = {};
    }
    game.splittermond.tokenActionBar = new TokenActionBar();

    game.splittermond.tokenActionBar.update();

    Hooks.on("controlToken", (token, controlled) => {
        game.splittermond.tokenActionBar.update();
    });
    
    Hooks.on("updateActor", (actor, updates) => {
        if (actor.id == game.splittermond.tokenActionBar.currentActor?.id)
            game.splittermond.tokenActionBar.update();        
    });

    Hooks.on("updateToken", (scene, token, updates) => {
        if (token._id == game.splittermond.tokenActionBar.currentActor?.token?.id)
            game.splittermond.tokenActionBar.update();        
    });

    Hooks.on("updateOwnedItem", (source, item) => {
        if (source.data.id == game.splittermond.tokenActionBar.currentActor?.id)
            game.splittermond.tokenActionBar.update();        
    });

    Hooks.on("createOwnedItem", (source, item) => {
        if (source.data.id == game.splittermond.tokenActionBar.currentActor?.id)
            game.splittermond.tokenActionBar.update();        
    });

    Hooks.on("deleteOwnedItem", (source, item) => {
        if (source.data.id == game.splittermond.tokenActionBar.currentActor?.id)
            game.splittermond.tokenActionBar.update();        
    });

    Hooks.on("updateItem", (source, item) => {
        if (source?.parent?.id == game.splittermond.tokenActionBar.currentActor?.id)
            game.splittermond.tokenActionBar.update();        
    });

    Hooks.on("createItem", (source, item) => {
        if (source?.parent?.id == game.splittermond.tokenActionBar.currentActor?.id)
            game.splittermond.tokenActionBar.update();        
    });

    Hooks.on("deleteItem", (source, item) => {
        if (source?.parent?.id == game.splittermond.tokenActionBar.currentActor?.id)
            game.splittermond.tokenActionBar.update();        
    });
    
});


