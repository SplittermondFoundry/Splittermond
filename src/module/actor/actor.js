import * as Dice from "../check/dice";
import * as Chat from "../util/chat";

import Attribute from "./attribute";
import Skill from "./skill.js";
import DerivedValue from "./derived-value";
import ModifierManager from "./modifiers/modifier-manager";
import Attack from "./attack";
import ActiveDefense from "./active-defense.js";
import { parseCostString } from "../util/costs/costParser";
import { initializeSpellCostManagement } from "../util/costs/spellCostManagement";
import { settings } from "../settings";
import { splittermond } from "../config";
import { foundryApi } from "../api/foundryApi";
import { Susceptibilities } from "./Susceptibilities";
import { addModifier } from "./addModifierAdapter";
import { evaluate, of } from "../modifiers/expressions/scalar";
import { ItemFeaturesModel } from "../item/dataModel/propertyModels/ItemFeaturesModel";
import { DamageModel } from "../item/dataModel/propertyModels/DamageModel";
import { InverseModifier } from "module/modifiers/impl/InverseModifier";
import { genesisSpellImport } from "./genesisImport/spellImport";
import { addTicks } from "module/combat/addTicks";
import { rollAttackFumble, rollMagicFumble } from "module/actor/fumble";
import { FoundryDialog } from "module/api/Application.js";
import { showActiveDefenseDialog } from "module/actor/ActiveDefenseDialog.js";

/** @type ()=>number */
let getHeroLevelMultiplier = () => 1;
let getStableProtectsAllReduction = () => true;

/**@return number[]*/
export function calculateHeroLevels() {
    const baseHeroLevels = [...splittermond.heroLevel];
    const multplier = getHeroLevelMultiplier();
    return baseHeroLevels.map((l) => l * multplier);
}

settings
    .registerBoolean("stableProtectsAllReduction", {
        position: 7,
        scope: "world",
        config: true,
        default: true,
    })
    .then((accessor) => (getStableProtectsAllReduction = accessor.get))
    .catch((e) =>
        console.error("Splittermond | Failed to register setting for stable protecting all damage reduction", e)
    );

settings
    .registerNumber("HGMultiplier", {
        position: 1,
        scope: "world",
        config: true,
        default: 1.0,
        range: {
            min: 0.5,
            max: 2.0,
            step: 0.25,
        },
        onChange: (mult) => {
            console.log("Splittermond | adjusted hero level");
            game.splittermond.heroLevel = calculateHeroLevels();
            game.actors.forEach((actor) => {
                if (actor.type === "character") {
                    actor.prepareData();
                }
            });
        },
    })
    .then((accessor) => (getHeroLevelMultiplier = accessor.get))
    .catch((e) => console.error("Splittermond | Failed to register setting for hero level multipliers", e));

export default class SplittermondActor extends Actor {
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
        this._resistances = new Susceptibilities("resistance", this.modifier);
        this._weaknesses = new Susceptibilities("weakness", this.modifier);

        if (!this.attributes) {
            this.attributes = splittermond.attributes.reduce((obj, id) => {
                obj[id] = new Attribute(this, id);
                return obj;
            }, {});
        }

        if (!this.derivedValues) {
            this.derivedValues = splittermond.derivedValues.reduce((obj, id) => {
                obj[id] = new DerivedValue(this, id);
                return obj;
            }, {});
        }

        if (!this.skills) {
            this.skills = [...splittermond.skillGroups.general, ...splittermond.skillGroups.magic].reduce((obj, id) => {
                obj[id] = new Skill(this, id);
                return obj;
            }, {});
        }

        [
            ...Object.values(this.attributes),
            ...Object.values(this.derivedValues),
            ...Object.values(this.skills),
        ].forEach((e) => e.disableCaching());
        [...Object.values(this.attributes)].forEach((e) => e.enableCaching());
        let data = this.system;

        this.attacks = [];
        this.activeDefense = {
            defense: [],
            mindresist: [],
            bodyresist: [],
        };

        this.system.lowerFumbleResult = 0;

        if (!data.health) {
            data.health = {
                consumed: {
                    value: 0,
                },
                exhausted: {
                    value: 0,
                },
                channeled: {
                    entries: [],
                },
            };
        }

        if (!data.focus) {
            data.focus = {
                consumed: {
                    value: 0,
                },
                exhausted: {
                    value: 0,
                },
                channeled: {
                    entries: [],
                },
            };
        }

        data.health.woundMalus = {
            nbrLevels: 5,
            level: 0,
            value: 0,
            mod: 0,
            levelMod: 0,
        };

        data = initializeSpellCostManagement(data);

        data.focusRegeneration = {
            multiplier: 2,
            bonus: 0,
        };

        data.healthRegeneration = {
            multiplier: 2,
            bonus: 0,
        };

