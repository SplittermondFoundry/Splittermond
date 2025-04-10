import {FoundryRoll} from "../../../api/Roll";
import {RollExpression} from "./rollExpressions";

export * from './rollExpressions'

export type Expression =
    AmountExpression
    | ZeroExpression
    | OneExpression
    | RollExpression
    | AddExpression
    | SubtractExpression
    | MultiplyExpression
    | DivideExpression
    | ReferenceExpression
    | AbsExpression

export function isExpression(value: unknown): value is Expression {
    return value instanceof AmountExpression
        || value instanceof AddExpression
        || value instanceof SubtractExpression
        || value instanceof MultiplyExpression
        || value instanceof DivideExpression
        || value instanceof ReferenceExpression
        || value instanceof RollExpression
        || value instanceof AbsExpression
}

export function of(amount: number) {
    if (amount === 0) {
        return new ZeroExpression()
    } else if (amount === 1) {
        return new OneExpression();
    } else {
        return new AmountExpression(amount)
    }
}

export function plus(left: Expression, right: Expression) {
    if (left instanceof ZeroExpression) {
        return right;
    } else if (right instanceof ZeroExpression) {
        return left;
    } else {
        return new AddExpression(left, right);
    }
}

export function minus(left: Expression, right: Expression) {
    if (left instanceof ZeroExpression) {
        return times(of(-1), right);
    } else if (right instanceof ZeroExpression) {
        return left;
    } else {
        return new SubtractExpression(left, right);
    }
}

export function times(left: Expression, right: Expression) {
    if (left instanceof ZeroExpression) {
        return of(0)
    } else if (left instanceof OneExpression) {
        return right;
    } else if (right instanceof ZeroExpression) {
        return of(0)
    } else if (right instanceof OneExpression) {
        return left;
    } else {
        return new MultiplyExpression(left, right);
    }
}

export function dividedBy(left: Expression, right: Expression) {
    if (right instanceof ZeroExpression) {
        throw new Error("Division by zero")
    } else if (left instanceof ZeroExpression) {
        return of(0)
    } else if (right instanceof OneExpression) {
        return left;
    } else {
        return new DivideExpression(left, right);
    }
}

export function abs(arg: Expression) {
    return new AbsExpression(arg);
}

export function roll(roll: FoundryRoll) {
        return new RollExpression(roll);
}

export function ref(propertyPath:string, source:object, stringRepresentation:string){
    return new ReferenceExpression(propertyPath,source,stringRepresentation);
}

export class AmountExpression {
    constructor(public readonly amount: number) {
    }
}

class ZeroExpression extends AmountExpression {
    constructor() {
        super(0);
    }
}

class OneExpression extends AmountExpression {
    constructor() {
        super(1);
    }
}

export class ReferenceExpression {
    constructor(public readonly propertyPath: string, public readonly source: object, public readonly stringRep: string) {
    }
}

export class AddExpression {
    constructor(public readonly left: Expression, public readonly right: Expression) {
    }
}

export class SubtractExpression {
    constructor(public readonly left: Expression, public readonly right: Expression) {
    }
}

export class MultiplyExpression {
    constructor(public readonly left: Expression, public readonly right: Expression) {
    }
}

export class DivideExpression {
    constructor(public readonly left: Expression, public readonly right: Expression) {
    }
}

export class AbsExpression {
    constructor(public readonly arg: Expression) {
    }
}

