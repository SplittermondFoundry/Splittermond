import ActiveDefense from "module/actor/active-defense";
import AttackableItem from "module/item/attackable-item";
import SplittermondPhysicalItem from "module/item/physical";
import {WeaponDataModel} from "module/item/dataModel/WeaponDataModel";


export default class SplittermondWeaponItem extends AttackableItem(SplittermondPhysicalItem) {

    //overwrite type
    declare public system: WeaponDataModel;

    //we cannot define this field; Foundry does weird partial constructing of classes with documents that may delete a field
    declare private activeDefense: ActiveDefense[];

    prepareBaseData() {
        super.prepareBaseData()
        this.activeDefense = [];
    }

    prepareActorData() {
        super.prepareActorData();
        if (this.system.equipped && this.system.features.hasFeature("Unhandlich")) {
            this.actor.addModifier(this, "VTD -2", "equipment");
        }
        this.prepareActiveDefense();
    }

    prepareActiveDefense() {
        if (!this.system.equipped && (this.system.damageLevel ?? 0) <= 1) return;

        this.attacks.forEach(attack => {
            if (["melee", "slashing", "chains", "blades", "staffs"].includes(attack.skill.id)) {
                this.activeDefense.push(new ActiveDefense(this.id, "defense", attack.name, attack.skill, attack.featuresAsRef, attack.img));
            }
        });

        this.activeDefense.forEach(d => this.actor.activeDefense.defense.push(d));
    }

}