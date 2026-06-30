import { DamageType, damageTypes } from "../config/damageTypes";
import ModifierManager from "./modifiers/modifier-manager";
import { asString, condense, evaluate, type Expression, of, syncEvaluate } from "module/modifiers/expressions/scalar";

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

    calculateSusceptibilities() {
        const susceptibilities = { ...this.susceptibilities };
        damageTypes.forEach((type) => {
            susceptibilities[type] = this.modifierManager
                .getForId(`${this.keyword}.${type}`)
                .getModifiers()
                .sumExpressions();
        });
        return new RecordedSusceptibilities(susceptibilities);
    }
}

class RecordedSusceptibilities {
    constructor(private readonly susceptibilities: Record<DamageType, Expression>) {}

    async calculate() {
        const evaluated = JSON.parse(JSON.stringify(this.susceptibilities));
        for (const key in this.susceptibilities) {
            evaluated[key] = await evaluate(this.susceptibilities[key as DamageType]);
        }
        return evaluated;
    }

    get display() {
        return this.syncMap((e) => asString(condense(e)));
    }
    get expression() {
        return this.syncMap((e) => e);
    }

    calculateSync() {
        return this.syncMap(syncEvaluate);
    }

    private syncMap<T>(operation: (x: Expression) => T): Record<DamageType, T> {
        const evaluated = JSON.parse(JSON.stringify(this.susceptibilities));
        for (const key in this.susceptibilities) {
            evaluated[key] = operation(this.susceptibilities[key as DamageType]);
        }
        return evaluated;
    }
}
