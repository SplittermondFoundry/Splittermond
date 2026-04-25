import { CostModifier } from "module/util/costs/Cost";
import { AmountExpression as ScalarAmount, Expression, of as scalarOf } from "../scalar/definitions";
import { foundryApi } from "module/api/foundryApi";

function hasUuid(object: object | null): object is { uuid: string } {
    return !!object && "uuid" in object && typeof object.uuid === "string";
}

export type CostExpression =
    | AmountExpression
    | ZeroExpression
    | AddExpression
    | SubtractExpression
    | MultiplyExpression
    | ReferenceExpression;

export function isExpression(value: unknown): value is CostExpression {
    return (
        value instanceof AmountExpression ||
        value instanceof AddExpression ||
        value instanceof SubtractExpression ||
        value instanceof MultiplyExpression ||
        value instanceof ReferenceExpression
    );
}

export function of(amount: CostModifier) {
    if (amount.length === 0) {
        return new ZeroExpression();
    } else {
        return new AmountExpression(amount);
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
    constructor(public readonly amount: CostModifier) {}
}

class ZeroExpression extends AmountExpression {
    constructor() {
        super(CostModifier.zero);
    }
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
                    `Splittermond | Cannot resolve cost ReferenceExpression source: fromUuidSync returned null for uuid '${this._uuid}'.`
                );
            }
            this._source = resolved;
            return resolved;
        }
        throw new Error(`Splittermond | Cost ReferenceExpression has neither a source object nor a uuid to resolve.`);
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
        public readonly left: CostExpression,
        public readonly right: CostExpression
    ) {}
}

export class SubtractExpression {
    constructor(
        public readonly left: CostExpression,
        public readonly right: CostExpression
    ) {}
}

export class MultiplyExpression {
    constructor(
        public readonly scalar: Expression,
        public readonly cost: CostExpression
    ) {}
}
