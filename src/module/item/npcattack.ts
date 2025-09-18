import AttackableItem from "module/item/attackable-item";
import SplittermondItem from "module/item/item";
import ActiveDefense from "module/actor/active-defense";
import { NpcAttackDataModel } from "module/item/dataModel/NpcAttackDataModel";

export default class SplittermondNPCAttackItem extends AttackableItem(SplittermondItem) {
    //overwrite type
    declare public system: NpcAttackDataModel;

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
        this.attacks.forEach((attack) => {
            if (attack.range === 0) {
                this.activeDefenses.push(
                    new ActiveDefense(this.id, "defense", attack.name, attack.skill, attack.featuresAsRef, attack.img)
                );
            }
        });

        this.activeDefenses.forEach((d) => this.actor.activeDefense.defense.push(d));
    }
}
