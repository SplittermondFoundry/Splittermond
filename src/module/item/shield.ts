import SplittermondPhysicalItem from "./physical";
import AttackableItem from "./attackable-item";
import ActiveDefense from "../actor/active-defense";
import Skill from "../actor/skill";
import { ShieldDataModel } from "./dataModel/ShieldDataModel";
import { parseShieldMinAttributes } from "./minAttributesParser";

export { parseShieldMinAttributes, type ParsedMinAttribute } from "./minAttributesParser";

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
    }

    prepareActiveDefense() {
        if (!this.system.equipped && (this.system.damageLevel ?? 0) <= 1) return;

        let skill = Skill.initialize(this.actor, this.system.skill, "intuition", "strength");
        this.activeDefenses.push(
            new ActiveDefense(this.id, "defense", this.name, skill, this.system.features, this.img, this.type)
        );

        this.actor.activeDefense.defense.push(this.activeDefenses[0]);
    }

    get attributeMalus() {
        if (!this.system.equipped) return 0;
        const actor = this.actor;
        return parseShieldMinAttributes(this.system.minAttributes).reduce(
            (sum, { attr, threshold }) => sum + Math.max(threshold - parseInt(actor.attributes[attr].value), 0),
            0
        );
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
