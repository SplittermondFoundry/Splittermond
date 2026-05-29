import {
    AddExpression,
    type CostExpression,
    MultiplyExpression,
    ReferenceExpression,
    SubtractExpression,
} from "./definitions";
import { type ActorProvider } from "module/modifiers/expressions/ActorProvider";
import { bindReferenceProviders as bindScalarProviders } from "module/modifiers/expressions/scalar/binder";

export function bindReferenceProviders(
    expression: CostExpression,
    provider: ActorProvider,
    onUnbound?: () => void
): void {
    if (expression instanceof ReferenceExpression) {
        expression.bindProvider(provider, onUnbound);
    } else if (expression instanceof AddExpression || expression instanceof SubtractExpression) {
        bindReferenceProviders(expression.left, provider, onUnbound);
        bindReferenceProviders(expression.right, provider, onUnbound);
    } else if (expression instanceof MultiplyExpression) {
        bindScalarProviders(expression.scalar, provider, onUnbound);
        bindReferenceProviders(expression.cost, provider, onUnbound);
    }
    // AmountExpression has no references to bind
}
