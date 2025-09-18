import SplittermondPhysicalItem from "./physical";
import AttackableItem from "./attackable-item";
import ActiveDefense from "../actor/active-defense";
import Skill from "../actor/skill";
import { of } from "../modifiers/expressions/scalar";
import { ShieldDataModel } from "./dataModel/ShieldDataModel";
import { splittermond } from "../config";
import { foundryApi } from "../api/foundryApi";

export default class SplittermondShieldItem extends AttackableItem(SplittermondPhysicalItem) {
    //overwrite type
    declare public system: ShieldDataModel;

    //we cannot define this field; Foundry does weird partial constructing of classes with documents that may delete a field
    declare private activeDefenses: ActiveDefense[];

    prepareBaseData() {
        super.prepareBaseData();
        this.activeDefenses = [];
    }

    prepareActorData() {
        super.prepareActorData();
        this.prepareActiveDefense();
        if (!this.system.equipped) return;
        if (this.system.defenseBonus)
            this.actor.modifier.add(
                "defense",
                {
                    name: this.name,
                    type: "equipment",
                },
                of(this.system.defenseBonus),
                this
            );
        let handicap = this.handicap;
        let tickMalus = this.tickMalus;
        if (handicap)
            this.actor.modifier.add(
                "handicap.shield",
                {
                    name: this.name,
                    type: "equipment",
                },
                of(handicap),
                this
            );
        if (tickMalus)
            this.actor.modifier.add(
                "tickmalus.shield",
                {
                    name: this.name,
                    type: "equipment",
                },
                of(tickMalus),
                this
            );
    }

    prepareActiveDefense() {
        if (!this.system.equipped && (this.system.damageLevel ?? 0) <= 1) return;

        let skill = new Skill(this.actor, this.system.skill, "intuition", "strength");
        this.activeDefenses.push(
            new ActiveDefense(this.id, "defense", this.name, skill, this.system.features, this.img)
        );

        this.actor.activeDefense.defense.push(this.activeDefenses[0]);
    }

    get attributeMalus() {
        if (!this.system.equipped) return 0;
        let minAttributeMalus = 0;
        const actor = this.actor;
        (this.system.minAttributes || "").split(",").forEach((aStr) => {
            let temp = aStr.match(/([^ ]+)\s+([0-9]+)/);
            if (temp) {
                let attr = splittermond.attributes.find((a) => {
                    return (
                        temp[1].toLowerCase() ===
                            foundryApi.localize(`splittermond.attribute.${a}.short`).toLowerCase() ||
                        temp[1].toLowerCase() === foundryApi.localize(`splittermond.attribute.${a}.long`).toLowerCase()
                    );
                });
                if (attr) {
                    minAttributeMalus += Math.max(parseInt(temp[2] || "0") - parseInt(actor.attributes[attr].value), 0);
                }
            }
        });

        return minAttributeMalus;
    }

    get handicap() {
        if (!this.system.equipped) return 0;
        return this.system.handicap + this.attributeMalus;
    }

    get tickMalus() {
        if (!this.system.equipped) return 0;
        return this.system.tickMalus + this.attributeMalus;
    }
}
