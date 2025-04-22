import Skill from "./skill.js";
import {of} from "./modifiers/expressions/scalar";
import {foundryApi} from "../api/foundryApi.js";

export default class Attack {
    /**
     * 
     * @param {Actor} actor Actor-Object of attack
     * @param {(Item|Object)} item Corresponding item for attack
     * @param {boolean=false} secondaryAttack Generate secondary attack of item
     */
    constructor(actor, item, secondaryAttack = false) {
        this.actor = actor;
        this.item = item;
        this.isSecondaryAttack = secondaryAttack;
        let attackData = this.item;
        if (this.item.system) {
            attackData = this.item.system;
        }
        if (this.isSecondaryAttack && attackData.secondaryAttack) {
            attackData = attackData.secondaryAttack;
        }


        let minAttributeMalus = 0;
        (attackData.minAttributes || "").split(",").forEach(aStr => {
            let temp = aStr.match(/([^ ]+)\s+([0-9]+)/);
            if (temp) {
                let attr = CONFIG.splittermond.attributes.find(a => {
                    return temp[1].toLowerCase() === game.i18n.localize(`splittermond.attribute.${a}.short`).toLowerCase() || temp[1].toLowerCase() === game.i18n.localize(`splittermond.attribute.${a}.long`).toLowerCase()
                });
                if (attr) {
                    let diff = parseInt(this.actor.attributes[attr].value) - parseInt(temp[2] || 0);
                    if (diff < 0) {
                        minAttributeMalus += diff;
                    }
                }
            }
        });


        this.id = !this.isSecondaryAttack ? this.item.id : `${this.item.id}_secondary`;
        this.img = this.item.img;
        this.name = !this.isSecondaryAttack ? this.item.name : `${this.item.name} (${game.i18n.localize(`splittermond.skillLabel.${attackData.skill}`)})`;
        this.skill = new Skill(this.actor, (attackData.skill || this.name), (attackData.attribute1 || ""), (attackData.attribute2 || ""), attackData.skillValue ?? null);
        this.skill.addModifierPath(`skill.${this.id}`);

        if (minAttributeMalus) {
            this.actor.modifier.add(
                `skill.${this.id}`,
                {
                    name: foundryApi.localize("splittermond.minAttributes"),
                    type: "innate",
                },
                of(minAttributeMalus),
                this
            );
            this.actor.modifier.add("weaponspeed",
                {
                    item: this.id,
                    name: foundryApi.localize("splittermond.minAttributes"),
                    type: "innate",
                },
                of(minAttributeMalus),
                this
            );
        }

        if (parseInt(attackData.skillMod)) {
            this.actor.modifier.add(
                `skill.${this.id}`,
                {
                    name: foundryApi.localize("splittermond.skillMod"),
                    type: "innate",
                },
                of(parseInt(attackData.skillMod)),
                this
            );
        }

        if ((this.item?.systemData?.().damageLevel || 0) > 2) {
            this.actor.modifier.add(
                `skill.${this.id}`,
                {
                    name: foundryApi.localize("splittermond.damageLevel"),
                    type: "innate"
                },
                of(-3),
                this
            );
        }

        this.range = attackData.range || 0;
        this.features = attackData.features || "";
        this._damage = attackData.damage || "1W6+1";
        this._weaponSpeed = attackData.weaponSpeed || 7;
        this.editable = ["weapon", "shield", "npcattack"].includes(this.item.type);
        this.deletable = ["npcattack"].includes(this.item.type);
    }

    toObject() {
        return {
            id: this.id,
            img: this.img,
            name: this.name,
            skill: this.skill.toObject(),
            range: this.range,
            features: this.features,
            damage: this.damage,
            damageType: this.damageType,
            costType: this.costType,
            weaponSpeed: this.weaponSpeed,
            editable: this.editable,
            deletable: this.deletable,
            isPrepared: this.isPrepared,
            featureList: this.featureList
        }
    }



    get damage() {
        let damage = this._damage;
        let mod = this.actor.modifier.getForId("damage").notSelectable()
            .withAttributeValuesOrAbsent("item",this.item.name).getModifiers().value;
        if (this.actor.items.find(i => i.type == "mastery" && i.system.skill == this.skill.id && i.name.toLowerCase() == "improvisation") && this.features.toLowerCase().includes("improvisiert")) {
            mod += 2;
        }
        if (mod != 0)
            damage += (mod < 0 ? "" : "+") + mod;
        return damage;
    }

    get damageType() {
        //We have fake items passing through here
        return this.item.system?.damageType ?? this.item.damageType;
    }

    get costType() {
        //We have fake items passing through here
        return this.item.system?.costType ?? this.item.costType;
    }

    get weaponSpeed() {
        let weaponSpeed = this._weaponSpeed;
        weaponSpeed -= this.actor.modifier.getForId("weaponspeed")
            .withAttributeValuesOrAbsent("item", this.item, this.item.name).getModifiers().value;
        if (this.actor.items.find(i => i.type == "mastery" && i.name.toLowerCase() == "improvisation") && this.features.toLowerCase().includes("improvisiert")) {
            weaponSpeed -= 2;
        }
        if (["melee", "slashing", "chains", "blades", "staffs"].includes(this.skill.id))
            weaponSpeed += parseInt(this.actor.tickMalus);
        return weaponSpeed;
    }

    get isPrepared() {
        return ["longrange", "throwing"].includes(this.skill.id) ? this.actor.getFlag("splittermond", "preparedAttack") == this.id : true;
    }

    get featureList() {
        return this.features?.split(",")?.map(str => str.trim());
    }

    async roll(options) {
        if (!this.actor) return false;

        options = duplicate(options);
        options.type = "attack";
        options.subtitle = this.item.name;
        options.difficulty = "VTD";
        options.preSelectedModifier = [this.item.name];
        options.checkMessageData = {
            weapon: this.toObject()
        }

        return this.skill.roll(options);
    }


}