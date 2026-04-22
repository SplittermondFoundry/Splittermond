import { foundryApi } from "../api/foundryApi";
import { splittermond } from "module/config/index.js";
import { rebuildModifierEffects } from "../activeEffect/effectBuilder.ts";

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

    prepareActorData() {
        const data = this.system;
        switch (this.type) {
            case "weapon":
            case "shield":
            case "armor":
                if (!data.equipped) {
                    break;
                }
            case "equipment":
                this.actor.addModifier(this, data.modifier, "equipment");
                break;
            case "strength":
                this.actor.addModifier(this, data.modifier, "innate", data.quantity);
                break;
            case "statuseffect":
                this.actor.addModifier(this, data.modifier, "statuseffect", data.level);
                break;
            case "spelleffect":
                if (data.active) {
                    this.actor.addModifier(this, data.modifier, "magic");
                }
                break;
            case "mastery":
                let modifier = data.modifier.replaceAll("${skill}", data.skill);
                let name = this.name;
                if (name.startsWith("Schwerpunkt")) {
                    name = this.name.substring(12).trim();
                }
                modifier = modifier.replaceAll("${name}", name);
                this.actor.addModifier(this, modifier, "innate");
                break;
            case "npcfeature":
                this.actor.addModifier(this, data.modifier, "innate");
                break;
            default:
                this.actor.addModifier(this, data.modifier);
                break;
        }
    }

    /** @override */
    async _onCreate(data, options, userId) {
        await super._onCreate(data, options, userId);
        if (this.type === "statuseffect" && game.user.id === userId) {
            await this.#rebuildStatusEffectModifiers();
        }
    }

    /** @override */
    async _onUpdate(changed, options, userId) {
        await super._onUpdate(changed, options, userId);
        if (this.type === "statuseffect" && game.user.id === userId) {
            const modifierChanged = "modifier" in (changed.system ?? {});
            const levelChanged = "level" in (changed.system ?? {});
            if (modifierChanged || levelChanged) {
                await this.#rebuildStatusEffectModifiers();
            }
        }
    }

    async #rebuildStatusEffectModifiers() {
        const level = this.system.level ?? 1;
        console.log(`Splittermond | rebuildStatusEffectModifiers for "${this.name}" (id=${this.system.id}), modifier="${this.system.modifier}", level=${level}`);
        await rebuildModifierEffects(this, "magic", level);
        console.log(`Splittermond | After rebuild, item effects count:`, (this).effects?.size ?? 0);
    }
}
