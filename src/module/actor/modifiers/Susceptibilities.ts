import {DamageType, damageTypes} from "../../config/damageTypes";
import ModifierManager from "../modifier-manager";


export class Susceptibilities {

    private susceptibilities: Record<DamageType, number> = {
        physical: 0,
        mental: 0,
        electric: 0,
        acid: 0,
        rock: 0,
        fire: 0,
        heat: 0,
        cold: 0,
        poison: 0,
        bleeding: 0,
        disease: 0,
        light: 0,
        shadow: 0,
        wind: 0,
        water: 0,
        nature: 0,
    };

    constructor(private keyword: string, private modifierManager: ModifierManager) {
    }

    calculateSusceptibilities(): Record<DamageType, number> {
        const susceptibilities = {...this.susceptibilities};
        damageTypes.forEach(type => {
                susceptibilities[type] = this.modifierManager.value(`${this.keyword}.${type}`) ?? 0;
            }
        );
        return susceptibilities;
    }
}