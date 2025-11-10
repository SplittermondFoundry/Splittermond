import { foundryApi } from "module/api/foundryApi.js";
import { splittermond } from "module/config/index.js";

export default class ActiveDefense {
    /**
     * @param {string}id
     * @param {string}type
     * @param {string}name
     * @param {Skill}skill
     * @param {ItemFeaturesModel}features
     * @param {string|null}img
     */
    constructor(id, type, name, skill, features, img = null) {
        this.id = id;
        this.type = type;
        this.skill = skill;
        this.actor = this.skill.actor;
        this.itemFeatures = features;
        this.name = name;
        this.img = img;
    }

    get features() {
        return this.itemFeatures.features;
    }

    async roll(options = {}) {
        if (!this.actor) return Promise.resolve(false);

        options = duplicate(options);
        options.type = "defense";
        options.preSelectedModifier = [];
        options.difficulty = splittermond.check.activeDefenseDifficulty;
        options.title = `${foundryApi.localize(`splittermond.activeDefense`)}: ${game.i18n.localize(this.actor.derivedValues[this.type].label.long)} - ${this.name}`;
        options.checkMessageData = {
            defenseType: this.type,
            baseDefense: this.actor.derivedValues[this.type].value,
            itemData: this,
        };

        return this.skill.roll(options);
    }

    tooltip() {
        return this.skill.tooltip();
    }
}
