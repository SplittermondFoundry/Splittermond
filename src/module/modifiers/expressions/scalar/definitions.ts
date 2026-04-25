import { FoundryRoll } from "module/api/Roll";
import { RollExpression } from "./rollExpressions";
import { foundryApi } from "module/api/foundryApi";

export * from "./rollExpressions";

export type Expression =
    | AmountExpression
    | ZeroExpression
    | OneExpression
    | RollExpression
    | AddExpression
    | SubtractExpression
    | MultiplyExpression
    | DivideExpression
    | ReferenceExpression
    | AbsExpression
    | PowerExpression;

export function isExpression(value: unknown): value is Expression {
    return (
        value instanceof AmountExpression ||
        value instanceof AddExpression ||
        value instanceof SubtractExpression ||
        value instanceof MultiplyExpression ||
        value instanceof DivideExpression ||
        value instanceof ReferenceExpression ||
        value instanceof RollExpression ||
        value instanceof AbsExpression ||
        value instanceof PowerExpression
    );
}

export function of(amount: number) {
    if (amount === 0) {
        return new ZeroExpression();
    } else if (amount === 1) {
        return new OneExpression();
    } else {
        return new AmountExpression(amount);
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
        return of(0);
    } else if (left instanceof OneExpression) {
        return right;
    } else if (right instanceof ZeroExpression) {
        return of(0);
    } else if (right instanceof OneExpression) {
        return left;
    } else {
        return new MultiplyExpression(left, right);
    }
}

export function dividedBy(left: Expression, right: Expression) {
    if (right instanceof ZeroExpression) {
        throw new Error("Division by zero");
    } else if (left instanceof ZeroExpression) {
        return of(0);
    } else if (right instanceof OneExpression) {
        return left;
    } else {
        return new DivideExpression(left, right);
    }
}

export function pow(base: Expression, exponent: Expression) {
    if (base instanceof OneExpression || exponent instanceof OneExpression) {
        return base;
    } else if (exponent instanceof ZeroExpression && base instanceof ZeroExpression) {
        return of(1);
    } else if (base instanceof ZeroExpression) {
        return of(0);
    } else if (exponent instanceof ZeroExpression) {
        return of(1);
    } else {
        return new PowerExpression(base, exponent);
    }
}

export function abs(arg: Expression) {
    return new AbsExpression(arg);
}

export function roll(roll: FoundryRoll) {
    return new RollExpression(roll);
}

export function ref(propertyPath: string, source: object, stringRepresentation: string) {
    return new ReferenceExpression(propertyPath, source, stringRepresentation);
}

export class AmountExpression {
    constructor(public readonly amount: number) {}
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

function hasUuid(object: object | null): object is { uuid: string } {
    return !!object && "uuid" in object && typeof object.uuid === "string";
}

export class ReferenceExpression {
    private _source: object | null;
    private readonly _uuid: string | null;

    constructor(
        public readonly propertyPath: string,
        source: object | null,
        public readonly stringRep: string,
        uuid: string | null = null
    ) {
        this._source = source;
        this._uuid = uuid ?? (hasUuid(source) ? source.uuid : null);
    }

    get source(): object {
        if (this._source) {
            return this._source;
        }
        if (this._uuid) {
            const resolved = foundryApi.utils.fromUUIDSync(this._uuid);
            if (!resolved) {
                throw new Error(
                    `Splittermond | Cannot resolve ReferenceExpression source: fromUuidSync returned null for uuid '${this._uuid}'.`
                );
            }
            this._source = resolved;
            return resolved;
        }
        throw new Error(`Splittermond | ReferenceExpression has neither a source object nor a uuid to resolve.`);
    }

    get uuid(): string | null {
        if (this._uuid) {
            return this._uuid;
        }
        if (hasUuid(this._source)) {
            return this._source.uuid;
        }
        return null;
    }
}

export class AddExpression {
    constructor(
        public readonly left: Expression,
        public readonly right: Expression
    ) {}
}

export class SubtractExpression {
    constructor(
        public readonly left: Expression,
        public readonly right: Expression
    ) {}
}

export class MultiplyExpression {
    constructor(
        public readonly left: Expression,
        public readonly right: Expression
    ) {}
}

export class DivideExpression {
    constructor(
        public readonly left: Expression,
        public readonly right: Expression
    ) {}
}

export class PowerExpression {
    constructor(
        public readonly base: Expression,
        public readonly exponent: Expression
    ) {}
}

export class AbsExpression {
    constructor(public readonly arg: Expression) {}
}
