import SplittermondPhysicalItem from "./physical";
import { of } from "../modifiers/expressions/scalar";
import { ArmorDataModel } from "./dataModel/ArmorDataModel";

export default class SplittermondArmorItem extends SplittermondPhysicalItem {
    declare public readonly system: ArmorDataModel;

    prepareActorData() {
        super.prepareActorData();
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
        let damageReduction = this.system.damageReduction;
        if (handicap)
            this.actor.modifier.add(
                "handicap.armor",
                {
                    name: this.name,
                    type: "equipment",
                },
                of(handicap),
                this
            );
        if (tickMalus)
            this.actor.modifier.add(
                "tickmalus.armor",
                {
                    name: this.name,
                    type: "equipment",
                },
                of(tickMalus),
                this
            );
        if (damageReduction)
            this.actor.modifier.add(
                "damagereduction",
                {
                    name: this.name,
                    type: "equipment",
                },
                of(damageReduction),
                this
            );
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