        if (this.type === "character") {
            const heroLevels = calculateHeroLevels();
            data.experience.heroLevel = heroLevels.reduce(
                (acc, minXP) => acc + (minXP <= data.experience.spent ? 1 : 0),
                0
            );
            data.experience.nextLevelValue = heroLevels[Math.min(data.experience.heroLevel, 3)];
            data.experience.percentage =
                data.experience.spent - heroLevels[Math.min(Math.max(data.experience.heroLevel - 1, 0), 3)];
            data.experience.percentage /= data.experience.nextLevelValue;
            data.experience.percentage = Math.min(data.experience.percentage * 100, 100);

            if (!data.splinterpoints) {
                data.splinterpoints = {};
            }
            data.splinterpoints.max = splittermond.splinterpoints.max;
        }

        if (this.type === "npc") {
            if (parseInt(this.system.damageReduction.value) !== 0) {
                this.modifier.add(
                    "damagereduction",
                    {
                        name: foundryApi.localize("splittermond.damageReductionAbbrev"),
                        type: "innate",
                    },
                    of(this.system.damageReduction.value)
                );
            }
        }
    }

    get bonusCap() {
        return this.type === "npc"
            ? 6
            : this.system.experience.heroLevel + 2 + this.modifier.getForId("bonuscap").getModifiers().value;
    }

    /**@return {{value:number, max:number}}*/
    get splinterpoints() {
        return this.system.splinterpoints ?? { value: 0, max: 0 };
    }

    prepareEmbeddedDocuments() {
        [
            ...Object.values(this.attributes),
            ...Object.values(this.derivedValues),
            ...Object.values(this.skills),
        ].forEach((e) => e.disableCaching());
        Object.values(this.derivedValues).forEach((v) => {
            v.multiplier = 1;
        });
        super.prepareEmbeddedDocuments();
        this.items.forEach((item) => item.prepareActorData());
    }

    prepareDerivedData() {
        //console.log(`prepareDerivedData() - ${this.type}: ${this.name}`);

        super.prepareDerivedData();

        this.spells = this.items.filter((i) => i.type === "spell") || [];
        this.spells.sort((a, b) => a.sort - b.sort);

        this._prepareModifier();

        this._prepareHealthFocus();

        [
            ...Object.values(this.attributes),
            ...Object.values(this.derivedValues),
            ...Object.values(this.skills),
        ].forEach((e) => e.enableCaching());

        this._prepareAttacks();

        this._prepareActiveDefense();

        if (this.type === "character") {
            this.system.splinterpoints.max += this.modifier.getForId("actor.splinterpoints").getModifiers().sum;
        }
    }

    /**@returns VirtualToken[]*/
    getVirtualStatusTokens() {
        return this.items
            .filter((e) => {
                return e.type === "statuseffect";
            })
            .filter((e) => {
                return (
                    e.system.startTick != null &&
                    e.system.startTick > 0 &&
                    e.system.interval != null &&
                    e.system.interval > 0
                );
            })
            .map((e) => {
                return {
                    name: e.name,
                    startTick: parseInt(e.system.startTick),
                    interval: parseInt(e.system.interval),
                    times: e.system.times ? parseInt(e.system.times) : 90,
                    description: e.system.description,
                    img: e.img,
                    level: e.system.level,
                    statusId: e.id,
                };
            });
    }

    get healthNbrLevels() {
        const nbrLevelMods = this.modifier.getForId("actor.woundmalus.nbrLevels").getModifiers();
        if (nbrLevelMods.length > 1) {
            console.warn(
                `Splittermond | Multiple wound malus level modifiers found on actor ${this.name}. The last one will be used.`
            );
        }
        const nbrLevelFromMod = evaluate(nbrLevelMods[nbrLevelMods.length - 1]?.value ?? of(0));
        return nbrLevelFromMod > 0 ? nbrLevelFromMod : this.system.health.woundMalus.nbrLevels;
    }

    get woundMalusMod() {
        return this.modifier.getForId("actor.woundmalus.mod").getModifiers().sum;
    }

    _prepareHealthFocus() {
        const data = this.system;
        const healthNbrLevels = this.healthNbrLevels;

        data.health.woundMalus.levels = duplicate(CONFIG.splittermond.woundMalus[healthNbrLevels]);
        data.health.woundMalus.levels = data.health.woundMalus.levels.map((i) => {
            i.value = Math.min(i.value - this.woundMalusMod, 0);
            return i;
        });

        ["health", "focus"].forEach((type) => {
            if (data[type].channeled.hasOwnProperty("entries")) {
                if (type === "health") {
                    data[type].channeled.value = Math.max(
                        Math.min(
                            data[type].channeled.entries.reduce((acc, val) => acc + parseInt(val.costs || 0), 0),
                            healthNbrLevels * this.derivedValues[type + "points"].value
                        ),
                        0
                    );
                } else {
                    data[type].channeled.value = Math.max(
                        Math.min(
                            data[type].channeled.entries.reduce((acc, val) => acc + parseInt(val.costs || 0), 0),
                            this.derivedValues[type + "points"].value
                        ),
                        0
                    );
                }
            } else {
                data[type].channeled = {
                    value: 0,
                    entries: [],
                };
            }

            if (!data[type].exhausted.value) {
                data[type].exhausted = {
                    value: 0,
                };
            }

            data[type].exhausted.value = parseInt(data[type].exhausted.value);

            if (!data[type].consumed.value) {
                data[type].consumed = {
                    value: 0,
                };
            }

            data[type].consumed.value = parseInt(data[type].consumed.value);
            if (type === "health") {
                data[type].available = {
                    value: Math.max(
                        Math.min(
                            healthNbrLevels * this.derivedValues[type + "points"].value -
                                data[type].channeled.value -
                                data[type].exhausted.value -
                                data[type].consumed.value,
                            healthNbrLevels * this.derivedValues[type + "points"].value
                        ),
                        0
                    ),
                };

                data[type].total = {
                    value: Math.max(
                        Math.min(
                            healthNbrLevels * this.derivedValues[type + "points"].value - data[type].consumed.value,
                            healthNbrLevels * this.derivedValues[type + "points"].value
                        ),
                        0
                    ),
                };

                data[type].available.percentage =
                    (100 * data[type].available.value) / (healthNbrLevels * this.derivedValues[type + "points"].value);
                data[type].exhausted.percentage =
                    (100 * data[type].exhausted.value) / (healthNbrLevels * this.derivedValues[type + "points"].value);
                data[type].channeled.percentage =
                    (100 * data[type].channeled.value) / (healthNbrLevels * this.derivedValues[type + "points"].value);
                data[type].total.percentage =
                    (100 * data[type].total.value) / (healthNbrLevels * this.derivedValues[type + "points"].value);
                data[type].max = healthNbrLevels * this.derivedValues.healthpoints.value;
            } else {
                data[type].available = {
                    value: Math.max(
                        Math.min(
                            this.derivedValues[type + "points"].value -
                                data[type].channeled.value -
                                data[type].exhausted.value -
                                data[type].consumed.value,
                            this.derivedValues[type + "points"].value
                        ),
                        0
                    ),
                };

                data[type].total = {
                    value: Math.max(
                        Math.min(
                            this.derivedValues[type + "points"].value - data[type].consumed.value,
                            this.derivedValues[type + "points"].value
                        ),
                        0
                    ),
                };
                if (this.derivedValues[type + "points"].value) {
                    data[type].available.percentage =
                        (100 * data[type].available.value) / this.derivedValues[type + "points"].value;
                    data[type].exhausted.percentage =
                        (100 * data[type].exhausted.value) / this.derivedValues[type + "points"].value;
                    data[type].channeled.percentage =
                        (100 * data[type].channeled.value) / this.derivedValues[type + "points"].value;
                    data[type].total.percentage =
                        (100 * data[type].total.value) / this.derivedValues[type + "points"].value;
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
        const currentLevel = Math.floor(data.health.total.value / this.derivedValues.healthpoints.value);
        const baseLevel = Math.max(healthNbrLevels - currentLevel - 1, 0);
        data.health.woundMalus.level = Math.min(
            baseLevel + this.modifier.getForId("actor.woundMalus.levelMod").getModifiers().sum,
            healthNbrLevels - 1
        );

        let woundMalusValue = data.health.woundMalus.levels[data.health.woundMalus.level];
        data.health.woundMalus.value = woundMalusValue?.value ?? 0;

        if (data.health.woundMalus.value) {
            this.modifier.add(
                "woundmalus",
                {
                    name: foundryApi.localize("splittermond.woundMalus"),
                    type: "innate",
                },
                of(data.health.woundMalus.value),
                this
            );
            this.modifier.addModifier(
                new InverseModifier(
                    "initiativewoundmalus",
                    of(-data.health.woundMalus.value),
                    {
                        name: foundryApi.localize("splittermond.woundMalus"),
                        type: "innate",
                    },
                    this,
                    false
                )
            );
        }

        data.healthBar = {
            value: data.health.total.value,
            max: healthNbrLevels * this.derivedValues.healthpoints.value,
        };

        data.focusBar = {
            value: data.focus.available.value,
            max: this.derivedValues.focuspoints.value,
        };
    }

    _prepareAttacks() {
        const attacks = this.attacks || [];
        const isInjuring = this.items.find((i) => i.name === "Natürliche Waffe");
        if (this.type === "character") {
            attacks.push(
                new Attack(this, {
                    id: "weaponless",
                    type: "not-an-item",
                    name: foundryApi.localize("splittermond.weaponless"),
                    img: "icons/equipment/hand/gauntlet-simple-leather-brown.webp",
                    system: {
                        skill: "melee",
                        attribute1: "agility",
                        attribute2: "strength",
                        weaponSpeed: 5,
                        features: ItemFeaturesModel.from(
                            ["Entwaffnend 1", "Umklammern", ...(isInjuring ? [] : ["Stumpf"])].join(", ")
                        ),
                        damage: DamageModel.from("1W6"),
                        damageType: "physical",
                        costType: isInjuring ? "V" : "E",
                    },
                })
            );
        }
    }

    _prepareActiveDefense() {
        const data = this.system;

        this.activeDefense.defense.push(
            new ActiveDefense(
                this.skills["acrobatics"].id,
                "defense",
                foundryApi.localize(this.skills["acrobatics"].label),
                this.skills["acrobatics"],
                ItemFeaturesModel.emptyFeatures()
            )
        );
        this.activeDefense.mindresist.push(
            new ActiveDefense(
                this.skills["determination"].id,
                "mindresist",
                foundryApi.localize(this.skills["determination"].label),
                this.skills["determination"],
                ItemFeaturesModel.emptyFeatures()
            )
        );
        this.activeDefense.bodyresist.push(
            new ActiveDefense(
                this.skills["endurance"].id,
                "bodyresist",
                foundryApi.localize(this.skills["endurance"].label),
                this.skills["endurance"],
                ItemFeaturesModel.emptyFeatures()
            )
        );
    }

    //this function is used in item.js to add modifiers to the actor
    addModifier(item, str = "", type = "", multiplier = 1) {
        const result = addModifier(item, str, type, multiplier);

        // Apply scalar modifiers to the actor's modifier manager
        result.modifiers.forEach((modifier) => {
            this.modifier.addModifier(modifier);
        });

        // Apply cost modifiers to the appropriate spell cost reduction managers
        const data = asPreparedData(this.system);
        result.costModifiers.forEach((costModifier) => {
            const modifierLabel = costModifier.label.toLowerCase();
            if (modifierLabel.startsWith("focus.reduction")) {
                data.spellCostReduction.addCostModifier(costModifier);
            } else if (modifierLabel.startsWith("focus.enhancedreduction")) {
                data.spellEnhancedCostReduction.addCostModifier(costModifier);
            }
        });

        return result;
    }

    _prepareModifier() {
        const data = this.system;
        if (this.type === "character") {
            if (data.experience.heroLevel > 1) {
                ["defense", "mindresist", "bodyresist"].forEach((d) => {
                    this.modifier.add(
                        d,
                        {
                            name: foundryApi.localize(`splittermond.heroLevels.${data.experience.heroLevel}`),
                            type: "innate",
                        },
                        of(2 * (data.experience.heroLevel - 1)),
                        this
                    );
                });
                this.modifier.add(
                    "actor.splinterpoints",
                    {
                        name: foundryApi.localize(`splittermond.heroLevels.${data.experience.heroLevel}`),
                        type: "innate",
                    },
                    of(data.experience.heroLevel - 1),
                    this
                );
            }
        }

        let stealthModifier = 5 - this.derivedValues.size.value;
        if (stealthModifier) {
            this.modifier.add(
                "stealth",
                {
                    name: foundryApi.localize("splittermond.derivedAttribute.size.short"),
                    type: "innate",
                },
                of(stealthModifier),
                this
            );
        }

        let handicap = this.handicap;
        if (handicap) {
            let label = game.i18n.localize("splittermond.handicap");
            ["athletics", "acrobatics", "dexterity", "stealth", "locksntraps", "seafaring", "animals"].forEach(
                (skill) => {
                    this.modifier.add(
                        skill,
                        {
                            name: label,
                            type: "equipment",
                        },
                        of(-handicap),
                        this
                    );
                }
            );
            this.modifier.add(
                "speed",
                {
                    name: label,
                    type: "innate",
                },
                of(-Math.floor(handicap / 2)),
                this
            );
        }
    }

    get tickMalus() {
        return (
            Math.max(this.modifier.getForId("tickmalus.shield").getModifiers().sum, 0) +
            Math.max(this.modifier.getForId("tickmalus.armor").getModifiers().sum, 0) +
            Math.max(this.modifier.getForId("tickmalus").getModifiers().sum, 0)
        );
    }

    get handicap() {
        return (
            Math.max(this.modifier.getForId("handicap.shield").getModifiers().sum, 0) +
            Math.max(this.modifier.getForId("handicap.armor").getModifiers().sum, 0) +
            Math.max(this.modifier.getForId("handicap").getModifiers().sum, 0)
        );
    }

    get damageReduction() {
        return this.modifier.getForId("damagereduction").getModifiers().sum;
    }

    /**
     * Under certain circumstances the actor can be protected against overriding damage reduction. This value represents the protected amount
     * @return {number} The actor's protected damage reduction
     */
    get protectedDamageReduction() {
        const itemsWithProtection = this.items
            .filter((i) => "features" in i.system)
            .filter((i) => i.system.features.hasFeature("Stabil"))
            .filter((i) => i.system.equipped ?? false);
        if (itemsWithProtection.length === 0) {
            return 0;
        } else if (getStableProtectsAllReduction()) {
            return this.damageReduction;
        } else {
            return itemsWithProtection.reduce((acc, item) => acc + item.system.damageReduction, 0);
        }
    }

    /**
     * @return {Record<DamageType, number>} The actor's linear resistance for each damage type. Positive values indicate a resistance,
     * negative values (not actually in the ruleset) indicate a weakness.
     */
    get resistances() {
        return this._resistances.calculateSusceptibilities();
    }

    /**
     * @return {Record<DamageType, number>} The actor's linear resistance for each damage type. Positive values indicate a resistance,
     * negative values (not actually in the ruleset) indicate a weakness.
     */
    get weaknesses() {
        return this._weaknesses.calculateSusceptibilities();
    }

    async importFromJSON(json, updateActor) {
        const data = JSON.parse(json);

        // If Genesis-JSON-Export
        if (data.jsonExporterVersion && data.system === "SPLITTERMOND") {
            updateActor = updateActor ?? (await askUserAboutActorOverwrite());
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
            value: genesisData.race,
        };
        newData.name = genesisData.name;
        newData.system.sex = genesisData.gender;
        newData.system.culture = genesisData.culture;
        newData.system.ancestry = genesisData.background;
        newData.system.education = genesisData.education;
        newData.system.experience = {
            free: genesisData.freeExp,
            spent: genesisData.investedExp,
        };
        newData.system.currency = {
            S: 0,
            L: 0,
            T: 0,
        };
        let moonSignDescription = genesisData.moonSign.description.replace(
            /Grad [1234]:/g,
            (m) => "<strong>" + m + "</strong>"
        );
        moonSignDescription = "<p>" + moonSignDescription.split("\n").join("</p><p>") + "</p>";

        let moonSignImage =
            "systems/splittermond/images/moonsign/" + data.moonSign.name.split(" ").join("_").toLowerCase() + ".png";
        let moonsignObj = {
            type: "moonsign",
            name: genesisData.moonSign.name,
            img: moonSignImage,
            system: {
                description: moonSignDescription,
            },
        };
        let moonsignIds = this.items
            .filter((i) => i.type === "moonsign")
            ?.map((i) => {
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
                name: w,
            });
        });
        genesisData.languages.forEach((w) => {
            newItems.push({
                type: "language",
                name: w,
            });
        });
        genesisData.cultureLores.forEach((w) => {
            newItems.push({
                type: "culturelore",
                name: w,
            });
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
                            modifierStr = `${id} emphasis="${emphasisName[1]}" +${m.level}`;
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
                            modifier: modifierStr,
                        },
                    };

                    newItems.push(newMastership);
                });
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
                    modifier: CONFIG.splittermond.modifier[s.id] || "",
                },
            });
        });

        genesisData.resources.forEach((r) => {
            newItems.push({
                type: "resource",
                name: r.name,
                system: {
                    value: r.value,
                    description: r.description,
                },
            });
        });

        const spells = genesisData.spells.map(genesisSpellImport);
        if (spells.includes(null)) {
            foundryApi.warnUser("splittermond.genesisImport.spellValidation.spellsExcluded");
        }
        spells.filter((spell) => !!spell).forEach((spell) => newItems.push(spell));

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
                    features: toItemFeatureModel(a.features),
                },
            });
        });

        genesisData.shields.forEach((s) => {
            newItems.push({
                type: "shield",
                name: s.name,
                img: CONFIG.splittermond.icons.shield[s.name] || CONFIG.splittermond.icons.shield.default,
                system: {
                    skill: CONFIG.splittermond.skillGroups.fighting.find((skill) => {
                        return (
                            s.skill.toLowerCase() ===
                            game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                        );
                    }),
                    defenseBonus: s.defensePlus,
                    tickMalus: s.tickMalus,
                    handicap: s.handicap,
                    features: toItemFeatureModel(s.features),
                },
            });
        });

        genesisData.meleeWeapons.forEach((w) => {
            if (w.name !== "Waffenlos") {
                newItems.push({
                    type: "weapon",
                    name: w.name,
                    img: CONFIG.splittermond.icons.weapon[w.name] || CONFIG.splittermond.icons.weapon.default,
                    system: {
                        skill: CONFIG.splittermond.skillGroups.fighting.find((skill) => {
                            return (
                                w.skill.toLowerCase() ===
                                game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                            );
                        }),
                        attribute1: w.attribute1Id.toLowerCase(),
                        attribute2: w.attribute2Id.toLowerCase(),
                        features: toItemFeatureModel(w.features),
                        damage: { stringInput: w.damage ?? null },
                        weaponSpeed: w.weaponSpeed,
                    },
                });
            }
        });

        genesisData.longRangeWeapons.forEach((w) => {
            const itemData = newItems.find((i) => i.name === w.name && i.type === "weapon");
            if (itemData) {
                itemData.system.secondaryAttack = {
                    skill: CONFIG.splittermond.skillGroups.fighting.find((skill) => {
                        return (
                            w.skill.toLowerCase() ===
                            game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                        );
                    }),
                    attribute1: w.attribute1Id.toLowerCase(),
                    attribute2: w.attribute2Id.toLowerCase(),
                    features: toItemFeatureModel(w.features),
                    damage: { stringInput: w.damage },
                    weaponSpeed: w.weaponSpeed,
                    range: w.range,
                };
            } else {
                newItems.push({
                    type: "weapon",
                    name: w.name,
                    img: CONFIG.splittermond.icons.weapon[w.name] || CONFIG.splittermond.icons.weapon.default,
                    system: {
                        skill: CONFIG.splittermond.skillGroups.fighting.find((skill) => {
                            return (
                                w.skill.toLowerCase() ===
                                game.i18n.localize(`splittermond.skillLabel.${skill}`).toLowerCase()
                            );
                        }),
                        attribute1: w.attribute1Id.toLowerCase(),
                        attribute2: w.attribute2Id.toLowerCase(),
                        features: toItemFeatureModel(w.features),
                        damage: { stringInput: w.damage },
                        weaponSpeed: w.weaponSpeed,
                        range: w.range,
                    },
                });
            }
        });

        genesisData.items.forEach((e) => {
            newItems.push({
                type: "equipment",
                name: e.name,
                img: CONFIG.splittermond.icons.equipment[e.name] || CONFIG.splittermond.icons.equipment.default,
                system: {
                    quantity: e.count,
                },
            });
        });

        if (genesisData.telare) {
            newData.system.currency.S = Math.floor(genesisData.telare / 10000);
            newData.system.currency.L = Math.floor(genesisData.telare / 100) - newData.system.currency.S * 100;
            newData.system.currency.T =
                Math.floor(genesisData.telare) - newData.system.currency.L * 100 - newData.system.currency.S * 10000;
        }

        if (updateActor) {
            let updateItems = [];

            newItems = newItems.filter((i) => {
                let foundItem = this.items.find(
                    (im) => im.type === i.type && im.name.trim().toLowerCase() === i.name.trim().toLowerCase()
                );
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
            this.system.updateSource({
                splinterpoints: {
                    ...this.system.splinterpoints,
                    value: parseInt(this.system.splinterpoints.value) - 1,
                },
            });
            return { pointSpent: true, getBonus: (skillName) => this.#getSplinterpointBonus(skillName) };
        }
        return { pointSpent: false, getBonus: () => 0 };
    }

    /**
     * This is a stub. It currently returns the flat upgrade value for health and skills.
     * Later it should check for specific masteries that increase the bonus values.
     * @param {SplittermondSkill} skillName
     * @return {number}
     */
    #getSplinterpointBonus(skillName) {
        const baseBonus =
            skillName === "health" ? splittermond.splinterpoints.healthBonus : splittermond.splinterpoints.skillBonus;
        const bonusFromModifiers = this.modifier
            .getForId("splinterpoints.bonus")
            .withAttributeValuesOrAbsent("skill", skillName)
            .notSelectable()
            .getModifiers()
            .map((m) => evaluate(m.value));
        const highestValue = Math.max(baseBonus, ...bonusFromModifiers);
        //Issue a warning when someone added a modifier that does not actually benefit them
        if (bonusFromModifiers.length > 0 && highestValue === baseBonus) {
            console.warn("Splittermond | Handed out minimum Splinterpoint bonus despite modifiers present");
        }
        return highestValue;
    }

    /**
     * @deprecated Use actor.spendSplinterpoint() instead, as it allows the caller to specify if and how a spent point, or
     * the inability to do so should be communicated to the user.
     * @param message
     * @return {Promise<void>}
     */
    async useSplinterpointBonus(message) {
        if (
            !message.flags.splittermond ||
            !message.flags.splittermond.check ||
            parseInt(this.splinterpoints.value) <= 0 ||
            message.flags.splittermond.check.isFumble
        ) {
            return;
        }

        let checkMessageData = message.flags.splittermond.check;

        const bonus = splittermond.splinterpoints.skillBonus;
        //Magic number 0; Message comes with a storage for several rolls, but we only set one roll in chat.js.
        message.rolls[0]._total = message.rolls[0]._total + bonus;
        checkMessageData.modifierElements.push({
            value: bonus,
            description: foundryApi.localize("splittermond.splinterpoint"),
        });

        this.update({ system: { splinterpoints: { value: parseInt(this.splinterpoints.value) - 1 } } });
        checkMessageData.availableSplinterpoints = 0;

        let checkData = await Dice.evaluateCheck(
            message.rolls[0],
            checkMessageData.skillPoints,
            checkMessageData.difficulty,
            checkMessageData.rollType
        );
        if (
            checkData.succeeded &&
            parseInt(checkMessageData.skillPoints) == 0 &&
            message.rolls[0]._total - checkMessageData.difficulty >= 3
        ) {
            checkData.degreeOfSuccess += 1;
        }

        checkMessageData.succeeded = checkData.succeeded;
        checkMessageData.degreeOfSuccess = checkData.degreeOfSuccess;

        let chatMessageData = await Chat.prepareCheckMessageData(
            this,
            message.rollMode,
            checkData.roll,
            checkMessageData
        );

        message.update({
            content: chatMessageData.content,
            "flags.splittermond.check": chatMessageData.flags.splittermond.check,
        });
        this.update({
            "system.splinterpoints.value": this.system.splinterpoints.value,
        });
    }

    /**
     * @param {SplittermondSkill|*} skillId
     * @param options
     * @returns {Promise<*>}
     */
    async rollSkill(skillId, options = {}) {
        let skill = this.skills[skillId];
        if (!skill) return;
        return skill.roll(options);
    }

    async rollAttack(attackId, options = {}) {
        let attack = this.attacks.find((a) => a.id === attackId);
        if (!attack) return;
        return attack.roll(options);
    }

    async rollSpell(spellId, options = {}) {
        let spell = this.spells.find((s) => s.id === spellId);
        if (!spell) return;
        return spell.roll(options);
    }

    async rollActiveDefense(defenseType, item) {
        return item.roll();
    }

    async rollAttackFumble() {
        return rollAttackFumble(this);
    }

    /**
     * @param {number} eg
     * @param {string} costs A cost string as used for Splittermond spells
     * @param {SplittermondSkill} skill
     * @param {boolean} askUser whether to ask the user for confirmation before applying the fumble effects
     * @return {Promise<FoundryChatMessage>}
     */
    async rollMagicFumble(eg = 0, costs = 0, skill = null, askUser = true) {
        return rollMagicFumble(this, { eg, costs, skill, askUser });
    }

    async addTicks(value = 3, message, askPlayer) {
        return addTicks(this, value, { message, askPlayer });
    }

    getRollData() {
        const data = this.system;
        let rollData = {};

        rollData["initiative"] = this.derivedValues.initiative.value;
        rollData[game.i18n.localize(`splittermond.derivedAttribute.initiative.short`).toLowerCase()] =
            this.derivedValues.initiative.value;

        return rollData;
    }

    async shortRest() {
        let focusData = duplicate(this.system.focus);
        let healthData = duplicate(this.system.health);

        focusData.exhausted.value = 0;
        healthData.exhausted.value = 0;

        return await this.update({ system: { health: healthData, focus: focusData } }); //propagate update to the database
    }

    async longRest(clearChanneled = true, askUser = true) {
        const finalClearChanneled = askUser ? await this.#askUserForLongRest() : clearChanneled;
        let focusData = duplicate(this.system.focus);
        let healthData = duplicate(this.system.health);

        if (finalClearChanneled) {
            focusData.channeled.entries = [];
        }

        healthData.channeled.entries = [];

        focusData.exhausted.value = 0;
        healthData.exhausted.value = 0;

        focusData.consumed.value = Math.max(
            focusData.consumed.value -
                this.focusRegenMultiplier * this.attributes.willpower.value -
                this.focusRegenBonus,
            0
        );
        healthData.consumed.value = Math.max(
            healthData.consumed.value -
                this.healthRegenMultiplier * this.attributes.constitution.value -
                this.healthRegenBonus,
            0
        );

        return await this.update({ system: { health: healthData, focus: focusData } }); //propagate update to the database
    }

    #askUserForLongRest() {
        const labels = {
            titleKey: "splittermond.clearChanneledFocus",
            contentKey: "splittermond.clearChanneledFocus",
            yesKey: "splittermond.yes",
            noKey: "splittermond.no",
        };
        return askUser(labels);
    }

    get healthRegenMultiplier() {
        const multiplierFromModifiers = this.modifier
            .getForId("actor.healthregeneration.multiplier")
            .notSelectable()
            .getModifiers();
        if (multiplierFromModifiers.length > 1) {
            console.warn(
                "Splittermond | Multiple modifiers for health regeneration multiplier found. Only the highest is applied."
            );
        } else if (multiplierFromModifiers.length === 0) {
            return 2;
        } else {
            return Math.max(...multiplierFromModifiers.map((m) => evaluate(m.value)));
        }
    }

    get healthRegenBonus() {
        return this.modifier.getForId("actor.healthregeneration.bonus").notSelectable().getModifiers().sum;
    }

    get focusRegenMultiplier() {
        const multiplierFromModifiers = this.modifier
            .getForId("actor.focusregeneration.multiplier")
            .notSelectable()
            .getModifiers();
        if (multiplierFromModifiers.length > 1) {
            console.warn(
                "Splittermond | Multiple modifiers for focus regeneration multiplier found. Only the highest is applied."
            );
        } else if (multiplierFromModifiers.length === 0) {
            return 2;
        } else {
            return Math.max(...multiplierFromModifiers.map((m) => evaluate(m.value)));
        }
    }

    get focusRegenBonus() {
        return this.modifier.getForId("actor.focusregeneration.bonus").notSelectable().getModifiers().sum;
    }

    /**
     *
     * @param {"health"|"focus"} type
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
                    entries: [],
                };
            }

            subData.channeled.entries.push({
                description: description,
                costs: costData.channeled,
            });
        }
        if (!subData.exhausted.value) {
            subData.exhausted = {
                value: 0,
            };
        }

        if (!subData.consumed.value) {
            subData.consumed = {
                value: 0,
            };
        }

        subData.exhausted.value += costData.exhausted;
        subData.consumed.value += costData.consumed;

        return this.update({
            system: {
                [type]: subData,
            },
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
        return type === "defense"
            ? showActiveDefenseDialog(this)
            : this.rollActiveDefense(type, this.activeDefense[type][0]);
    }

    toCompendium(pack) {
        this.setFlag("splittermond", "originId", this._id);
        return super.toCompendium(pack);
    }

    findItem() {
        let targetType = null;
        let targetName = null;
        const actor = this;

        function withType(type) {
            targetType = type.toLowerCase();
            return { withName: withName };
        }

        function withName(name) {
            targetName = name.toLowerCase();
            return execute();
        }

        function execute() {
            return actor.items
                .filter((i) => i.type === null || i.type.toLowerCase() === targetType)
                .find((i) => i.name.toLowerCase() === targetName);
        }

        return { withType, withName };
    }
}

async function askUserAboutActorOverwrite() {
    const labels = {
        titleKey: "Import",
        contentKey: "splittermond.updateOrOverwriteActor",
        yesKey: "splittermond.update",
        noKey: "splittermond.overwrite",
    };
    return askUser(labels);
}

/**
 * @param {string} titleKey The title of the dialog
 * @param {string} contentKey The content of the dialog
 * @param {string} yesKey The label of the button that resolves to true
 * @param {string} noKey The label of the button that resolves to false
 * @return {Promise<boolean>}
 */
