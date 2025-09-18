import { PrimaryCost } from "./PrimaryCost.js";
import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";

/**
 * Represents a tax on an actor's health or focus pool.
 * in form of a parsed statement. It has to be classified as {@link PrimaryCost }or {@link CostModifier} before
 * it can be used in calculations. Only {@link PrimaryCost} can be applied to a health or focus pool.
 */
export class Cost {
    /**
     * Accepts the split portions of a Splittermond cost string. The numeric components must have an equal sign
     * @param  nonConsumed  the non-consumed portion (that is exhausted or channeled minus consumed) of the costs
     * @param  consumed the exclusive consumed portion of the costs
     * @param  isChanneled whether these costs represent channeled costs
     * @param  strict flag to enforce that this cost only applies to costs with the same channeled flag
     */
    private readonly nonConsumed: number;
    private readonly _consumed: number;

    constructor(
        nonConsumed: number,
        consumed: number,
        private readonly isChanneled: boolean,
        private readonly strict = false
    ) {
        const rawNonConsumed = Number.isFinite(nonConsumed) && nonConsumed !== 0 ? nonConsumed : 0;
        const rawConsumed = Number.isFinite(consumed) && consumed !== 0 ? consumed : 0;
        const sameSign = (rawNonConsumed <= 0 && rawConsumed <= 0) || (rawNonConsumed >= 0 && rawConsumed >= 0);
        this.nonConsumed = sameSign ? rawNonConsumed : 0; //the exclusive non consumed costs
        this._consumed = sameSign ? rawConsumed : 0; //the exclusive consumed costs
        this.isChanneled = !!isChanneled; //JS stupidity protection through type enforcement
        this.strict = !!strict; //JS stupidity protection through type enforcement
    }

    asPrimaryCost() {
        if (this.nonConsumed < 0 || this._consumed < 0) {
            throw new Error("Primary costs must not be negative");
        }
        return new PrimaryCost({
            _nonConsumed: this.nonConsumed,
            _consumed: this._consumed,
            _isChanneled: this.isChanneled,
        });
    }

    asModifier() {
        return new CostModifier({
            _channeled: this.isChanneled || !this.strict ? this.nonConsumed : 0,
            _channeledConsumed: this.isChanneled || !this.strict ? this._consumed : 0,
            _exhausted: !this.isChanneled || !this.strict ? this.nonConsumed : 0,
            _consumed: !this.isChanneled || !this.strict ? this._consumed : 0,
        });
    }

    /**
     * Give a faithful string representation of the costs, as in it will display zero costs and negative costs
     * Use the render method if you want to display costs to the user.
     * @override
     */
    toString(): string {
        const totalCost = this._consumed + this.nonConsumed;
        const channeledModifier = this.isChanneled && totalCost !== 0 ? "K" : "";
        const consumedModifier = this._consumed !== 0 ? `V${Math.abs(this._consumed)}` : "";
        return `${totalCost < 0 ? "-" : ""}${channeledModifier}${Math.abs(totalCost)}${consumedModifier}`;
    }
}

function CostModifierSchema() {
    return {
        _channeled: new fields.NumberField({ required: true, nullable: false }),
        _channeledConsumed: new fields.NumberField({ required: true, nullable: false }),
        _exhausted: new fields.NumberField({ required: true, nullable: false }),
        _consumed: new fields.NumberField({ required: true, nullable: false }),
    };
}

type CostModifierType = DataModelSchemaType<typeof CostModifierSchema>;

export class CostModifier extends SplittermondDataModel<CostModifierType> {
    static defineSchema = CostModifierSchema;

    static zero = new CostModifier({ _channeled: 0, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 });

    add(costs: CostModifier): CostModifier {
        const newChanneled = positiveZero(this._channeled + costs._channeled);
        const newChanneledConsumed = positiveZero(this._channeledConsumed + costs._channeledConsumed);
        const newExhausted = positiveZero(this._exhausted + costs._exhausted);
        const newConsumed = positiveZero(this._consumed + costs._consumed);
        return new (this.constructor as typeof CostModifier)({
            _channeled: newChanneled,
            _channeledConsumed: newChanneledConsumed,
            _exhausted: newExhausted,
            _consumed: newConsumed,
        });
    }

    multiply(factor: number): CostModifier {
        return new (this.constructor as typeof CostModifier)({
            _channeled: positiveZero(factor * this._channeled),
            _channeledConsumed: positiveZero(factor * this._channeledConsumed),
            _exhausted: positiveZero(factor * this._exhausted),
            _consumed: positiveZero(factor * this._consumed),
        });
    }

    subtract(cost: CostModifier): CostModifier {
        return this.add(cost.negate());
    }

    negate(): CostModifier {
        return this.multiply(-1);
    }

    /**
     * Returns th L2 norm of this cost vector
     */
    get length() {
        return Math.sqrt(
            this._exhausted ** 2 + this._channeled ** 2 + this._channeledConsumed ** 2 + this._consumed ** 2
        );
    }

    /**
     * Consumed portion of a modifier can only be evaluated relative to a primary cost,
     * because knowledge about whether the primary cost is channeled or not is required
     */
    getConsumed(primaryCost: PrimaryCost): number {
        return primaryCost.isChanneled ? this._channeledConsumed : this._consumed;
    }

    /**
     * Non-Consumed portion of a modifier can only be evaluated relative to a primary cost,
     * because knowledge about whether the primary cost is channeled or not is required
     */
    getNonConsumed(primaryCost: PrimaryCost): number {
        return primaryCost.isChanneled ? this._channeled : this._exhausted;
    }

    toString() {
        const channeled = strigifyPortion(this._channeled, this._channeledConsumed, true);
        const nonChanneled = strigifyPortion(this._exhausted, this._consumed, false);
        if (channeled === "" && nonChanneled === "") {
            return "0";
        } else if (channeled === "") {
            return nonChanneled;
        } else if (nonChanneled === "") {
            return channeled;
        } else if (nonChanneled !== "" && nonChanneled.startsWith("-")) {
            return `${channeled} - ${nonChanneled.replace("-", "")}`;
        } else {
            return `${channeled} + ${nonChanneled}`;
        }
    }
}

function positiveZero(value: number) {
    return value === 0 ? 0 : value;
}

function strigifyPortion(nonConsumed: number, consumed: number, channeled: boolean) {
    const absNonConsumed = Math.abs(nonConsumed);
    const absConsumed = Math.abs(consumed);

    if (Math.sign(consumed) === Math.sign(nonConsumed)) {
        const rep = singleTerm(absNonConsumed, absConsumed, channeled);
        return formatSingleTerm(nonConsumed, rep, false);
    } else {
        const ncTerm = singleTerm(absNonConsumed, 0, channeled);
        const ncString = formatSingleTerm(nonConsumed, ncTerm, false);
        const cTerm = singleTerm(0, absConsumed, channeled);
        const cString = formatSingleTerm(consumed, cTerm, ncString !== "");
        return `${ncString} ${cString}`.trim();
    }
}

function singleTerm(nonConsumed: number, consumed: number, channeled: boolean) {
    return new PrimaryCost({ _nonConsumed: nonConsumed, _consumed: consumed, _isChanneled: channeled }).render();
}

function formatSingleTerm(value: number, term: string, addPlus: boolean) {
    const sign = value < 0 ? "-" : `${addPlus ? "+" : ""}`;
    return term === "0" ? "" : `${sign}${addPlus ? " " : ""}${term}`;
}
