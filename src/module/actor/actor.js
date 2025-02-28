import * as Dice from "../util/dice.js"

import CheckDialog from "../apps/dialog/check-dialog.js";
import * as Chat from "../util/chat.js";

import Attribute from "./attribute.js";
import Skill from "./skill.js";
import DerivedValue from "./derived-value.js";
import ModifierManager from "./modifier-manager.js";
import Attack from "./attack.js";
import ActiveDefense from "./active-defense.js";
import {parseCostString} from "../util/costs/costParser.ts";
import {initializeSpellCostManagement} from "../util/costs/spellCostManagement.ts";
import {settings} from "../settings";
import {splittermond} from "../config.js";
import {foundryApi} from "../api/foundryApi";

/** @type ()=>number */
let getHeroLevelMultiplier = () => 1;

/**@return number[]*/
export function calculateHeroLevels() {
    const baseHeroLevels = [...splittermond.heroLevel];
    const multplier = getHeroLevelMultiplier();
    return baseHeroLevels.map((l) => l * multplier);
}


settings.registerNumber("HGMultiplier", {
    position: 1,
    scope: "world",
    config: true,
    default: 1.0,
    range: {
        min: 0.5,
        max: 2.0,
        step: 0.25
    },
    onChange: (mult) => {
        console.log("Splittermond | adjusted hero level");
        game.splittermond.heroLevel = calculateHeroLevels();
        game.actors.forEach((actor) => {
            if (actor.type === "character") {
                actor.prepareData();
            }
        });
    }
}).then(accessor => getHeroLevelMultiplier = accessor.get)

export default class SplittermondActor extends Actor {

    /**@type {Record<DamageType, number>} */
    _susceptibilities = {
        physical: 0,
        mental: 0,
        electric: 0,
        acid: 0,
        rock: 0,
        fire: 0,
        heat: 0,
        cold: 0,
        poison: 0,
        bleeding: 0,
        disease: 0,
        light:0,
        shadow:0,
    };

    actorData() {
        return this.system;
    }

    /*
    Prepare Base Data Model
    */
    prepareBaseData() {
        //console.log(`prepareBaseData() - ${this.type}: ${this.name}`);/a
        super.prepareBaseData();
        this.modifier = new ModifierManager();

        if (!this.attributes) {
            this.attributes = CONFIG.splittermond.attributes.reduce((obj, id) => {
                obj[id] = new Attribute(this, id);
                return obj;
            }, {});
        }

        if (!this.derivedValues) {
            this.derivedValues = CONFIG.splittermond.derivedValues.reduce((obj, id) => {
                obj[id] = new DerivedValue(this, id);
                return obj;
            }, {});
        }

        if (!this.skills) {
            this.skills = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].reduce((obj, id) => {
                obj[id] = new Skill(this, id);
                return obj;
            }, {});
        }

        [...Object.values(this.attributes), ...Object.values(this.derivedValues), ...Object.values(this.skills)].forEach(e => e.disableCaching());
        [...Object.values(this.attributes)].forEach(e => e.enableCaching());
        let data = this.system;


        this.attacks = [];
        this.activeDefense = {
            defense: [],
            mindresist: [],
            bodyresist: []
        }

        this.system.lowerFumbleResult = 0;

        if (!data.health) {
            data.health = {
                "consumed": {
                    "value": 0
                },
                "exhausted": {
                    "value": 0
                },
                "channeled": {
                    "entries": []
                }
            }
        }

        if (!data.focus) {
            data.focus = {
                "consumed": {
                    "value": 0
                },
                "exhausted": {
                    "value": 0
                },
                "channeled": {
                    "entries": []
                }
            }
        }

        if (!data.activeDefense) {
            data.activeDefense = {
                defense: [],
                bodyresist: [],
                mindresist: []
            }
        }


        data.health.woundMalus = {
            nbrLevels: 5,
            level: 0,
            value: 0,
            mod: 0,
            levelMod: 0
        }

        data = initializeSpellCostManagement(data);

        if (this.type === "character") {
            data.focusRegeneration = {
                multiplier: 2,
                bonus: 0
            };

            data.healthRegeneration = {
                multiplier: 2,
                bonus: 0
            };


            const heroLevels = calculateHeroLevels();
            data.experience.heroLevel = heroLevels.reduce((acc, minXP) => acc + ((minXP <= data.experience.spent) ? 1 : 0), 0);
            data.experience.nextLevelValue = heroLevels[Math.min(data.experience.heroLevel, 3)];
            data.experience.percentage = data.experience.spent - heroLevels[Math.min(Math.max(data.experience.heroLevel - 1, 0), 3)];
            data.experience.percentage /= data.experience.nextLevelValue;
            data.experience.percentage = Math.min(data.experience.percentage * 100, 100);

            if (!data.splinterpoints) {
                data.splinterpoints = {
                    max: 3
                };
            } else {
                data.splinterpoints.max = 3;
            }
        }

