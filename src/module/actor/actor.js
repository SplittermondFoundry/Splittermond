import { Dice } from "../check/dice";
import { Chat } from "../util/chat";

import Attribute from "./attribute";
import Skill from "./skill";
import DerivedValue from "./derived-value";
import ModifierManager from "./modifiers/modifier-manager";
import { Modifiers } from "./modifiers/Modifiers";
import Attack from "./attack";
import ActiveDefense from "./active-defense.js";
import { Cost } from "../util/costs/Cost";
import { initializeSpellCostManagement } from "../util/costs/spellCostManagement";
import { settings } from "../settings";
import { splittermond } from "../config";
import { foundryApi } from "../api/foundryApi";
import { Susceptibilities } from "./Susceptibilities";
import { addModifier } from "./addModifierAdapter";
import { evaluateBonusPool, allocateFromBonusPool, isEffectBonusExhausted } from "./bonusPool";
import { evaluate, max, min, minus, of, plus, syncEvaluate } from "../modifiers/expressions/scalar";
import { ItemFeaturesModel } from "../item/dataModel/propertyModels/ItemFeaturesModel";
import { DamageModel } from "../item/dataModel/propertyModels/DamageModel";
import { InverseModifier, SplittermondActiveEffect } from "module/activeEffect";
import { genesisSpellImport } from "./genesisImport/spellImport";
import { addTicks } from "module/combat/addTicks";
import { rollAttackFumble, rollMagicFumble } from "module/actor/fumble";
import { FoundryDialog } from "module/api/Application.js";
import { showActiveDefenseDialog } from "module/actor/ActiveDefenseDialog.js";
import { fromExpression } from "module/util/util.ts";
import { copyCompendiumEffectToItem } from "../activeEffect/compendiumEffectAssignment.ts";
import { substituteSkill, stripSchwerpunktPrefix } from "../activeEffect/sentinelSubstitution.ts";
import { documentValidator, registerHook } from "module/hooks/index.ts";
import { fields } from "module/data/SplittermondDataModel.ts";
import { PrimaryCost } from "module/util/costs/PrimaryCost.ts";

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

/**
 * A channeled-costs entry of a health/focus resource track, as defined by the
 * `channeled.entries` schema of HealthDataModel and FocusDataModel
 * (`./dataModel/`).
 * @typedef {Object} ChanneledEntry
 * @property {string} description
 * @property {number} costs
 */

/**
 * A persisted entry of the health/focus bonus pool. The `sourceId` is the uuid
 * of the granting ActiveEffect, the `value` that source's remaining points.
 * @typedef {Object} BonusEntry
 * @property {string} sourceId
 * @property {number} value
 */

/**
 * A health or focus resource track. The `consumed`, `exhausted`, `channeled`
 * and `bonus` fields are schema-backed (see HealthDataModel and FocusDataModel
 * in `./dataModel/`); `available`, `total`, `max`, the `percentage` fields and
 * `bonusPool` are the ephemeral values added by
 * `SplittermondActor#_prepareHealthFocus`.
 * @typedef {Object} ResourceTrack
 * @property {{value: number|string}} consumed
 * @property {{value: number|string}} exhausted
 * @property {{value: number, entries: ChanneledEntry[]}} channeled
 * @property {{entries: BonusEntry[]}} bonus
 * @property {{value: number, percentage: number}} available
 * @property {{value: number, percentage: number}} total
 * @property {import("./bonusPool").BonusPoolState & {startPercentage: number, percentage: number}} bonusPool
 * @property {number|string} max
 */

/**
 * Clamps a health/focus point value into the [0, maximum] range.
 * @param {number} value
 * @param {number} maximum
 * @returns {number}
 */
function limitToStatPoints(value, maximum) {
    return Math.max(Math.min(value, maximum), 0);
}

/**
 * Sums the costs of the channeled entries of a health/focus resource track.
 * @param {ChanneledEntry[]} entries
 * @returns {number}
 */
function sumChanneledCosts(entries) {
    return entries.reduce((acc, val) => acc + parseInt(val.costs || 0), 0);
}

/**
 * Normalizes a `consumed`/`exhausted` counter of a health/focus resource
 * track: a falsy value yields a fresh `{value: 0}` object, otherwise `value`
 * is overwritten with its parsed integer, preserving the counter object.
 * @param {{value: number|string}} counter
 * @returns {{value: number}}
 */
