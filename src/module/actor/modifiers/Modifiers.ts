import type { IModifier } from "module/modifiers";
import { evaluate, of, plus, syncEvaluate, times } from "module/modifiers/expressions/scalar";
import { TooltipFormula } from "module/util/tooltip";

export class Modifiers extends Array<IModifier> {
    constructor(...args: IModifier[]) {
        super(...args);
        Object.setPrototypeOf(this, Modifiers.prototype);
    }

    static from(modifiers: ArrayLike<IModifier> | Iterable<IModifier>) {
        return new Modifiers(...Array.from(modifiers));
    }

    get groupId() {
        return this.map((mod) => mod.groupId).join(",");
    }

    get selectable() {
        return this.some((mod) => mod.selectable);
    }

    get nameForDisplay() {
        return this.map((mod) => mod.attributes).join(",");
    }

    get types(): string[] {
        const types = new Set<string>();
        this.map((mod) => mod.attributes.type)
            .filter((t) => t !== null && t !== undefined)
            .forEach((t) => types.add(t));
        return Array.from(types);
    }

    /**@deprecated use sum instead */
    get value() {
        return this.sum;
    }

    /**
     * Synchronous sum using {@link syncEvaluate}. Returns {@link Number.NaN} if any modifier contains a
     * non-deterministic roll. Use {@link sumAsync} when the real roll total is required.
     */
    get sum() {
        return syncEvaluate(this.sumExpressions());
    }

    async sumAsync() {
        return evaluate(this.sumExpressions());
    }

    get product() {
        return syncEvaluate(this.multiplyExpressions());
    }

    async productAsync() {
        return evaluate(this.multiplyExpressions());
    }

    sumExpressions() {
        return this.map((mod) => mod.value).reduce((acc, value) => plus(acc, value), of(0));
    }
    multiplyExpressions() {
        return this.map((mod) => mod.value).reduce((acc, value) => times(acc, value), of(1));
    }

    filter(predicate: (value: IModifier, index: number, array: IModifier[]) => boolean, thisArg?: any): Modifiers {
        return new Modifiers(...super.filter(predicate, thisArg));
    }

    addTooltipFormulaElements(formula: TooltipFormula) {
        this.forEach((mod) => mod.addTooltipFormulaElements(formula));
    }
}
