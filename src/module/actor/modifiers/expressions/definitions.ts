import {FoundryRoll} from "../../../api/Roll";
import {RollExpression} from "./rollExpressions";
import {CostModifier} from "../../../util/costs/Cost";
import {exhaustiveMatchGuard} from "./util";

export * from './rollExpressions'

export type Expression =
    ScalarExpression
    | VectorExpression;

export type ScalarExpression =
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

export type VectorExpression =
    CostExpression
    | CostAddExpression
    | CostSubtractExpression
    | LeftScalarMultiplication
    | RightScalarMultiplication
    | VecExpression


export function isExpression(value: unknown): value is Expression {
    return isScalarExpression(value) || isVectorExpression(value);
}

export function isScalarExpression(value: unknown): value is ScalarExpression {
    return value instanceof AmountExpression
        || value instanceof AddExpression
        || value instanceof SubtractExpression
        || value instanceof MultiplyExpression
        || value instanceof DivideExpression
        || value instanceof ReferenceExpression
        || value instanceof RollExpression
        || value instanceof AbsExpression
}

export function isVectorExpression(value: unknown): value is VectorExpression {
    return value instanceof CostExpression
        || value instanceof CostAddExpression
        || value instanceof CostSubtractExpression
        || value instanceof LeftScalarMultiplication
        || value instanceof RightScalarMultiplication
        || value instanceof VecExpression
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

export function roll(roll: FoundryRoll) {
    return new RollExpression(roll);
}

export function ref(propertyPath: string, source: object, stringRepresentation: string) {
    return new ReferenceExpression(propertyPath, source, stringRepresentation);
}

export function cost(cost: CostModifier) {
    if(cost === CostModifier.zero) {
        return new ZeroCostExpression();
    }else {
        return new CostExpression(cost);
    }
}


type SameGroup<T extends ScalarExpression | VectorExpression> = T extends VectorExpression ? VectorExpression : ScalarExpression

export function plus<T extends Expression>(left: T, right: SameGroup<T>) {
    if (left instanceof ZeroExpression) {
        return right;
    } else if (right instanceof ZeroExpression) {
        return left;
    } else if (isVectorExpression(left)) {
        return new CostAddExpression(left, right as CostExpression);
    } else if (isScalarExpression(left)) {
        return new AddExpression(left, right as ScalarExpression);
    }
    exhaustiveMatchGuard(left)
}

export function minus<T extends Expression>(left: T, right: SameGroup<T>) {
    if (left instanceof ZeroExpression) {
        return times(of(-1), right);
    } else if (right instanceof ZeroExpression) {
        return left;
    } else if (isVectorExpression(left)) {
        return new CostSubtractExpression(left, right as CostExpression);
    } else if (isScalarExpression(left)) {
        return new SubtractExpression(left, right as ScalarExpression);
    }
    exhaustiveMatchGuard(left)
}

type Cofactor<T extends Expression> = T extends ScalarExpression ? Expression : ScalarExpression;

export function times<T extends Expression>(left: T, right: Cofactor<T>) {
    if (left instanceof ZeroExpression) {
        return isScalarExpression(right) ? of(0) : cost(CostModifier.zero);
    } else if (left instanceof OneExpression) {
        return right;
    } else if (right instanceof ZeroExpression) {
        return isScalarExpression(left) ? of(0) : cost(CostModifier.zero);
    } else if (right instanceof OneExpression) {
        return left;
    } else if (isVectorExpression(left) && isScalarExpression(right)) {
        return new RightScalarMultiplication(left, right);
    } else if (isScalarExpression(left) && isVectorExpression(right)) {
        return new LeftScalarMultiplication(left, right);
    } else if (isScalarExpression(left) && isScalarExpression(right)) {
        return new MultiplyExpression(left, right);
    } else {
        throw new Error("Cannot multiply two vector expressions");
    }
}

export function dividedBy(left: Expression, right: ScalarExpression) {
    if (right instanceof ZeroExpression) {
        throw new Error("Division by zero")
    } else if (left instanceof ZeroExpression) {
        return of(0)
    } else if (right instanceof OneExpression) {
        return left;
    } else if (isVectorExpression(left)) {
        return new RightScalarMultiplication(left, new DivideExpression(of(1), right));
    } else {
        return new DivideExpression(left, right);
    }
}

export function abs(arg: Expression) {
    return new AbsExpression(arg);
}

export function vec(arg: Expression) {
    if (isVectorExpression(arg)) {
        return arg;
    } else {
        return new VecExpression(arg)
    }
}

export function scalar(arg: Expression) {
    if (isScalarExpression(arg)) {
        return arg;
    } else {
        return abs(arg)
    }
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
    constructor(public readonly left: ScalarExpression, public readonly right: ScalarExpression) {
    }
}

export class SubtractExpression {
    constructor(public readonly left: ScalarExpression, public readonly right: ScalarExpression) {
    }
}

export class MultiplyExpression {
    constructor(public readonly left: ScalarExpression, public readonly right: ScalarExpression) {
    }
}

export class DivideExpression {
    constructor(public readonly left: ScalarExpression, public readonly right: ScalarExpression) {
    }
}

export class AbsExpression {
    constructor(public readonly arg: Expression) {
    }
}


export class CostExpression {
    constructor(public readonly cost: CostModifier) {
    }
}

export class ZeroCostExpression extends CostExpression {
    constructor() {
        super(CostModifier.zero);
    }
}

export class CostAddExpression {
    constructor(public readonly left: VectorExpression, public readonly right: VectorExpression) {
    }
}

export class CostSubtractExpression {
    constructor(public readonly left: VectorExpression, public readonly right: VectorExpression) {
    }
}

export class LeftScalarMultiplication {
    constructor(public readonly left: ScalarExpression, public readonly right: VectorExpression) {
    }
}

export class RightScalarMultiplication {
    constructor(public readonly left: VectorExpression, public readonly right: ScalarExpression) {
    }
}

export class VecExpression {
    constructor(public readonly arg: ScalarExpression) {
    }
}

