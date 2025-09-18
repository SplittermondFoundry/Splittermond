export default class Attribute {
    /**
     *
     * @param {Actor} actor
     * @param {string} attributeId ID of the attribute, like "agility", "strength" etc.
     */
    constructor(actor, attributeId) {
        this.actor = actor;
        this.id = attributeId;
        this.label = {
            short: `splittermond.attribute.${this.id}.short`,
            long: `splittermond.attribute.${this.id}.long`,
        };
        this._value = null;
        this._start = null;
        this._max = null;

        this._cache = {
            enabled: false,
            value: null,
            start: null,
            max: null,
        };
    }

    toObject() {
        return {
            id: this.id,
            label: this.label,
            value: this.value,
            start: this.start,
            max: this.max,
        };
    }

    get value() {
        if (this._cache.enabled && this._cache.value !== null) return this._cache.value;
        let val = this.start + parseInt(this.actor.system.attributes[this.id].advances || 0);
        if (this.actor.type == "npc") {
            val = parseInt(this.actor.system.attributes[this.id].value ?? val);
        }
        if (this._cache.enabled && this._cache.value === null) this._cache.value = val;
        return val;
    }

    get start() {
        if (this._cache.enabled && this._cache.start !== null) return this._cache.start;
        const data = this.actor.system;
        let val = parseInt(data.attributes[this.id].initial || 0) + parseInt(data.attributes[this.id].species || 0);
        if (this._cache.enabled && this._cache.start === null) this._cache.start = val;
        return val;
    }

    get max() {
        if (this._cache.enabled && this._cache.max !== null) return this._cache.max;
        let val = this.start + (this.actor.system?.experience?.heroLevel || 0);
        if (this._cache.enabled && this._cache.max === null) this._cache.max = val;
        return val;
    }

    enableCaching() {
        this._cache.enabled = true;
    }

    disableCaching() {
        this._cache.enabled = false;
        this._cache.start = null;
        this._cache.value = null;
        this._cache.max = null;
    }
}
