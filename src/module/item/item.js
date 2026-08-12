import { foundryApi } from "../api/foundryApi";
import { splittermond } from "module/config/index.js";
import { rebuildModifierEffects } from "../activeEffect/effectBuilder.ts";

/** @type {import("module/modifiers/modifierAddition").AddModifierResult extends object ? Function : never} */
let _addModifier = null;

/**
 * Inject the addModifier function produced by initializeModifiers.
 * Must be called during system init before any items are created.
 */
export function setAddModifier(addModifierFn) {
    _addModifier = addModifierFn;
}

export function getAddModifier() {
    return _addModifier;
}

export default class SplittermondItem extends Item {
    constructor(data, context = {}) {
        if (context?.splittermond?.ready) {
            super(data, context);
        } else {
            //In my opinion, this line shouldn't do anything, However, I don't have the time to test.
            foundryApi.utils.mergeObject(context, { splittermond: { ready: true } });
            const ItemConstructor = CONFIG.splittermond.Item.documentClasses[data.type];
            return ItemConstructor ? new ItemConstructor(data, context) : new SplittermondItem(data, context);
        }
    }

    prepareBaseData() {
        //console.log(`prepareBaseData() - ${this.type}: ${this.name}`);
        super.prepareBaseData();

        const data = this.system;

        //TODO: This stuff is NEVER active!
        if (data.id) {
            if (!data.description) {
                const descriptionId = `${this.type}.${data.id}.desc`;
                const descriptionText = foundryApi.localize(descriptionId);
                if (descriptionId !== descriptionText) {
                    data.description = descriptionText;
                }
            }

            if (splittermond.modifier[data.id]) {
                data.modifier = CONFIG.splittermond.modifier[data.id];
            }

            if (this.type === "spell") {
                const enhancementDescriptionId = `${this.type}.${data.id}.enhan`;
                const enhancementDescriptionText = game.i18n.localize(enhancementDescriptionId);
                if (enhancementDescriptionText !== enhancementDescriptionId) {
                    data.enhancementDescription = enhancementDescriptionText;
                }
            }

            if (this.type === "strength") {
                if (data.level === false || data.level === true) {
                    data.multiSelectable = data.level;
                    data.level = 1;
                }
                if (data.quantity) {
                    data.quantity = 1;
                }
            }
        }

        if (["strength", "mastery"].includes(this.type)) {
            if (!data.modifier) {
                if (CONFIG.splittermond.modifier[this.name.toLowerCase()]) {
                    data.modifier = CONFIG.splittermond.modifier[this.name.toLowerCase()];
                }
            }
        }
    }

    prepareActorData() {}

    /** @override */
    async _onCreate(data, options, userId) {
        await super._onCreate(data, options, userId);
        if (game.user.id !== userId) return;
        const config = this.#modifierRebuildConfig();
        if (config) {
            await this.#rebuildItemModifierEffects(config);
        }
    }

    /** @override */
    async _onUpdate(changed, options, userId) {
        await super._onUpdate(changed, options, userId);
        if (game.user.id !== userId) return;
        const config = this.#modifierRebuildConfig();
        if (!config) return;
        const system = changed.system ?? {};
        if (!config.rebuildTrigger(system)) return;
        await this.#rebuildItemModifierEffects(config);
    }

    /**
     * Per-type rebuild configuration mirroring prepareActorData's switch.
     * Returns null for item types that do not carry a `system.modifier` field.
     */
    #modifierRebuildConfig() {
        switch (this.type) {
            case "weapon":
                return {
                    modifierType: "equipment",
                    rebuildTrigger: (system) => "modifier" in system || "equipped" in system || "features" in system,
                };
            case "shield":
                return {
                    modifierType: "equipment",
                    rebuildTrigger: (system) =>
                        "modifier" in system ||
                        "equipped" in system ||
                        "defenseBonus" in system ||
                        "handicap" in system ||
                        "tickMalus" in system ||
                        "minAttributes" in system,
                };
            case "armor":
                return {
                    modifierType: "equipment",
                    rebuildTrigger: (system) =>
                        "modifier" in system ||
                        "equipped" in system ||
                        "defenseBonus" in system ||
                        "handicap" in system ||
                        "tickMalus" in system ||
                        "damageReduction" in system ||
                        "minStr" in system,
                };
            case "equipment":
                return {
                    modifierType: "equipment",
                    rebuildTrigger: (system) => "modifier" in system,
                };
            case "strength":
                return {
                    modifierType: "innate",
                    rebuildTrigger: (system) => "modifier" in system || "quantity" in system,
                };
            case "statuseffect":
                return {
                    modifierType: "innate",
                    rebuildTrigger: (system) => "modifier" in system || "level" in system,
                };
            case "spelleffect":
                return {
                    modifierType: "magic",
                    rebuildTrigger: (system) => "modifier" in system,
                };
            case "mastery":
                return {
                    modifierType: "innate",
                    rebuildTrigger: (system) => "modifier" in system || "skill" in system,
                };
            case "npcfeature":
            case "culturelore":
                return {
                    modifierType: "innate",
                    rebuildTrigger: (system) => "modifier" in system,
                };
            default:
                return null;
        }
    }

    async #rebuildItemModifierEffects(config) {
        let modifierString = this.system.modifier ?? "";
        if (this.type === "mastery") {
            let name = this.name;
            if (name.startsWith("Schwerpunkt")) {
                name = this.name.substring(12).trim();
            }
            modifierString = modifierString.replaceAll("${skill}", this.system.skill ?? "").replaceAll("${name}", name);
        }
        return rebuildModifierEffects(_addModifier, this, config.modifierType, modifierString);
    }
}
