import {CostModifier} from "../../../util/costs/Cost";
import {Expression, of as scalarOf, AmountExpression as ScalarAmount} from "../scalar/definitions";

export type CostExpression =
    AmountExpression
    | ZeroExpression
    | AddExpression
    | SubtractExpression
    | MultiplyExpression
    | ReferenceExpression

export function isExpression(value: unknown): value is CostExpression {
    return value instanceof AmountExpression
        || value instanceof AddExpression
        || value instanceof SubtractExpression
        || value instanceof MultiplyExpression
        || value instanceof ReferenceExpression
}

export function of(amount: CostModifier) {
    if (amount.length === 0) {
        return new ZeroExpression()
    } else {
        return new AmountExpression(amount)
    }
}

export function plus(left: CostExpression, right: CostExpression) {
    if (left instanceof ZeroExpression) {
        return right;
    } else if (right instanceof ZeroExpression) {
        return left;
    } else {
        return new AddExpression(left, right);
    }
}

export function minus(left: CostExpression, right: CostExpression) {
    if (left instanceof ZeroExpression) {
        return times(scalarOf(-1), right);
    } else if (right instanceof ZeroExpression) {
        return left;
    } else {
        return new SubtractExpression(left, right);
    }
}

export function times(scalar: Expression, cost: CostExpression) {
    if (scalar instanceof ScalarAmount && scalar.amount === 0) {
        return of(CostModifier.zero);
    } else if (scalar instanceof ScalarAmount && scalar.amount === 1) {
            return cost;
    } else if (cost instanceof ZeroExpression) {
        return of(CostModifier.zero);
    } else {
        return new MultiplyExpression(scalar, cost);
    }
}

export function ref(propertyPath: string, source: object, stringRepresentation: string) {
    return new ReferenceExpression(propertyPath, source, stringRepresentation);
}

export class AmountExpression {
    constructor(public readonly amount: CostModifier) {
    }
}

class ZeroExpression extends AmountExpression {
    constructor() {
        super(CostModifier.zero);
    }
}

export class ReferenceExpression {
    constructor(public readonly propertyPath: string, public readonly source: object, public readonly stringRep: string) {
    }
}

export class AddExpression {
    constructor(public readonly left: CostExpression, public readonly right: CostExpression) {
    }
}

export class SubtractExpression {
    constructor(public readonly left: CostExpression, public readonly right: CostExpression) {
    }
}

export class MultiplyExpression {
    constructor(public readonly scalar: Expression, public readonly cost: CostExpression) {
    }
}
