import { foundryApi } from "../api/foundryApi";

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

        if (data.id) {
            if (!data.description) {
                const descriptionId = `${this.type}.${data.id}.desc`;
                const descriptionText = game.i18n.localize(descriptionId);
                if (descriptionId !== descriptionText) {
                    data.description = descriptionText;
                }
            }

            if (CONFIG.splittermond.modifier[data.id]) {
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
}
