import { asString, condense, isGreaterThan, isGreaterZero, minus, of } from "module/modifiers/expressions/scalar/index";

export default class Modifiable {
    /**
     * @param {SplittermondActor} actor
     * @param {string|string[]} path
     */
    constructor(actor, path) {
        this.actor = actor;
        if (!Array.isArray(path)) {
            path = [path];
        }
        this._modifierPath = path;
    }

    get mod() {
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
     * Override this if you want more specific modifier collection
     * @returns {Modifiers}
     */
    collectModifiers() {
        return this.actor.modifier
            .getForIds(...this._modifierPath)
            .notSelectable()
            .getModifiers();
    }
    #equipmentModifiers() {
        return this.collectModifiers().filter((mod) => mod.attributes.type === "equipment" && mod.isBonus);
    }
    #magicModifiers() {
        return this.collectModifiers().filter((mod) => mod.attributes.type === "magic" && mod.isBonus);
    }

    addModifierPath(path) {
        this._modifierPath.push(path);
    }

    //Bonus calculation is best done with evaluated modfiers, but we don't want to evaluate for the presentation
    //So we calculate the bonus cap again here.
    addModifierTooltipFormulaElements(formula) {
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