        if (this.type === "npc") {
            if (parseInt(this.system.damageReduction.value) != 0) {
                this.modifier.add("damagereduction", game.i18n.localize("splittermond.damageReductionAbbrev"), this.system.damageReduction.value);
            }

        }

    }

    get bonusCap() {
        return this.type === "npc" ? 6 : this.system.experience.heroLevel + 2 + this.modifier.value("bonuscap");
    }

    /**@return {{value:number, max:number}}*/
    get splinterpoints() {
        return this.system.splinterpoints ?? {value: 0, max: 0};
    }

    prepareEmbeddedDocuments() {
        [...Object.values(this.attributes), ...Object.values(this.derivedValues), ...Object.values(this.skills)].forEach(e => e.disableCaching());
        Object.values(this.derivedValues).forEach(v => {
            v.multiplier = 1;
        });
        super.prepareEmbeddedDocuments();
        this.items.forEach(item => item.prepareActorData());
    }

    prepareDerivedData() {
        //console.log(`prepareDerivedData() - ${this.type}: ${this.name}`);

        super.prepareDerivedData();

        this.spells = (this.items.filter(i => i.type === "spell") || []);
        this.spells.sort((a, b) => (a.sort - b.sort));

        this._prepareModifier();

        this._prepareHealthFocus();

        [...Object.values(this.attributes), ...Object.values(this.derivedValues), ...Object.values(this.skills)].forEach(e => e.enableCaching());

        this._prepareAttacks();

        this._prepareActiveDefense();

        if (this.type == "character") {
            this.system.splinterpoints.max += this.modifier.value("splinterpoints");
        }


    }

    getVirtualStatusTokens() {
        return this.items
            .filter(e => {
                return e.type == "statuseffect";
            })
            .filter(e => {
                return e.system.startTick != null && e.system.startTick > 0 &&
                    e.system.interval != null && e.system.interval > 0;
            })
            .map(e => {
                return {
                    name: e.name,
                    startTick: parseInt(e.system.startTick),
                    interval: parseInt(e.system.interval),
                    times: e.system.times ? parseInt(e.system.times) : 90,
                    description: e.system.description,
                    img: e.img,
                    level: e.system.level,
                    statusId: e.id
                }
            });
    }


    _prepareHealthFocus() {
        const data = this.system;

        data.health.woundMalus.levels = duplicate(CONFIG.splittermond.woundMalus[data.health.woundMalus.nbrLevels]);
        data.health.woundMalus.levels = data.health.woundMalus.levels.map(i => {
            i.value = Math.min(i.value - data.health.woundMalus.mod, 0);
            return i;
        });

        ["health", "focus"].forEach((type) => {
            if (data[type].channeled.hasOwnProperty("entries")) {
                if (type === "health") {
                    data[type].channeled.value = Math.max(
                        Math.min(
                            data[type].channeled.entries.reduce((acc, val) => acc + parseInt(val.costs || 0), 0),
                            data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value
                        ),
                        0);
                } else {
                    data[type].channeled.value = Math.max(
                        Math.min(
                            data[type].channeled.entries.reduce((acc, val) => acc + parseInt(val.costs || 0), 0),
                            this.derivedValues[type + "points"].value
                        ),
                        0);
                }

            } else {
                data[type].channeled = {
                    value: 0,
                    entries: []
                }
            }

            if (!data[type].exhausted.value) {
                data[type].exhausted = {
                    value: 0
                }
            }

            data[type].exhausted.value = parseInt(data[type].exhausted.value);

            if (!data[type].consumed.value) {
                data[type].consumed = {
                    value: 0
                }
            }

            data[type].consumed.value = parseInt(data[type].consumed.value);
            if (type == "health") {
                data[type].available = {
                    value: Math.max(Math.min(data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value - data[type].channeled.value - data[type].exhausted.value - data[type].consumed.value, data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value), 0)
                }

                data[type].total = {
                    value: Math.max(Math.min(data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value - data[type].consumed.value, data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value), 0)
                }

                data[type].available.percentage = 100 * data[type].available.value / (data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value);
                data[type].exhausted.percentage = 100 * data[type].exhausted.value / (data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value);
                data[type].channeled.percentage = 100 * data[type].channeled.value / (data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value);
                data[type].total.percentage = 100 * data[type].total.value / (data.health.woundMalus.nbrLevels * this.derivedValues[type + "points"].value);
                data[type].max = data.health.woundMalus.nbrLevels * this.derivedValues.healthpoints.value;
            } else {

                data[type].available = {
                    value: Math.max(Math.min(this.derivedValues[type + "points"].value - data[type].channeled.value - data[type].exhausted.value - data[type].consumed.value, this.derivedValues[type + "points"].value), 0)
                }

                data[type].total = {
                    value: Math.max(Math.min(this.derivedValues[type + "points"].value - data[type].consumed.value, this.derivedValues[type + "points"].value), 0)
                }
                if (this.derivedValues[type + "points"].value) {
                    data[type].available.percentage = 100 * data[type].available.value / (this.derivedValues[type + "points"].value);
                    data[type].exhausted.percentage = 100 * data[type].exhausted.value / (this.derivedValues[type + "points"].value);
                    data[type].channeled.percentage = 100 * data[type].channeled.value / (this.derivedValues[type + "points"].value);
                    data[type].total.percentage = 100 * data[type].total.value / (this.derivedValues[type + "points"].value);
                    data[type].max = this.derivedValues.focuspoints.value;
                } else {
                    data[type].available.percentage = 0;
                    data[type].exhausted.percentage = 0;
                    data[type].channeled.percentage = 0;
                    data[type].total.percentage = 0;
                    data[type].max = 0;
                }
            }
        });

        data.health.woundMalus.level = Math.max(Math.min(data.health.woundMalus.nbrLevels - (Math.floor(data.health.total.value / this.derivedValues.healthpoints.value) + 1) + data.health.woundMalus.levelMod, data.health.woundMalus.nbrLevels - 1), 0);

        let woundMalusValue = data.health.woundMalus.levels[data.health.woundMalus.level];
        data.health.woundMalus.value = woundMalusValue?.value ?? 0;

        if (data.health.woundMalus.value) {
            this.modifier.add("woundmalus", game.i18n.localize("splittermond.woundMalus"), data.health.woundMalus.value, this);
        }


        data.healthBar = {
            value: data.health.total.value,
            max: data.health.woundMalus.nbrLevels * this.derivedValues.healthpoints.value
        }

        data.focusBar = {
            value: data.focus.available.value,
            max: this.derivedValues.focuspoints.value
        }
    }

    _prepareAttacks() {
        const attacks = this.attacks || [];
        if (this.type === "character") {
            attacks.push(new Attack(this, {
                id: "weaponless",
                name: game.i18n.localize("splittermond.weaponless"),
                img: "icons/equipment/hand/gauntlet-simple-leather-brown.webp",
                skill: "melee",
                attribute1: "agility",
                attribute2: "strength",
                weaponSpeed: 5,
                features: "Entwaffnend 1, Stumpf, Umklammern",
                damage: "1W6"
            }));
        }
    }

    _prepareActiveDefense() {
        const data = this.system;

        this.activeDefense.defense.push(new ActiveDefense(this.skills["acrobatics"].id, "defense", game.i18n.localize(this.skills["acrobatics"].label), this.skills["acrobatics"]));
        this.activeDefense.mindresist.push(new ActiveDefense(this.skills["determination"].id, "mindresist", game.i18n.localize(this.skills["determination"].label), this.skills["determination"]));
        this.activeDefense.bodyresist.push(new ActiveDefense(this.skills["endurance"].id, "bodyresist", game.i18n.localize(this.skills["endurance"].label), this.skills["endurance"]));
    }

    addModifier(item, name = "", str = "", type = "", multiplier = 1) {
        if (str == "") return;
        const data = this.system;


        str.split(',').forEach(str => {
            str = str.trim();
            let temp = str.match(/(.*)\s+([+\-]?AUS|[+\-]?BEW|[+\-]?INT|[+\-]?KON|[+\-]?MYS|[+\-]?STÄ|[+\-]?VER|[+\-]?WIL|[+\-]?(?:k?[0-9\.]+v?[0-9]*))/i);
            if (temp) {
                let modifierLabel = temp[1].trim();
                let value = temp[2].replaceAll("AUS", this.attributes.charisma.value + "")
                    .replaceAll("BEW", this.attributes.agility.value + "")
                    .replaceAll("INT", this.attributes.intuition.value + "")
                    .replaceAll("KON", this.attributes.constitution.value + "")
                    .replaceAll("MYS", this.attributes.mystic.value + "")
                    .replaceAll("STÄ", this.attributes.strength.value + "")
                    .replaceAll("VER", this.attributes.mind.value + "")
                    .replaceAll("WIL", this.attributes.willpower.value + "");
                let emphasis = "";
                let modifierLabelParts = modifierLabel.split("/");
                if (modifierLabelParts[1]) {
                    modifierLabel = modifierLabelParts[0];
                    if (modifierLabelParts[1]) {
                        emphasis = modifierLabelParts[1];
                    }
                }
                ;

                let addModifierHelper = (path, emphasis = "") => {
                    var floatValue = parseFloat(value);
                    if (floatValue * multiplier != 0) {
                        if (emphasis) {
                            this.modifier.add(path, emphasis, floatValue * multiplier, item, type, true);
                        } else {
                            this.modifier.add(path, name, floatValue * multiplier, item, type, false);
                        }
                    }
                }

                switch (modifierLabel.toLowerCase()) {
                    case "bonuscap":
                        addModifierHelper("bonuscap");
                        break;
                    case "speed.multiplier":
                    case "gsw.mult":
                        this.derivedValues.speed.multiplier *= Math.pow(parseFloat(value), multiplier);
                        break;
                    case "sr":
                        addModifierHelper("damagereduction");
                        break;
                    case "handicap.shield.mod":
                    case "handicap.shield":
                        addModifierHelper("handicap.shield");
                        break;
                    case "handicap.mod":
                    case "handicap":
                        addModifierHelper("handicap");
                        break;
                    case "handicap.armor.mod":
                    case "handicap.armor":
                        addModifierHelper("handicap.armor");
                        break;
                    case "tickmalus.shield.mod":
                    case "tickmalus.shield":
                        addModifierHelper("tickmalus.shield");
                        break;
                    case "tickmalus.armor.mod":
                    case "tickmalus.armor":
                        addModifierHelper("tickmalus.armor");
                        break;
                    case "tickmalus.mod":
                    case "tickmalus":
                        addModifierHelper("tickmalus");
                        break;
                    case "woundmalus.nbrlevels":
                        data.health.woundMalus.nbrLevels = parseFloat(value) * multiplier;
                        break;
                    case "woundmalus.mod":
                        data.health.woundMalus.mod += parseFloat(value) * multiplier;
                        break;
                    case "woundmalus.levelmod":
                        data.health.woundMalus.levelMod += parseFloat(value) * multiplier;
                        break;
                    case "splinterpoints":
                        data.splinterpoints.max = parseFloat(data.splinterpoints?.max || 3) + parseFloat(value) * multiplier;
                        break;
                    case "healthregeneration.multiplier":
                        data.healthRegeneration.multiplier = parseFloat(value) * multiplier;
                        break;
                    case "focusregeneration.multiplier":
                        data.focusRegeneration.multiplier = parseFloat(value) * multiplier;
                        break;
                    case "healthregeneration.bonus":
                        data.healthRegeneration.bonus += parseFloat(value);
                        break;
                    case "focusregeneration.bonus":
                        data.focusRegeneration.bonus += parseFloat(value);
                        break;
                    case "lowerfumbleresult":
                        let skill = item.system.skill;
                        if (!skill) {
                            skill = "*";
                        }
                        addModifierHelper(modifierLabel.toLowerCase() + "/" + skill);
                        break;
                    case "generalskills":
                        CONFIG.splittermond.skillGroups.general.forEach((skill) => {
                            addModifierHelper(skill, emphasis);
                        });
                        break;
                    case "magicskills":
                        CONFIG.splittermond.skillGroups.magic.forEach((skill) => {
                            addModifierHelper(skill, emphasis);
                        });
                        break;
                    case "fightingskills":
                        CONFIG.splittermond.skillGroups.fighting.forEach((skill) => {
                            addModifierHelper(skill, emphasis);
                        });
                        break;
                    case "damage":
                        this.modifier.add("damage." + emphasis, name, value, item, type, false);
                        break;
                    case "weaponspeed":
                        this.modifier.add("weaponspeed." + emphasis, name, value, item, type, false);
                        break;
                    default:
                        if (modifierLabel.toLowerCase().startsWith("foreduction")) {
                            data.spellCostReduction.addCostModifier(modifierLabel, value, item.system.skill);
                        } else if (modifierLabel.toLowerCase().startsWith("foenhancedreduction")) {
                            data.spellEnhancedCostReduction.addCostModifier(modifierLabel, value, item.system.skill);
                            return;
                        }

                        let element = CONFIG.splittermond.derivedAttributes.find(attr => {
                            return modifierLabel.toLowerCase() === game.i18n.localize(`splittermond.derivedAttribute.${attr}.short`).toLowerCase() || modifierLabel.toLowerCase() === game.i18n.localize(`splittermond.derivedAttribute.${attr}.long`).toLowerCase()
                        });
                        if (element) {
                            modifierLabel = element;
                        }

                        if (modifierLabel == "initiative") value = -parseInt(value);

                        addModifierHelper(modifierLabel, emphasis);

                        break;
                }
            } else {
                ui?.notifications?.error(`Syntax Error in modifier-string "${str}" in ${name}!`);
            }
        });
    }

    _prepareModifier() {
        const data = this.system;
        if (this.type === "character") {
            if (data.experience.heroLevel > 1) {
                ["defense", "mindresist", "bodyresist"].forEach(d => {
                    this.modifier.add(d, game.i18n.localize(`splittermond.heroLevels.${data.experience.heroLevel}`), 2 * (data.experience.heroLevel - 1), this);
                });
                this.modifier.add("splinterpoints", game.i18n.localize(`splittermond.heroLevels.${data.experience.heroLevel}`), data.experience.heroLevel - 1);
            }
        }

        let stealthModifier = 5 - this.derivedValues.size.value;
        if (stealthModifier) {
            this.modifier.add("stealth", game.i18n.localize("splittermond.derivedAttribute.size.short"), stealthModifier);
        }

        let handicap = this.handicap;
        if (handicap) {
            let label = game.i18n.localize("splittermond.handicap");
            ["athletics", "acrobatics", "dexterity", "stealth", "locksntraps", "seafaring", "animals"].forEach(skill => {
                this.modifier.add(skill, label, -handicap, this, "equipment");
            });
            this.modifier.add("speed", label, -Math.floor(handicap / 2));
        }


    }

    get tickMalus() {
        return Math.max(this.modifier.value("tickmalus.shield"), 0)
            + Math.max(this.modifier.value("tickmalus.armor"), 0)
            + Math.max(this.modifier.value("tickmalus"), 0);
    }

    get handicap() {
        return Math.max(this.modifier.value("handicap.shield"), 0)
            + Math.max(this.modifier.value("handicap.armor"), 0)
            + Math.max(this.modifier.value("handicap"), 0);
    }

    get damageReduction() {
        return this.modifier.value("damagereduction");
    }

    /**
     * @return {Record<DamageType, number>} The actor's suceptibility for each damage type. Positive values indicate a weakness,
     * negative values indicate a resistance.
     */
    get susceptibilities() {
        return this._susceptibilities;
    }


    async importFromJSON(json, updateActor) {
        const data = JSON.parse(json);

        // If Genesis-JSON-Export
        if (data.jsonExporterVersion && data.system === "SPLITTERMOND") {
            updateActor = updateActor ?? await askUserAboutActorOverwrite();
            const importedGenesisData = await this.#importGenesisData(data, updateActor);
            json = JSON.stringify(importedGenesisData);
        }

        return super.importFromJSON(json);
    }

    /**
     * @param {Record<string,unknown>} data
     * @param {boolean} updateActor
     * @returns {Promise<Partial<CharacterData>| undefined>}
     */
    async #importGenesisData(data, updateActor) {
        const genesisData = data;
        let newData = this.toObject();
        let newItems = [];
        newData.system = {};

        newData.system.species = {
            value: genesisData.race
        }
        newData.name = genesisData.name;
        newData.system.sex = genesisData.gender;
        newData.system.culture = genesisData.culture;
        newData.system.ancestry = genesisData.background;
        newData.system.education = genesisData.education;
        newData.system.experience = {
            free: genesisData.freeExp,
            spent: genesisData.investedExp
        };
        newData.system.currency = {
            S: 0,
            L: 0,
            T: 0
        };
        let moonSignDescription = genesisData.moonSign.description.replace(/Grad [1234]:/g, (m) => "<strong>" + m + "</strong>");
        moonSignDescription = "<p>" + moonSignDescription.split("\n").join("</p><p>") + "</p>";

        let moonSignImage = "systems/splittermond/images/moonsign/" + data.moonSign.name.split(" ").join("_").toLowerCase() + ".png";
        let moonsignObj = {
            type: "moonsign",
            name: genesisData.moonSign.name,
            img: moonSignImage,
            system: {
                description: moonSignDescription
            }
        }
        let moonsignIds = this.items.filter(i => i.type === "moonsign")?.map(i => {
            return i.id;
        });
        if (moonsignIds) {
            if (moonsignIds.length > 0) {
                moonsignObj._id = moonsignIds[0];
            }
        }
        newItems.push(moonsignObj);


        genesisData.weaknesses.forEach((w) => {
            newItems.push({
                type: "weakness",
                name: w
            })
        });
        genesisData.languages.forEach((w) => {
            newItems.push({
                type: "language",
                name: w
            })
        });
        genesisData.cultureLores.forEach((w) => {
            newItems.push({
                type: "culturelore",
                name: w
            })
        });
        newData.system.attributes = duplicate(this.system.attributes);
        genesisData.attributes.forEach((a) => {
            const id = a.id.toLowerCase();
            if (CONFIG.splittermond.attributes.includes(id)) {
                newData.system.attributes[id].species = 0;
                newData.system.attributes[id].initial = a.startValue;
                newData.system.attributes[id].advances = a.value - a.startValue;
            }

            if (id === "size") {
                newData.system.species.size = a.value;
            }

        });
        newData.system.skills = duplicate(this.system.skills);
        genesisData.skills.forEach((s) => {
            let id = s.id.toLowerCase();
            if (newData.system.skills[id]) {
                newData.system.skills[id].points = s.points;

                s.masterships.forEach((m) => {
                    let modifierStr = CONFIG.splittermond.modifier[m.id] || "";
                    let description = m.longDescription;
                    if (modifierStr === "" && m.specialization) {
                        let emphasisName = /(.*) [1-9]/.exec(m.name);
                        if (emphasisName) {
                            modifierStr = `${id}/${emphasisName[1]} +${m.level}`;
                        }
                        description = game.i18n.localize(`splittermond.emphasis`);
                    }
                    let newMastership = {
                        type: "mastery",
                        name: m.name,
                        system: {
                            skill: id,
                            level: m.level,
                            description: description,
                            modifier: modifierStr
                        }
                    }

                    newItems.push(newMastership);
                })
            } else {
                console.log("undefined Skill:" + id);
            }

        });

        genesisData.powers.forEach((s) => {
            newItems.push({
                type: "strength",
                name: s.name,
                system: {
                    quantity: s.count,
                    description: s.longDescription,
                    modifier: CONFIG.splittermond.modifier[s.id] || ""
                }
            })
        });

        genesisData.resources.forEach((r) => {
            newItems.push({
                type: "resource",
                name: r.name,
                system: {
                    value: r.value,
                    description: r.description
                }
            })
        });

        genesisData.spells.forEach((s) => {
            let damage = /([0-9]*[wWdD][0-9]{1,2}[ \-+0-9]*)/.exec(s.longDescription);
            if (damage) {
                damage = damage[0] || "";
            } else {
                damage = "";
            }
            let skill = "";
            if (s.school === "Arkane Kunde") {
                skill = "arcanelore";
            } else {
                skill = CONFIG.splittermond.skillGroups.magic.find(skill => {
                    return s.school.toLowerCase() === game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                });
            }


            newItems.push({
                type: "spell",
                name: s.name,
                img: CONFIG.splittermond.icons.spell[s.id] || CONFIG.splittermond.icons.spell.default,
                system: {
                    description: s.longDescription,
                    skill: skill,
                    skillLevel: s.schoolGrade,
                    costs: s.focus,
                    difficulty: s.difficulty,
                    damage: damage.trim(),
                    range: s.castRange,
                    castDuration: s.castDuration,
                    effectDuration: s.spellDuration,
                    enhancementCosts: s.enhancement,
                    enhancementDescription: s.enhancementDescription,
                    degreeOfSuccessOptions: {
                        castDuration: s.enhancementOptions?.search("Auslösezeit") >= 0,
                        consumedFocus: s.enhancementOptions?.search("Verzehrter Fokus") >= 0,
                        exhaustedFocus: s.enhancementOptions?.search("Erschöpfter Fokus") >= 0,
                        channelizedFocus: s.enhancementOptions?.search("Kanalisierter Fokus") >= 0,
                        effectDuration: s.enhancementOptions?.search("Wirkungsdauer") >= 0,
                        damage: s.enhancementOptions?.search("Schaden") >= 0,
                        range: s.enhancementOptions?.search("Reichweite") >= 0,
                        effectArea: s.enhancementOptions?.search("Wirkungsbereich") >= 0
                    }
                }
            })
        });

        genesisData.armors.forEach((a) => {
            newItems.push({
                type: "armor",
                name: a.name,
                img: CONFIG.splittermond.icons.armor[a.name] || CONFIG.splittermond.icons.armor.default,
                system: {
                    defenseBonus: a.defense,
                    tickMalus: a.tickMalus,
                    handicap: a.handicap,
                    damageReduction: a.damageReduction,
                    features: a.features.map(f => `${f.name}`)?.join(', ')
                }
            })
        });

        genesisData.shields.forEach((s) => {
            newItems.push({
                type: "shield",
                name: s.name,
                img: CONFIG.splittermond.icons.shield[s.name] || CONFIG.splittermond.icons.shield.default,
                system: {
                    skill: CONFIG.splittermond.skillGroups.fighting.find(skill => {
                        return s.skill.toLowerCase() === game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                    }),
                    defenseBonus: s.defensePlus,
                    tickMalus: s.tickMalus,
                    handicap: s.handicap,
                    features: s.features.map(f => `${f.name}`)?.join(', ')
                }
            })
        });


        genesisData.meleeWeapons.forEach((w) => {
            if (w.name !== "Waffenlos") {
                newItems.push({
                    type: "weapon",
                    name: w.name,
                    img: CONFIG.splittermond.icons.weapon[w.name] || CONFIG.splittermond.icons.weapon.default,
                    system: {
                        skill: CONFIG.splittermond.skillGroups.fighting.find(skill => {
                            return w.skill.toLowerCase() === game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                        }),
                        attribute1: w.attribute1Id.toLowerCase(),
                        attribute2: w.attribute2Id.toLowerCase(),
                        features: w.features.map(f => `${f.name}`)?.join(', '),
                        damage: w.damage,
                        weaponSpeed: w.weaponSpeed,
                    }
                })

            }
        });

        genesisData.longRangeWeapons.forEach((w) => {
            const itemData = newItems.find(i => i.name === w.name && i.type === "weapon");
            if (itemData) {
                itemData.system.secondaryAttack = {
                    skill: CONFIG.splittermond.skillGroups.fighting.find(skill => {
                        return w.skill.toLowerCase() === game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                    }),
                    attribute1: w.attribute1Id.toLowerCase(),
                    attribute2: w.attribute2Id.toLowerCase(),
                    features: w.features.map(f => `${f.name}`)?.join(', '),
                    damage: w.damage,
                    weaponSpeed: w.weaponSpeed,
                    range: w.range
                }
            } else {
                newItems.push({
                    type: "weapon",
                    name: w.name,
                    img: CONFIG.splittermond.icons.weapon[w.name] || CONFIG.splittermond.icons.weapon.default,
                    system: {
                        skill: CONFIG.splittermond.skillGroups.fighting.find(skill => {
                            return w.skill.toLowerCase() === game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                        }),
                        attribute1: w.attribute1Id.toLowerCase(),
                        attribute2: w.attribute2Id.toLowerCase(),
                        features: w.features.map(f => `${f.name}`)?.join(', '),
                        damage: w.damage,
                        weaponSpeed: w.weaponSpeed,
                        range: w.range
                    }
                })
            }

        });

        genesisData.items.forEach((e) => {
            newItems.push({
                type: "equipment",
                name: e.name,
                img: CONFIG.splittermond.icons.equipment[e.name] || CONFIG.splittermond.icons.equipment.default,
                system: {
                    quantity: e.count
                }
            });
        });

        if (genesisData.telare) {
            newData.system.currency.S = Math.floor(genesisData.telare / 10000);
            newData.system.currency.L = Math.floor(genesisData.telare / 100) - newData.system.currency.S * 100;
            newData.system.currency.T = Math.floor(genesisData.telare) - newData.system.currency.L * 100 - newData.system.currency.S * 10000;
        }


        if (updateActor) {
            let updateItems = [];

            newItems = newItems.filter((i) => {
                let foundItem = this.items.find((im) => im.type === i.type && im.name.trim().toLowerCase() === i.name.trim().toLowerCase());
                if (foundItem) {
                    i._id = foundItem.id;
                    delete i.img;
                    updateItems.push(duplicate(i));
                    return false;
                }
                return true;
            });

            newData.system.currency = this.system.currency;

            await this.update(newData);
            await this.updateEmbeddedDocuments("Item", updateItems);
            await this.createEmbeddedDocuments("Item", newItems);

            return this.update(newData);

        }
        newData.name = genesisData.name;
        newData.prototypeToken.name = genesisData.name;
        newData.prototypeToken.actorLink = true;
        newData.items = duplicate(newItems);
        return newData;
    }

    /** @returns {{pointSpent:boolean, getBonus(skillName:SplittermondSkill): number}} splinterpoints spent */
    spendSplinterpoint() {
        if (this.splinterpoints.value > 0) {
            this.update({
                system: {
                    ...this.system,
                    splinterpoints: {
                        ...this.system.splinterpoints,
                        value: parseInt(this.system.splinterpoints.value) - 1,

                    }
                }
            });
            return {pointSpent: true, getBonus: (skillName) => this.#getSplinterpointBonus(skillName)}
        }
        return {pointSpent: false, getBonus: () => 0};
    }

    /**
     * This is a stub. It currently returns the flat upgrade value for health and skills.
     * Later it should check for specific masteries that increase the bonus values.
     * @param {SplittermondSkill} skillName
     * @return {number}
     */
    #getSplinterpointBonus(skillName) {
        if(skillName === "health"){
            return 5;
        }
        return 3;
    }

    async useSplinterpointBonus(message) {
        if (!message.flags.splittermond
            || !message.flags.splittermond.check
            || parseInt(this.splinterpoints.value) <= 0
            || message.flags.splittermond.check.isFumble) {
            return;
        }

        let checkMessageData = message.flags.splittermond.check;

        //Magic number 0; Message comes with a storage for several rolls, but we only set one roll in chat.js.
        message.rolls[0]._total = message.rolls[0]._total + 3;
        checkMessageData.modifierElements.push({
            value: 3,
            description: game.i18n.localize("splittermond.splinterpoint")
        })

        this.update({system: {splinterpoints: {value: parseInt(this.splinterpoints.value) - 1}}});
        checkMessageData.availableSplinterpoints = 0;

        let checkData = await Dice.evaluateCheck(message.rolls[0], checkMessageData.skillPoints, checkMessageData.difficulty, checkMessageData.rollType);
        if (checkData.succeeded && parseInt(checkMessageData.skillPoints) == 0 && (message.rolls[0]._total - checkMessageData.difficulty) >= 3) {
            checkData.degreeOfSuccess += 1;
        }

        checkMessageData.succeeded = checkData.succeeded;
        checkMessageData.degreeOfSuccess = checkData.degreeOfSuccess;

        let chatMessageData = await Chat.prepareCheckMessageData(this, message.rollMode, checkData.roll, checkMessageData);

        message.update({
            content: chatMessageData.content,
            "flags.splittermond.check": chatMessageData.flags.splittermond.check
        });
        this.update({
            "system.splinterpoints.value": this.system.splinterpoints.value
        })
    }

    async rollSkill(skillId, options = {}) {
        let skill = this.skills[skillId];
        if (!skill) return;
        return skill.roll(options);
    }

    async rollAttack(attackId, options = {}) {
        let attack = this.attacks.find(a => a.id === attackId);
        if (!attack) return;
        return attack.roll(options);
    }

    async rollSpell(spellId, options = {}) {
        let spell = this.spells.find((s) => s.id == spellId);
        if (!spell) return;
        return spell.roll(options);
    }

    async rollActiveDefense(defenseType, item) {
        return item.roll();
    }

    async rollAttackFumble() {
        let roll = await (new Roll("2d10")).evaluate();

        let result = CONFIG.splittermond.fumbleTable.fight.find(el => el.min <= roll.total && el.max >= roll.total);

        let data = {};
        data.roll = roll;
        data.title = "Kampfpatzer";
        data.img = "";
        //data.rollType = "2d10";

        data.degreeOfSuccessDescription = `<div class="fumble-table-result">`;
        CONFIG.splittermond.fumbleTable.fight.forEach(el => {
            if (el === result) {
                data.degreeOfSuccessDescription += `<div class="fumble-table-result-item fumble-table-result-item-active"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${game.i18n.localize(el.text)}</div>`
            } else {
                data.degreeOfSuccessDescription += `<div class="fumble-table-result-item"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${game.i18n.localize(el.text)}</div>`
            }

        });
        data.degreeOfSuccessDescription += `</div>`;

        let templateContext = {
            ...data,
            tooltip: await data.roll.getTooltip()
        };

        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({actor: this}),
            rolls: [roll],
            content: await renderTemplate("systems/splittermond/templates/chat/skill-check.hbs", templateContext),
            sound: CONFIG.sounds.dice,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        };

        ChatMessage.create(chatData);
    }

    /**
     * @param {number} eg
     * @param {string} costs A cost string as used for Splittermond spells
     * @param {SplittermondSkill} skill
     * @return {Promise<void>}
     */
    async rollMagicFumble(eg = 0, costs = 0, skill = "") {

        let defaultTable = "sorcerer";
        eg = Math.abs(eg);
        let lowerFumbleResult = this.modifier.value("lowerfumbleresult/" + skill)
        lowerFumbleResult += this.modifier.value("lowerfumbleresult/*");
        if (this.items.find(i => i.type == "strength" && i.name.toLowerCase() == "priester")) {
            defaultTable = "priest";
        }

        let d = new Dialog({
            title: "Zauberpatzer",
            content: `<form>
            <div class="properties-editor">
            <label>${game.i18n.localize("splittermond.negativeDegreeOfSuccess")}</label><input name='eg' type='text' value='${eg}' data-dtype='Number'>
            <label>${game.i18n.localize("splittermond.focusCosts")}</label><input name='costs' type='text' value='${costs}' data-dtype='Number'>
            <label title="${game.i18n.localize("splittermond.lowerFumbleResultHelp")}">${game.i18n.localize("splittermond.lowerFumbleResult")}</label><input title="${game.i18n.localize("splittermond.lowerFumbleResultHelp")}"name='lowerFumbleResult' type='text' value='${lowerFumbleResult}' data-dtype='Number'>
            </div>
            </form>`,
            buttons: {

                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("splittermond.cancel")
                },
                priest: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("splittermond.priest"),
                    callback: async (html) => {
                        const rollTable = CONFIG.splittermond.fumbleTable.magic.priest;
                        let eg = parseInt(html.find('[name=eg]')[0].value || 0);
                        let costs = html.find('[name=costs]')[0].value;
                        let lowerFumbleResult = Math.abs(parseInt(html.find('[name=lowerFumbleResult]')[0].value) || 0);
                        if (parseInt(costs)) {
                            costs = parseInt(costs);
                        } else {
                            let costDataRaw = /([k]{0,1})([0-9]+)v{0,1}([0-9]*)/.exec(costs.toLowerCase());
                            costs = parseInt(costDataRaw[2]);
                        }

                        let roll = await (new Roll(`2d10+@eg[${game.i18n.localize("splittermond.degreeOfSuccessAbbrev")}]*@costs[${game.i18n.localize("splittermond.focusCosts")}]`, {
                            eg: eg,
                            costs: costs
                        })).evaluate();

                        let result = rollTable.find(el => el.min <= roll.total && el.max >= roll.total);
                        let index = rollTable.indexOf(result);

                        if (lowerFumbleResult) {
                            index = Math.max(index - lowerFumbleResult, 0);
                            result = rollTable[index];
                        }

                        let data = {};
                        data.roll = roll;
                        data.title = game.i18n.localize("splittermond.magicFumble");
                        data.rollType = roll.formula;
                        data.img = "";
                        data.degreeOfSuccessDescription = `<div class="fumble-table-result">`;
                        rollTable.forEach(el => {
                            if (el === result) {
                                data.degreeOfSuccessDescription += `<div class="fumble-table-result-item fumble-table-result-item-active"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${game.i18n.localize(el.text)}</div>`
                            } else {
                                data.degreeOfSuccessDescription += `<div class="fumble-table-result-item"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${game.i18n.localize(el.text)}</div>`
                            }

                        });
                        data.degreeOfSuccessDescription += `</div>`;
                        if (lowerFumbleResult) {
                            data.degreeOfSuccessDescription = `${lowerFumbleResult} ${game.i18n.localize("splittermond.lowerFumbleResultChat")}` + data.degreeOfSuccessDescription;
                        }
                        //data.degreeOfSuccessDescription = `<div class="fumble-table-result fumble-table-result-active">"${game.i18n.localize(result.text)}</div>`;


                        let templateContext = {
                            ...data,
                            tooltip: await data.roll.getTooltip()
                        };

                        let chatData = {
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({actor: this}),
                            rolls: [roll],
                            content: await renderTemplate("systems/splittermond/templates/chat/skill-check.hbs", templateContext),
                            sound: CONFIG.sounds.dice,
                            type: CONST.CHAT_MESSAGE_TYPES.OTHER
                        };

                        ChatMessage.create(chatData);
                    }
                },
                sorcerer: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("splittermond.sorcerer"),
                    callback: async (html) => {
                        const rollTable = CONFIG.splittermond.fumbleTable.magic.sorcerer;
                        let eg = parseInt(html.find('[name=eg]')[0].value || 0);
                        let costs = html.find('[name=costs]')[0].value;
                        let lowerFumbleResult = Math.abs(parseInt(html.find('[name=lowerFumbleResult]')[0].value) || 0);
                        if (parseInt(costs)) {
                            costs = parseInt(costs);
                        } else {
                            let costDataRaw = /([k]{0,1})([0-9]+)v{0,1}([0-9]*)/.exec(costs.toLowerCase());
                            costs = parseInt(costDataRaw[2]);
                        }

                        let roll = await (new Roll(`2d10+@eg[${game.i18n.localize("splittermond.degreeOfSuccessAbbrev")}]*@costs[${game.i18n.localize("splittermond.focusCosts")}]`, {
                            eg: eg,
                            costs: costs
                        })).evaluate();

                        let result = rollTable.find(el => el.min <= roll.total && el.max >= roll.total);
                        let index = rollTable.indexOf(result);

                        if (lowerFumbleResult) {
                            index = Math.max(index - lowerFumbleResult, 0);
                            result = rollTable[index];
                        }

                        let data = {};
                        data.roll = roll;
                        data.title = game.i18n.localize("splittermond.magicFumble");
                        data.rollType = roll.formula;
                        data.img = "";
                        data.degreeOfSuccessDescription = `<div class="fumble-table-result">`;
                        rollTable.forEach(el => {
                            if (el === result) {
                                data.degreeOfSuccessDescription += `<div class="fumble-table-result-item fumble-table-result-item-active"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${game.i18n.localize(el.text)}</div>`
                            } else {
                                data.degreeOfSuccessDescription += `<div class="fumble-table-result-item"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${game.i18n.localize(el.text)}</div>`
                            }

                        });
                        data.degreeOfSuccessDescription += `</div>`;
                        if (lowerFumbleResult) {
                            data.degreeOfSuccessDescription = `${lowerFumbleResult} ${game.i18n.localize("splittermond.lowerFumbleResultChat")}` + data.degreeOfSuccessDescription;
                        }

                        let templateContext = {
                            ...data,
                            tooltip: await data.roll.getTooltip()
                        };

                        let chatData = {
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({actor: this}),
                            rolls: [roll],
                            content: await renderTemplate("systems/splittermond/templates/chat/skill-check.hbs", templateContext),
                            sound: CONFIG.sounds.dice,
                            type: CONST.CHAT_MESSAGE_TYPES.OTHER
                        };

                        ChatMessage.create(chatData);

                    }
                },
            },
            default: defaultTable
        }, {classes: ["splittermond", "dialog"]});
        d.render(true);
        return;
    }

    async addTicks(value = 3, message = "", askPlayer = true) {
        const combat = game.combat;
        value = parseInt(value);
        if (!value) return;
        if (!combat) return;

        // Find combatant
        let combatant = combat.combatants.find((c) => c.actor === this);

        if (!combatant) return;
        let nTicks = value;
        if (askPlayer) {
            let p = new Promise((resolve, reject) => {
                let dialog = new Dialog({
                    title: this.name + " - Ticks",
                    content: `<p>${message}</p><input type='text' class='ticks' value='${value}'>`,
                    buttons: {
                        ok: {
                            label: "Ok",
                            callback: html => {
                                resolve(parseInt(html.find('.ticks')[0].value));
                            }
                        }
                    }
                });
                dialog.render(true);
            });

            nTicks = await p;
        }

        let newInitiative = Math.round(combatant.initiative) + parseInt(nTicks);


        return combat.setInitiative(combatant.id, newInitiative);
    }

    getRollData() {
        const data = this.system;
        let rollData = {};

        rollData['initiative'] = this.derivedValues.initiative.value;
        rollData[game.i18n.localize(`splittermond.derivedAttribute.initiative.short`).toLowerCase()] = this.derivedValues.initiative.value;

        return rollData;
    }

    async shortRest() {
        const data = this.system;

        let focusData = duplicate(data.focus);
        let healthData = duplicate(data.health);
        focusData.exhausted.value = 0;
        healthData.exhausted.value = 0;

        return this.update({"system.focus": focusData, "system.health": healthData});
    }

    async longRest() {
        const data = this.system;
        let p = new Promise((resolve, reject) => {
            let dialog = new Dialog({
                title: game.i18n.localize("splittermond.clearChanneledFocus"),
                content: "<p>" + game.i18n.localize("splittermond.clearChanneledFocus") + "</p>",
                buttons: {
                    yes: {
                        label: game.i18n.localize("splittermond.yes"),
                        callback: html => {
                            resolve(true);
                        }
                    },
                    no: {
                        label: game.i18n.localize("splittermond.no"),
                        callback: html => {
                            resolve(false);
                        }
                    }
                }
            });
            dialog.render(true);
        });

        let focusData = duplicate(this.system.focus);
        let healthData = duplicate(this.system.health);


        if (await p) {
            focusData.channeled.entries = [];
        }

        healthData.channeled.entries = [];

        focusData.exhausted.value = 0;
        healthData.exhausted.value = 0;

        focusData.consumed.value = Math.max(focusData.consumed.value - data.focusRegeneration.multiplier * this.attributes.willpower.value - data.focusRegeneration.bonus, 0);
        healthData.consumed.value = Math.max(healthData.consumed.value - data.healthRegeneration.multiplier * this.attributes.constitution.value - data.healthRegeneration.bonus, 0);

        return this.update({"system.focus": focusData, "system.health": healthData});
    }

    /**
     *
     * @param {CostTypes} type
     * @param {string} valueStr  a string of same form as given for Splittermond Spells
     * @param description
     */
    consumeCost(type, valueStr, description) {
        const data = this.system;
        let costData = parseCostString(valueStr.toString()).asPrimaryCost();

        let subData = duplicate(data[type]);

        if (costData.channeled) {
            if (!subData.channeled.hasOwnProperty("entries")) {
                subData.channeled = {
                    value: 0,
                    entries: []
                }
            }

            subData.channeled.entries.push({
                description: description,
                costs: costData.channeled,
            });

        }
        if (!subData.exhausted.value) {
            subData.exhausted = {
                value: 0
            };
        }

        if (!subData.consumed.value) {
            subData.consumed = {
                value: 0
            };
        }

        subData.exhausted.value += costData.exhausted;
        subData.consumed.value += costData.consumed;

        this.update({
            "system": {
                [type]: subData
            }
        });


    }

    async activeDefenseDialog(type = "defense") {
        if (type.toLowerCase() === "vtd") {
            type = "defense";
        }
        if (type.toLowerCase() === "kw") {
            type = "bodyresist";
        }
        if (type.toLowerCase() === "gw") {
            type = "mindresist";
        }

        if (type === "defense") {
            let content = await renderTemplate("systems/splittermond/templates/apps/dialog/active-defense.hbs", {activeDefense: this.activeDefense.defense});
            let p = new Promise((resolve, reject) => {
                let dialog = new Dialog({
                    title: game.i18n.localize("splittermond.activeDefense"),
                    content: content,
                    buttons: {
                        cancel: {
                            label: game.i18n.localize("splittermond.cancel"),
                            callback: html => {
                                resolve(false);
                            }
                        }
                    },
                    render: (html) => {
                        html.find(".rollable").click(event => {
                            const type = $(event.currentTarget).closestData('roll-type');
                            if (type === "activeDefense") {
                                const itemId = $(event.currentTarget).closestData('defense-id');
                                const defenseType = $(event.currentTarget).closestData('defense-type');
                                this.rollActiveDefense(defenseType, this.activeDefense.defense.find(el => el.id === itemId));
                                dialog.close();
                            }
                        });
                    }
                }, {classes: ["splittermond", "dialog"], width: 500});
                dialog.render(true);
            });
        } else {
            this.rollActiveDefense(type, this.activeDefense[type][0]);
        }

    }

    toCompendium(pack) {
        this.setFlag('splittermond', 'originId', this._id);
        return super.toCompendium(pack);
    }
}


/**
 * @returns {Promise<boolean>}
 */
async function askUserAboutActorOverwrite() {
    return new Promise((resolve) => {
        let dialog = new Dialog({
            title: "Import",
            content: "<p>" + foundryApi.localize("splittermond.updateOrOverwriteActor") + "</p>",
            buttons: {
                overwrite: {
                    label: foundryApi.localize("splittermond.overwrite"),
                    callback: html => {
                        resolve(false);
                    }
                },
                update: {
                    label: foundryApi.localize("splittermond.update"),
                    callback: html => {
                        resolve(true);
                    }
                }
            }
        });
        dialog.render(true);
    });
}