import SplittermondPhysicalItem from "./physical";
import { ArmorDataModel } from "./dataModel/ArmorDataModel";

export default class SplittermondArmorItem extends SplittermondPhysicalItem {
    declare public readonly system: ArmorDataModel;

    prepareActorData() {
        super.prepareActorData();
    }

    get attributeMalus() {
        if (!this.system.equipped) return 0;
        return Math.max((this.system.minStr ?? 0) - parseInt(this.actor.attributes.strength.value), 0);
    }

    get handicap() {
        if (!this.system.equipped) return 0;
        return (this.system.handicap ?? 0) + this.attributeMalus;
    }

    get tickMalus() {
        if (!this.system.equipped) return 0;
        return (this.system.tickMalus ?? 0) + this.attributeMalus;
    }

    get featuresList() {
        return this.system.features.featuresAsStringList();
    }
}