async function askUser({ titleKey, contentKey, yesKey, noKey }) {
    return new Promise((resolve) => {
        let dialog = new FoundryDialog({
            window: { title: titleKey }, // foundry translates this
            content: "<p>" + foundryApi.localize(contentKey) + "</p>",
            buttons: [
                {
                    action: "yes",
                    default: true,
                    label: yesKey, // foundry translates this
                },
                {
                    action: "no",
                    label: noKey, //foundry translates this
                },
            ],
            submit: (result) => resolve(result === "yes"),
        });
        return dialog.render(true);
    });
}

function asPreparedData(system) {
    const qualifies = "spellCostReduction" in system && "spellEnhancedCostReduction" in system;
    if (qualifies) {
        return system; //There's not really much chance for error with the type of Spell cost reduction.
    } else {
        throw new Error("System not prepared for modifiers");
    }
}

/**
 *
 * @param {[{name:string, value:number, description:string}]}genesisFeatures
 * @returns {DataModelConstructorInput<ItemFeaturesType>}
 */
function toItemFeatureModel(genesisFeatures) {
    if (!genesisFeatures) {
        return [];
    }
    /**@type {{name:ItemFeature, value:number}[]}*/
    const featureList = genesisFeatures
        .map((f) => ({
            name: normalizeName(f.name.replace(/\s*\d+\s*$/, "").trim()),
            value: parseInt(f.value ?? 1),
        }))
        .filter((f) => {
            const isFeature = splittermond.itemFeatures.includes(f.name);
            if (!isFeature) {
                console.warn(`Splittermond | Unknown feature: ${f.name}`);
                foundryApi.warnUser("splittermond.message.featureParsingFailure", { feature: f.name });
            }
            return isFeature;
        });
    return { internalFeatureList: featureList };
}

/**
 * @param {string} name
 * @returns {ItemFeature}
 */
function normalizeName(name) {
    return splittermond.itemFeatures.find((f) => f.toLowerCase() === name.trim().toLowerCase()) ?? name;
}
