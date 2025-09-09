import {evaluate} from "../modifiers/expressions/scalar";

export default class Modifiable {
    /**
     * 
     * @param {Actor} actor 
     * @param {string} path 
     */
    constructor(actor, path) {
        this.actor = actor;
        if (!Array.isArray(path)) {
            path = [path];
        }
        this._modifierPath = path;
    }

    get mod() {
        const grandTotal = this.actor.modifier.getForIds(...this._modifierPath).notSelectable().getModifiers().sum;
        const bonusEquipment = this.actor.modifier.getForIds(...this._modifierPath).notSelectable().getModifiers()
            .filter(mod => mod.type === "equipment" && mod.isBonus).sum
        const bonusMagic = this.actor.modifier.getForIds(...this._modifierPath).notSelectable().getModifiers()
            .filter(mod => mod.type === "magic" && mod.isBonus).sum

        const cappedEquipment = grandTotal - Math.max(0, bonusEquipment - this.actor.bonusCap);
        return cappedEquipment - Math.max(0, bonusMagic - this.actor.bonusCap);
    }

    addModifierPath(path) {
        this._modifierPath.push(path);
    }

    addModifierTooltipFormulaElements(formula) {
        this.actor.modifier.getForIds(...this._modifierPath).notSelectable().getModifiers()
            .addTooltipFormulaElements(formula);
    }
}