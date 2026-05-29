import {
    AbsExpression,
    AddExpression,
    DivideExpression,
    type Expression,
    MultiplyExpression,
    PowerExpression,
    ReferenceExpression,
    SubtractExpression,
} from "./definitions";
import { type ActorProvider } from "module/modifiers/expressions/ActorProvider";

export function bindReferenceProviders(
    expression: Expression,
    provider: ActorProvider,
    onUnbound?: () => void
): void {
    if (expression instanceof ReferenceExpression) {
        expression.bindProvider(provider, onUnbound);
    } else if (expression instanceof AddExpression || expression instanceof SubtractExpression) {
        bindReferenceProviders(expression.left, provider, onUnbound);
        bindReferenceProviders(expression.right, provider, onUnbound);
    } else if (expression instanceof MultiplyExpression || expression instanceof DivideExpression) {
        bindReferenceProviders(expression.left, provider, onUnbound);
        bindReferenceProviders(expression.right, provider, onUnbound);
    } else if (expression instanceof PowerExpression) {
        bindReferenceProviders(expression.base, provider, onUnbound);
        bindReferenceProviders(expression.exponent, provider, onUnbound);
    } else if (expression instanceof AbsExpression) {
        bindReferenceProviders(expression.arg, provider, onUnbound);
    }
    // AmountExpression and RollExpression have no references to bind
}
