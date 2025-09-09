import {
    abs,
    AddExpression,
    AmountExpression,
    Expression,
    minus, of,
    plus,
    RollExpression,
    SubtractExpression, times
} from "./definitions";
import {condense} from "./condenser";

export * from "./definitions";
export * from "./evaluation";
export * from "./condenser";
export * from "./Stringifier";
export * from "./Comparator";
export * from "./rollTermMapper";
export * from "./toRollMapper";


/**
 * Splittermond roll terms generally follow the pattern of RollTerm, OperatorTerm, NumericTerm. Unfortuantely,
 * a generic algorithm to condense severeal numeric terms behind a roll term is hard to implement. However,
 * given the prevalence of the single numeric term pattern, we can implement a special case solution.
 */
export function condenseCombineDamageWithModifiers(mainComponent: Expression, modifiers: Expression) {
    mainComponent = condense(mainComponent);
    modifiers = condense(modifiers);
    if (modifiers instanceof AmountExpression && (mainComponent instanceof AddExpression || mainComponent instanceof SubtractExpression)) {
        const left = condense(mainComponent.left);
        const right = condense(mainComponent.right);
        if (left instanceof RollExpression && right instanceof AmountExpression) {
            const modifier = mainComponent instanceof SubtractExpression ? condense(times(of(-1), right)) : right;
            const roll = mainComponent.left;
            const newModifier = condense(plus(modifier, condense(modifiers)));
            if (newModifier instanceof AmountExpression) {
                return (newModifier.amount > 0 ? plus : minus)(roll, condense(abs(newModifier)))
            } else {
                return plus(newModifier, roll);
            }
        }
    }
    return condense(plus(mainComponent, condense(modifiers)));
}
