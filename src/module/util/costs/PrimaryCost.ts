import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import {CostModifier} from "./Cost";


function PrimaryCostSchema(){
    return {
        _nonConsumed: new fields.NumberField({
            required: true, blank: false, nullable: false,
            validate: (value) => value >= 0
        }),
        _consumed: new fields.NumberField({
            required: true, blank: false, nullable: false,
            validate: (value) => value >= 0
        }),
        _isChanneled: new fields.BooleanField({required: true, blank: false, nullable: false}),
    }
}
type PrimaryCostType = DataModelSchemaType<typeof PrimaryCostSchema>

/**
 * Represents the initial tax on an actor's health or focus pool.
 * Must not be negative
 *
 * @property  _nonConsumed  the non-consumed portion (that is exhausted or channeled minus consumed) of the costs
 * @property  _consumed the exclusive consumed portion of the costs
 * @property  _isChanneled whether these costs represent channeled costs
 */
export class PrimaryCost extends SplittermondDataModel<PrimaryCostType>{
    static defineSchema  = PrimaryCostSchema

    get isChanneled():boolean {
        return this._isChanneled;
    }

    /**
     * Returns the exhausted portions of the cost. Will default to 1 if no costs are present and this represents ordinary costs.
     */
    get exhausted():number {
        return this.isChanneled ? 0 : this._nonConsumed;
    }

    /**
     * Returns the channeled portion of the cost.
     */
    get channeled():number {
        return this.isChanneled ? this._nonConsumed : 0;
    }

    /**
     * Returns the consumed portion of the cost.
     */
    get consumed():number {
        return this._consumed;
    }

    add(costs:CostModifier):PrimaryCost {
        const modifiyNonConsumed = costs.getNonConsumed(this);
        const modifiyConsumed = costs.getConsumed(this);
        const rawConsumed = this._consumed + modifiyConsumed;
        const remainder = rawConsumed < 0 ? rawConsumed : 0; //overflow of consumed costs for non consumed costs
        const consumed = Math.max(rawConsumed, 0);

        const rawNonConsumed = this._nonConsumed + modifiyNonConsumed + remainder;
        const nonConsumed = Math.max(rawNonConsumed, 0); //we don't store negative cost values.
        return new (this.constructor as typeof PrimaryCost)({_nonConsumed: nonConsumed, _consumed: consumed, _isChanneled: this._isChanneled});
    }

    subtract(costs:CostModifier):PrimaryCost {
        return this.add(costs.negate());
    }

    isZero():boolean {
        return this._nonConsumed === 0 && this._consumed === 0;
    }

    /**
     * alias for render
     * @override
     */
    toString():string {
        return this.render();
    }

    /**
     * Converts this object into a splittermond string Representation
     * @override
     */
    render():string{
        const totalCost = this.consumed + this.channeled + this.exhausted
        const channeledModifier = this.isChanneled && totalCost !== 0 ? "K" : "";
        const consumedModifier = this._consumed !== 0 ? `V${Math.abs(this._consumed)}` : "";
        return `${channeledModifier}${Math.abs(totalCost)}${consumedModifier}`;
    }

    toModifier(strict=false):CostModifier {
      return new CostModifier({
            _channeled:  this.channeled||!strict ? this._nonConsumed : 0,
            _channeledConsumed: this.isChanneled || !strict ? this._consumed : 0,
            _exhausted: !this.isChanneled || !strict ? this._nonConsumed: 0,
            _consumed: !this.isChanneled || !strict ? this._consumed: 0,
      })
    }
}