function normalizePointCounter(counter) {
    if (!counter.value) {
        return { value: 0 };
    }
    counter.value = parseInt(counter.value);
    return counter;
}

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
        this.bonusGrants = { healthpoints: [], focuspoints: [] };
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
                obj[id] = Skill.initialize(this, id);
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
                bonus: {
                    entries: [],
                },
                bonusPool: { granted: 0, remaining: 0, used: 0, startPercentage: 0, percentage: 0 },
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
                bonus: {
                    entries: [],
                },
                bonusPool: { granted: 0, remaining: 0, used: 0, startPercentage: 0, percentage: 0 },
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
            if (!this.findItem().withType("npcfeature").withName("Taktiker")) {
                this.modifier.add(
                    "check.require",
                    {
                        name: foundryApi.localize("splittermond.notATactician"),
                        type: "innate",
                        rollType: "standard",
                    },
                    of(0)
                );
            }
        }
    }

    get bonusCap() {
        return fromExpression(() => {
            if (this.type === "npc") return of(6);
            return plus(
                of(this.system.experience.heroLevel + 2),
                this.modifier.getForId("bonuscap").getModifiers().sumExpressions()
            );
        });
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
            this.system.splinterpoints.max += syncEvaluate(
                this.modifier.getForId("actor.splinterpoints").getModifiers().sumExpressions()
            );
        }
    }

    applyActiveEffects(phase) {
        super.applyActiveEffects(phase);
        if (phase !== "initial") return; //needs to be initial, b/c 'final' happens after derived value calculation.
        SplittermondActiveEffect.withFilter();
        for (/**@type SplittermondActiveEffect*/ const effect of this.allApplicableEffects()) {
            const modifiers = SplittermondActiveEffect.getModifiers([effect]);
            modifiers.forEach((mod) => this.modifier.addModifier(mod));
            this.captureBonusGrants(effect, modifiers);
            this.sortCostModifiersIntoManagers(SplittermondActiveEffect.getCostModifiers([effect]));
        }
    }

    /**
     * @private
     * @param {SplittermondActiveEffect} effect
     * @param {import("module/modifiers").IModifier[]} modifiers
     */
    captureBonusGrants(effect, modifiers) {
        [
            ["actor.healthpoints.bonus", "healthpoints"],
            ["actor.focuspoints.bonus", "focuspoints"],
        ].forEach(([groupId, type]) => {
            const selected = Modifiers.from(modifiers.filter((mod) => mod.groupId.toLowerCase() === groupId));
            if (selected.length === 0) return;
            const value = Math.max(Math.ceil(syncEvaluate(selected.sumExpressions())), 0);
            if (value > 0) {
                this.bonusGrants[type].push({ sourceId: effect.uuid, value });
            }
        });
    }

    /**
     * Whether an active effect has become ineffective: every health/focus
     * bonus it granted has been fully allocated and it applies no other
     * modifiers or cost modifications. Derived on the fly from the pool
     * entries persisted in the system data and the bonus grants captured
     * during the last data preparation.
     * @param {SplittermondActiveEffect} effect
     * @returns {boolean}
     */
    isEffectIneffective(effect) {
        const pools = [
            { entries: this.system.health.bonus.entries, grants: this.bonusGrants.healthpoints },
            { entries: this.system.focus.bonus.entries, grants: this.bonusGrants.focuspoints },
        ];
        if (!isEffectBonusExhausted(effect.uuid, pools)) return false;
        const bonusGroupIds = ["actor.healthpoints.bonus", "actor.focuspoints.bonus"];
        return (
            SplittermondActiveEffect.getCostModifiers([effect]).length === 0 &&
            SplittermondActiveEffect.getModifiers([effect]).every((mod) =>
                bonusGroupIds.includes(mod.groupId.toLowerCase())
            )
        );
    }

    /**
     * @param {ICostModifier[]} costModifiers
     */
    sortCostModifiersIntoManagers(costModifiers) {
        costModifiers.forEach((mod) => {
            const modifierLabel = mod.label.toLowerCase();
            if (modifierLabel.startsWith("focus.reduction")) {
                this.system.spellCostReduction.addCostModifier(mod);
            } else if (modifierLabel.startsWith("focus.enhancedreduction")) {
                this.system.spellEnhancedCostReduction.addCostModifier(mod);
            }
        });
    }

    /**@returns VirtualToken[]*/
    getVirtualStatusTokens() {
        return this.items
            .filter((e) => {
                return e.type === "statuseffect";
            })
            .filter((e) => {
                const combatEvent = e.system.combatEvent;
                const startTick = combatEvent?.startTick ?? e.system.startTick;
                const interval = combatEvent?.interval ?? e.system.interval;
                return startTick != null && startTick > 0 && interval != null && interval > 0;
            })
            .map((e) => {
                const event = e.system.combatEvent;
                const startTick = event?.startTick ?? e.system.startTick;
                const interval = event?.interval ?? e.system.interval;

                return {
                    name: e.name,
                    startTick: parseInt(startTick),
                    interval: parseInt(interval),
                    times: (event?.repeats ?? e.system.times) != null ? parseInt(event?.repeats ?? e.system.times) : 90,
                    description: e.system.description,
                    img: e.img,
                    level: e.system.level,
                    statusId: e.id,
                    macroRef: event?.macroRef ?? null,
                    postDescription: event?.postDescription ?? true,
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
        const nbrLevelFromMod = syncEvaluate(nbrLevelMods[nbrLevelMods.length - 1]?.value ?? of(0));
        return nbrLevelFromMod > 0 ? nbrLevelFromMod : this.system.health.woundMalus.nbrLevels;
    }

    get woundMalusMod() {
        return this.modifier.getForId("actor.woundmalus.mod").getModifiers().asProperty().summed();
    }

    /**
     * Prepares the health and focus resource tracks on `system.health` and
     * `system.focus` (shaped by HealthDataModel / FocusDataModel in
     * `./dataModel/` plus the ephemeral `available`, `total`, `max`,
     * `percentage` and `bonusPool` values), the wound malus level and value, and the
     * `healthBar`/`focusBar` token bar data. The healthpoints and focuspoints
     * derived values are evaluated exactly once each; neither of them can
     * reference the wound malus modifiers registered by `_prepareWoundMalus`
     * afterwards, so caching them up front is equivalent.
     *
     * @returns {void}
     */
    _prepareHealthFocus() {
        const data = this.system;
        const healthNbrLevels = this.healthNbrLevels;
        const healthpointsPerLevel = this.derivedValues.healthpoints.value.calculateSync();
        const focuspoints = this.derivedValues.focuspoints.value.calculateSync();
        const healthStatPoints = healthpointsPerLevel * healthNbrLevels;
        const statPointsByType = { health: healthStatPoints, focus: focuspoints };
        const bonusPools = {
            health: evaluateBonusPool(data.health.bonus.entries, this.bonusGrants.healthpoints),
            focus: evaluateBonusPool(data.focus.bonus.entries, this.bonusGrants.focuspoints),
        };

        const woundMalusMod = this.woundMalusMod.calculateSync();
        data.health.woundMalus.levels = foundryApi.utils
            .duplicate(splittermond.woundMalus[healthNbrLevels])
            .map((level) => {
                level.value = Math.min(level.value - woundMalusMod, 0);
                return level;
            });

        ["health", "focus"].forEach((type) =>
            this._prepareResourceTrack(type, statPointsByType[type], bonusPools[type])
        );

        this._prepareWoundMalus(healthpointsPerLevel, healthNbrLevels);

        data.healthBar = {
            value: data.health.total.value,
            max: healthStatPoints + bonusPools.health.remaining,
        };

        data.focusBar = {
            value: data.focus.available.value,
            max: focuspoints + bonusPools.focus.remaining,
        };
    }

    /**
     * Prepares a single health/focus resource track: normalizes the
     * `channeled`, `exhausted` and `consumed` counters and derives the
     * `available`, `total`, `percentage` and `max` values as well as the
     * `bonusPool` overlay geometry. The bonus pool extends the track's
     * capacity to `statPoints + bonus.remaining`, and the bar geometry
     * divides by `capacity = statPoints + bonus.remaining`; the bar ledger
     * in the well-formed case is
     * `available + uncoveredChanneled + exhausted + consumed = capacity`.
     * The `bonus` overlay marks the bonus tail of the available segment;
     * there is no separate overlay for the used share of the bonus. For
     * health, `statPoints` is the total across all wound malus levels; for
     * focus it is the focuspoint pool. A focus track without stat points gets
     * zeroed values, percentages, geometry and `max`.
     *
     * @param {"health"|"focus"} type
     * @param {number} statPoints
     * @param {import("./bonusPool").BonusPoolState} bonus
     * @returns {void}
     */
    _prepareResourceTrack(type, statPoints, bonus) {
        /**@type ResourceTrack*/
        const resource = this.system[type];
        const capacity = statPoints + bonus.remaining;

        if (resource.channeled.hasOwnProperty("entries")) {
            resource.channeled.value = limitToStatPoints(sumChanneledCosts(resource.channeled.entries), capacity);
        } else {
            resource.channeled = {
                value: 0,
                entries: [],
            };
        }

        resource.exhausted = normalizePointCounter(resource.exhausted);
        resource.consumed = normalizePointCounter(resource.consumed);

        const coveredChanneled = Math.min(bonus.remaining, resource.channeled.value);
        const uncoveredChanneled = resource.channeled.value - coveredChanneled;
        resource.available = {
            value: limitToStatPoints(
                capacity - uncoveredChanneled - resource.exhausted.value - resource.consumed.value,
                capacity
            ),
        };
        resource.total = {
            value: limitToStatPoints(capacity - resource.consumed.value, capacity),
        };

        if (type === "focus" && !statPoints) {
            resource.available.value = 0;
            resource.available.percentage = 0;
            resource.exhausted.percentage = 0;
            resource.channeled.percentage = 0;
            resource.total.value = 0;
            resource.total.percentage = 0;
            resource.max = 0;
            Object.assign(resource.bonusPool, { ...bonus, startPercentage: 0, percentage: 0 });
            return;
        }

        resource.available.percentage = (100 * resource.available.value) / capacity;
        resource.exhausted.percentage = (100 * resource.exhausted.value) / capacity;
        resource.channeled.percentage = (100 * uncoveredChanneled) / capacity;
        resource.total.percentage = (100 * resource.total.value) / capacity;

        Object.assign(resource.bonusPool, {
            ...bonus,
            startPercentage: (100 * Math.max(resource.available.value - bonus.remaining, 0)) / capacity,
            percentage: (100 * Math.min(bonus.remaining, resource.available.value)) / capacity,
        });

        if (type === "health") {
            resource.max = capacity;
        } else if (bonus.remaining > 0) {
            resource.max = `${this.derivedValues.focuspoints.value.display} + ${bonus.remaining}`;
        } else {
            resource.max = this.derivedValues.focuspoints.value.display;
        }
    }

    /**
     * Derives the wound malus level and value from the total health points
     * (`healthpointsPerLevel` per level) and registers the wound malus as an
     * innate skill modifier and as an inverted initiative modifier.
     *
     * @param {number} healthpointsPerLevel
     * @param {number} healthNbrLevels
     * @returns {void}
     */
    _prepareWoundMalus(healthpointsPerLevel, healthNbrLevels) {
        const woundMalus = this.system.health.woundMalus;

        const currentLevel = Math.floor(this.system.health.total.value / healthpointsPerLevel);
        const baseLevel = Math.max(healthNbrLevels - currentLevel - 1, 0);
        woundMalus.level = syncEvaluate(
            min(
                plus(
                    of(baseLevel),
                    this.modifier.getForId("actor.woundMalus.levelMod").getModifiers().sumExpressions()
                ),
                minus(of(healthNbrLevels), of(1))
            )
        );

        const currentWoundMalusLevel = woundMalus.levels[woundMalus.level];
        woundMalus.value = currentWoundMalusLevel?.value ?? 0;

        if (!woundMalus.value) {
            return;
        }

        const woundMalusLabel = foundryApi.localize("splittermond.woundMalus");
        this.modifier.add("woundmalus", { name: woundMalusLabel, type: "innate" }, of(woundMalus.value));
        this.modifier.addModifier(
            InverseModifier.create(
                "initiativewoundmalus",
                of(-woundMalus.value),
                { name: woundMalusLabel, type: "innate" },
                false
            )
        );
    }

    _prepareAttacks() {
        const attacks = this.attacks || [];
        const isInjuring = this.items.find((i) => i.name === "Natürliche Waffe");
        if (this.type === "character") {
            attacks.push(
                Attack.initialize(this, {
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

        result.modifiers.forEach(({ modifier }) => {
            this.modifier.addModifier(modifier.applyMultiplier(multiplier));
        });

        const rewrappedCostModifiers = result.costModifiers.map(({ modifier }) => modifier.applyMultiplier(multiplier));
        this.sortCostModifiersIntoManagers(rewrappedCostModifiers);
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
                        of(2 * (data.experience.heroLevel - 1))
                    );
                });
                this.modifier.add(
                    "actor.splinterpoints",
                    {
                        name: foundryApi.localize(`splittermond.heroLevels.${data.experience.heroLevel}`),
                        type: "innate",
                    },
                    of(data.experience.heroLevel - 1)
                );
            }
        }

        let stealthModifier = 5 - this.derivedValues.size.value.display;
        if (stealthModifier) {
            this.modifier.add(
                "stealth",
                {
                    name: foundryApi.localize("splittermond.derivedAttribute.size.short"),
                    type: "innate",
                },
                of(stealthModifier)
            );
        }

        let handicap = Number(this.handicap.display);
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
                        of(-handicap)
                    );
                }
            );
            this.modifier.add(
                "speed",
                {
                    name: label,
                    type: "innate",
                },
                of(-Math.floor(handicap / 2))
            );
        }
    }

    get tickMalus() {
        const sum = (getter) => max(getter().sumExpressions(), of(0));
        const shield = () => this.modifier.getForId("tickmalus.shield").getModifiers();
        const armor = () => this.modifier.getForId("tickmalus.armor").getModifiers();
        const base = () => this.modifier.getForId("tickmalus").getModifiers();
        return fromExpression(() => plus(plus(sum(shield), sum(armor)), sum(base)));
    }

    get handicap() {
        const sum = (getter) => max(getter().sumExpressions(), of(0));
        const shield = () => this.modifier.getForId("handicap.shield").getModifiers();
        const armor = () => this.modifier.getForId("handicap.armor").getModifiers();
        const base = () => this.modifier.getForId("handicap").getModifiers();
        return fromExpression(() => plus(plus(sum(shield), sum(armor)), sum(base)));
    }

    get typeList() {
        if (this.type === "character") return [];
        /**@type NpcDataModel*/
        const dataModel = this.system;
        return dataModel.type.split(",").map((type) => ({ label: type.trim() }));
    }

    get damageReduction() {
        return this.modifier.getForId("damagereduction").getModifiers().asProperty().summed();
    }

    /**
     * Under certain circumstances the actor can be protected against overriding damage reduction. This value represents the protected amount
     * @return {ValueBundle} The actor's protected damage reduction
     */
    get protectedDamageReduction() {
        const actor = this;
        const itemsWithProtection = () =>
            actor.items
                .filter((i) => "features" in i.system)
                .filter((i) => i.system.features.hasFeature("Stabil"))
                .filter((i) => i.system.equipped ?? false);
        const itemsReduction = () => itemsWithProtection().reduce((acc, item) => acc + item.system.damageReduction, 0);
        return {
            get display() {
                const items = itemsWithProtection();
                if (items.length === 0) return "0";
                if (getStableProtectsAllReduction()) return actor.damageReduction.display;
                return String(itemsReduction());
            },
            async calculate() {
                const items = itemsWithProtection();
                if (items.length === 0) return 0;
                if (getStableProtectsAllReduction()) return Number(await actor.damageReduction.calculate());
                return itemsReduction();
            },
        };
    }

    /**
     * The actor's linear resistance for each damage type. Positive values indicate a resistance,
     * negative values (not actually in the ruleset) indicate a weakness.
     */
    get resistances() {
        return this._resistances.calculateSusceptibilities();
    }

    /**
     * The actor's multiplicative weakness to each damage type. Positive values indicate an exponential weakness,
     * negative values (not actually in the ruleset) indicate an exponential resistance.
     */
    get weaknesses() {
        return this._weaknesses.calculateSusceptibilities();
    }

    async importFromJSON(json, updateActor) {
        const data = JSON.parse(json);

        // If Genesis-JSON-Export
        if (data.jsonExporterVersion && data.system === "SPLITTERMOND") {
            updateActor = updateActor ?? (await askUserAboutActorOverwrite());
            const { data: importedGenesisData, effectAssignments } = await this.importGenesisData(data, updateActor);
            json = JSON.stringify(importedGenesisData);
            const created = await super.importFromJSON(json);
            await this.applyEffectAssignments(created, effectAssignments);
            return created;
        }

        return super.importFromJSON(json);
    }

    /**
     * @private
     * @param {Record<string,unknown>} data
     * @param {boolean} updateActor
     * @returns {Promise<{ data: Partial<CharacterData> | undefined, effectAssignments: Map<string, { uuid: string, skill?: string, name?: string }> }>}
     */
    async importGenesisData(data, updateActor) {
        const genesisData = data;
        let newData = this.toObject();
        let newItems = [];
        const effectAssignments = new Map();
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
        newData.system.attributes = foundryApi.utils.duplicate(this.system.attributes);
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
        newData.system.skills = foundryApi.utils.duplicate(this.system.skills);
        genesisData.skills.forEach((s) => {
            let id = s.id.toLowerCase();
            if (newData.system.skills[id]) {
                newData.system.skills[id].points = s.points;

                s.masterships.forEach((m) => {
                    const configUuid = CONFIG.splittermond.modifier[m.id] || "";
                    let modifierStr = configUuid;
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
                        },
                    };

                    if (configUuid) {
                        effectAssignments.set(`${m.name.trim().toLowerCase()}|mastery`, {
                            uuid: configUuid,
                            skill: id,
                            name: stripSchwerpunktPrefix(m.name),
                        });
                    } else if (modifierStr !== "") {
                        newMastership.system.modifier = modifierStr;
                    }

                    newItems.push(newMastership);
                });
            } else {
                console.log("undefined Skill:" + id);
            }
        });

        genesisData.powers.forEach((s) => {
            const strengthItemData = {
                type: "strength",
                name: s.name,
                system: {
                    quantity: s.count,
                    description: s.longDescription,
                },
            };
            const uuid = CONFIG.splittermond.modifier[s.id] || "";
            if (uuid) {
                effectAssignments.set(`${s.name.trim().toLowerCase()}|strength`, { uuid });
            }
            newItems.push(strengthItemData);
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

            const createdItemKeys = new Set();
            newItems = newItems.filter((i) => {
                let foundItem = this.items.find(
                    (im) => im.type === i.type && im.name.trim().toLowerCase() === i.name.trim().toLowerCase()
                );
                if (foundItem) {
                    i._id = foundItem.id;
                    delete i.img;
                    updateItems.push(foundryApi.utils.duplicate(i));
                    return false;
                }
                createdItemKeys.add(`${i.name.trim().toLowerCase()}|${i.type}`);
                return true;
            });

            const assignmentsForCreated = new Map();
            for (const key of createdItemKeys) {
                if (effectAssignments.has(key)) {
                    assignmentsForCreated.set(key, effectAssignments.get(key));
                }
            }

            newData.system.currency = this.system.currency;

            await this.update(newData);
            await this.updateEmbeddedDocuments("Item", updateItems);
            const createdItems = await this.createEmbeddedDocuments("Item", newItems);

            for (const createdItem of createdItems) {
                const key = `${createdItem.name.trim().toLowerCase()}|${createdItem.type}`;
                const assignment = assignmentsForCreated.get(key);
                if (!assignment) continue;
                const substitutor = substituteSkill(assignment.skill ?? createdItem.system?.skill);
                await copyCompendiumEffectToItem(createdItem, assignment.uuid, substitutor);
            }

            return { data: await this.update(newData), effectAssignments: new Map() };
        }
        newData.name = genesisData.name;
        newData.prototypeToken.name = genesisData.name;
        newData.prototypeToken.actorLink = true;
        newData.items = foundryApi.utils.duplicate(newItems);
        return { data: newData, effectAssignments };
    }

    /**
     * @private
     * @param {object} createdActor The actor returned by `super.importFromJSON`.
     * @param {Map<string, { uuid: string, skill?: string, name?: string }>} effectAssignments
     * @returns {Promise<void>}
     */
    async applyEffectAssignments(createdActor, effectAssignments) {
        if (!effectAssignments || effectAssignments.size === 0) return;
        for (const [key, assignment] of effectAssignments) {
            const [nameKey, type] = key.split("|");
            const item = createdActor.items.find((i) => i.type === type && i.name.trim().toLowerCase() === nameKey);
            if (!item) continue;
            const substitutor = substituteSkill(assignment.skill ?? item.system?.skill);
            await copyCompendiumEffectToItem(item, assignment.uuid, substitutor);
        }
    }

    /** @returns {{pointSpent:boolean, getBonus(skillName:SplittermondSkill): Promise<number>}} splinterpoints spent */
    spendSplinterpoint() {
        if (this.splinterpoints.value > 0) {
            //We can keep this function dangling. It is not integral to the spend splinterpoint flow to have this
            //action completed before we return.
            // noinspection JSIgnoredPromiseFromCall
            this.update({
                system: {
                    splinterpoints: {
                        ...this.system.splinterpoints,
                        value: parseInt(this.system.splinterpoints.value) - 1,
                    },
                },
            });
            return {
                pointSpent: true,
                getBonus: async (skillName) => this.#getSplinterpointBonus(skillName),
            };
        }
        return { pointSpent: false, getBonus: () => Promise.resolve(0) };
    }

    /**
     * This is a stub. It currently returns the flat upgrade value for health and skills.
     * Later it should check for specific masteries that increase the bonus values.
     * @param {SplittermondSkill} skillName
     * @return {number}
     */
    async #getSplinterpointBonus(skillName) {
        const baseBonus =
            skillName === "health" ? splittermond.splinterpoints.healthBonus : splittermond.splinterpoints.skillBonus;
        const bonusFromModifiers = this.modifier
            .getForId("actor.splinterpoints.bonus")
            .withAttributeValuesOrAbsent("skill", skillName)
            .notSelectable()
            .getModifiers()
            .map((m) => m.value);
        const highestValue = await evaluate(max(of(baseBonus), ...bonusFromModifiers));
        //Issue a warning when someone added a modifier that does not actually benefit them
        if (bonusFromModifiers.length > 0 && highestValue === baseBonus) {
            console.warn("Splittermond | Handed out minimum Splinterpoint bonus despite modifiers present");
        }
        return highestValue;
    }

    /**
     * @deprecated Use actor.spendSplinterpoint() instead, as it allows the caller to specify if and how a spent point, or
     * the inability to do so should be communicated to the user.
     * @param {ChatMessage} message
     * @return {Promise<unknown>}
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

        this.update({
            system: {
                splinterpoints: { value: parseInt(this.splinterpoints.value) - 1 },
            },
        });
        checkMessageData.availableSplinterpoints = 0;

        let checkData = await Dice.evaluateCheck(
            message.rolls[0],
            checkMessageData.difficulty,
            checkMessageData.rollType
        );
        if (
            checkData.succeeded &&
            parseInt(checkMessageData.skillPoints) === 0 &&
            message.rolls[0]._total - checkMessageData.difficulty >= 3
        ) {
            checkData.degreeOfSuccess.fromRoll += 1;
        }

        checkMessageData.succeeded = checkData.succeeded;
        checkMessageData.degreeOfSuccess = {
            ...checkData.degreeOfSuccess,
            modification: checkMessageData.degreeOfSuccess.modification,
            limitedTo: checkMessageData.degreeOfSuccess.limitedTo,
        };

        let chatMessageData = await Chat.prepareCheckMessageData(
            this,
            message.messageMode,
            checkData.roll,
            checkMessageData
        );

        return Promise.all([
            message.update({
                content: chatMessageData.content,
                "flags.splittermond.check": chatMessageData.flags.splittermond.check,
            }),
            this.update({
                "system.splinterpoints.value": this.system.splinterpoints.value,
            }),
        ]);
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

        rollData["initiative"] = this.derivedValues.initiative.value.display;
        rollData[game.i18n.localize(`splittermond.derivedAttribute.initiative.short`).toLowerCase()] =
            this.derivedValues.initiative.value.display;

        return rollData;
    }

    async shortRest() {
        let focusData = foundryApi.utils.duplicate(this.system.focus);
        let healthData = foundryApi.utils.duplicate(this.system.health);

        focusData.exhausted.value = 0;
        healthData.exhausted.value = 0;

        return await this.update({
            system: { health: healthData, focus: focusData },
        }); //propagate update to the database
    }

    async longRest(clearChanneled = true, askUser = true) {
        const finalClearChanneled = askUser ? await this.#askUserForLongRest() : clearChanneled;

        if (finalClearChanneled) {
            await this.endChannel("focus", ...this.system.focus.channeled.entries.map((_, index) => index));
        }

        let focusData = foundryApi.utils.duplicate(this.system.focus);
        let healthData = foundryApi.utils.duplicate(this.system.health);

        focusData.exhausted.value = 0;
        healthData.exhausted.value = 0;

        const [focusRegenMultiplier, focusRegenBonus, healthRegenMultiplier, healthRegenBonus] = await Promise.all([
            this.focusRegenMultiplier.calculate(),
            this.focusRegenBonus.calculate(),
            this.healthRegenMultiplier.calculate(),
            this.healthRegenBonus.calculate(),
        ]);

        focusData.consumed.value = Math.max(
            focusData.consumed.value - focusRegenMultiplier * this.attributes.willpower.value - focusRegenBonus,
            0
        );
        healthData.consumed.value = Math.max(
            healthData.consumed.value - healthRegenMultiplier * this.attributes.constitution.value - healthRegenBonus,
            0
        );

        return await this.update({
            system: { health: healthData, focus: focusData },
        }); //propagate update to the database
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
        const modifiers = this.modifier.getForId("actor.healthregeneration.multiplier").notSelectable().getModifiers();
        if (modifiers.length > 1) {
            console.warn(
                "Splittermond | Multiple modifiers for health regeneration multiplier found. Only the highest is applied."
            );
        }
        const highestMod = modifiers.length === 0 ? of(2) : max(...modifiers.map((m) => m.value));
        return fromExpression(() => highestMod);
    }

    get healthRegenBonus() {
        return this.modifier
            .getForId("actor.healthregeneration.bonus")
            .notSelectable()
            .getModifiers()
            .asProperty()
            .summed();
    }

    get focusRegenMultiplier() {
        const modifiers = this.modifier.getForId("actor.focusregeneration.multiplier").notSelectable().getModifiers();
        if (modifiers.length > 1) {
            console.warn(
                "Splittermond | Multiple modifiers for health regeneration multiplier found. Only the highest is applied."
            );
        }
        const highestMod = modifiers.length === 0 ? of(2) : max(...modifiers.map((m) => m.value));
        return fromExpression(() => highestMod);
    }

    get focusRegenBonus() {
        return this.modifier
            .getForId("actor.focusregeneration.bonus")
            .notSelectable()
            .getModifiers()
            .asProperty()
            .summed();
    }

    /**
     * Applies a health or focus cost to the actor. Channeled costs open a new
     * channeled entry; consumed and exhausted costs are first absorbed from
     * the bonus pool granted by active effects, and only the remainder is
     * charged to the counters.
     * @param {"health"|"focus"} type
     * @param {import("../util/costs/PrimaryCost").PrimaryCost} primaryCost
     * @param {string} description
     */
    applyCost(type, primaryCost, description) {
        const subData = foundryApi.utils.duplicate(this.system[type]);
        this.applyCostToSubData(type, primaryCost, description, subData);
        return this.update({
            system: {
                [type]: subData,
            },
        });
    }

    /**
     * @private
     * @param {"health"|"focus"} type
     * @param {import("../util/costs/PrimaryCost").PrimaryCost} primaryCost
     * @param {string} description
     * @param {object} subData
     */
    applyCostToSubData(type, primaryCost, description, subData) {
        console.log(
            `Splittermond | Actor ${this.name} absorbed ${primaryCost} to his ${type} ${!!description ? `due to ${description}` : ""}`
        );
        onApplyCostHook.call(this, type, primaryCost);
        if (primaryCost.channeled > 0) {
            if (!subData.channeled.hasOwnProperty("entries")) {
                subData.channeled = {
                    value: 0,
                    entries: [],
                };
            }

            subData.channeled.entries.push({
                description: description,
                costs: primaryCost.channeled,
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

        const grants = type === "health" ? this.bonusGrants.healthpoints : this.bonusGrants.focuspoints;
        if (primaryCost.consumed > 0) {
            const consumedAllocation = allocateFromBonusPool(
                subData.bonus?.entries ?? [],
                grants,
                primaryCost.consumed
            );
            subData.bonus = { entries: consumedAllocation.entries };
            subData.consumed.value += primaryCost.consumed - consumedAllocation.absorbed;
        }
        if (primaryCost.exhausted > 0) {
            const exhaustedAllocation = allocateFromBonusPool(
                subData.bonus?.entries ?? [],
                grants,
                primaryCost.exhausted
            );
            subData.bonus = { entries: exhaustedAllocation.entries };
            subData.exhausted.value += primaryCost.exhausted - exhaustedAllocation.absorbed;
        }
    }

    /**
     *
     * @param {"health"|"focus"} type
     * @param {number} indexes index into system[type].channeled.entries
     * @returns {Promise<this>}
     */
    endChannel(type, ...indexes) {
        const subData = foundryApi.utils.duplicate(this.system[type]);
        let updated = false;
        for (const index of [...indexes].sort((a, b) => b - a)) {
            const entry = subData.channeled.entries[index];
            if (!entry) continue;

            const channelCost = new Cost(parseInt(entry.costs), 0, false).asPrimaryCost();
            subData.channeled.entries.splice(index, 1);
            this.applyCostToSubData(type, channelCost, "", subData);
            updated = true;
        }
        if (!updated) return;
        return this.update({
            system: {
                [type]: subData,
            },
        });
    }

    /**
     *
     * @param {"health"|"focus"} type
     * @param {number} index index into system[type].channeled.entries
     */
    removeChannel(type, index) {
        const data = this.system;
        const subData = foundryApi.utils.duplicate(data[type]);
        const entry = subData.channeled.entries[index];
        if (!entry) return;

        subData.channeled.entries.splice(index, 1);

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

        /**
         * @param {ItemType} type
         * @return {{withName: function(string): SplittermondItem|null}}
         */
        function withType(type) {
            targetType = type.toLowerCase();
            return { withName: withName };
        }

        /**
         * @param {string} name
         * @return {SplittermondItem|null}
         */
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

const onApplyCostHook = registerHook("onApplyCost", () => [
    documentValidator(SplittermondActor),
    new fields.StringField({ required: true, nullable: false }),
    new fields.EmbeddedDataField(PrimaryCost, { required: true, nullable: false }),
]);

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
