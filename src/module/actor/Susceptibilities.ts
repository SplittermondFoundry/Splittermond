import { DamageType, damageTypes } from "../config/damageTypes";
import ModifierManager from "./modifiers/modifier-manager";
import { type Expression, of } from "module/modifiers/expressions/scalar";

export class Susceptibilities {
    private susceptibilities: Record<DamageType, Expression> = {
        physical: of(0),
        mental: of(0),
        electric: of(0),
        acid: of(0),
        rock: of(0),
        fire: of(0),
        heat: of(0),
        cold: of(0),
        poison: of(0),
        bleeding: of(0),
        disease: of(0),
        light: of(0),
        shadow: of(0),
        wind: of(0),
        water: of(0),
        nature: of(0),
    };

    constructor(
        private keyword: string,
        private modifierManager: ModifierManager
    ) {}

    calculateSusceptibilities(): Record<DamageType, Expression> {
        const susceptibilities = { ...this.susceptibilities };
        damageTypes.forEach((type) => {
            susceptibilities[type] = this.modifierManager
                .getForId(`${this.keyword}.${type}`)
                .getModifiers()
                .sumExpressions();
        });
        return susceptibilities;
    }
}
