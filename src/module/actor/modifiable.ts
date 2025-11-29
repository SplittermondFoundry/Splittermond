import { asString, condense, isGreaterThan, isGreaterZero, minus, of } from "module/modifiers/expressions/scalar";
import { Modifiers } from "module/actor/modifiers/Modifiers";
import SplittermondActor from "./actor";

type Constructor<T = {}> = new (...args: any[]) => T;

export default function Modifiable<TBase extends Constructor<Object>>(base: TBase) {
    abstract class Modifiable extends base {
        abstract get actor(): SplittermondActor;
        abstract _modifierPath: string[];

        get mod(): number {
            const equipmentModifiers = this.#equipmentModifiers();
            const magicModifiers = this.#magicModifiers();
            const others = this.collectModifiers()
                .filter((m) => !equipmentModifiers.includes(m))
                .filter((m) => !magicModifiers.includes(m));
            const cappedEquipment = Math.min(equipmentModifiers.sum, this.actor.bonusCap);
            const cappedMagic = Math.min(magicModifiers.sum, this.actor.bonusCap);
            return others.sum + cappedEquipment + cappedMagic;
        }

        /**
         * @returns {Modifiers}
         * @final
         */
        collectModifiers(): Modifiers {
            const baseModifiers = this.actor.modifier
                .getForIds(...this._modifierPath)
                .notSelectable()
                .getModifiers();
            baseModifiers.push(...this.additionalModifiers());
            return baseModifiers;
        }

        /**
         * Override this if you want more specific modifier collection
         * @return {IModifier[]}
         */
        additionalModifiers(): any[] {
            return [];
        }

        #equipmentModifiers(): Modifiers {
            return this.collectModifiers().filter((mod: any) => mod.attributes.type === "equipment" && mod.isBonus);
        }

        #magicModifiers(): Modifiers {
            return this.collectModifiers().filter((mod: any) => mod.attributes.type === "magic" && mod.isBonus);
        }

        addModifierPath(...path: string[]): void {
            this._modifierPath.push(...path);
        }

        //Bonus calculation is best done with evaluated modifiers, but we don't want to evaluate for the presentation
        //So we calculate the bonus cap again here.
        addModifierTooltipFormulaElements(formula: any): void {
            this.collectModifiers().addTooltipFormulaElements(formula);
            const bonusCap = of(this.actor.bonusCap);
            const grandTotal = this.#equipmentModifiers().sumExpressions();
            const equipment = minus(this.#equipmentModifiers().sumExpressions(), bonusCap);
            const magic = minus(this.#magicModifiers().sumExpressions(), bonusCap);
            const adjustedBonus = minus(
                minus(grandTotal, isGreaterZero(equipment) ? equipment : of(0)),
                isGreaterZero(magic) ? magic : of(0)
            );
            if (isGreaterThan(grandTotal, adjustedBonus)) {
                const overflow = minus(grandTotal, adjustedBonus);
                formula.addMalus(asString(condense(overflow)), "splittermond.bonusCap");
            }
        }
    }
    return Modifiable;
}
