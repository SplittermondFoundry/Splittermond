import {CostModifier} from "../../../../../module/util/costs/Cost";
import {isSameCostType} from "../../../../../module/util/costs/equalType";
import {expect} from "chai";
import {PrimaryCost} from "../../../../../module/util/costs/PrimaryCost";

describe('Cost type equality', () => {


    [
        new CostModifier({_channeled: 1, _consumed: 0, _exhausted: 0, _channeledConsumed: 0}),
        new CostModifier({_channeled: 0, _consumed: 1, _exhausted: 0, _channeledConsumed: 0}),
        new CostModifier({_channeled: 0, _consumed: 0, _exhausted: 1, _channeledConsumed: 0}),
        new CostModifier({_channeled: 0, _consumed: 0, _exhausted: 0, _channeledConsumed: 1}),
        new CostModifier({_channeled: 1, _consumed: 1, _exhausted: 0, _channeledConsumed: 0}),
        new CostModifier({_channeled: 1, _consumed: 0, _exhausted: 1, _channeledConsumed: 0}),
        new CostModifier({_channeled: 1, _consumed: 0, _exhausted: 0, _channeledConsumed: 1}),
        new CostModifier({_channeled: 0, _consumed: 1, _exhausted: 0, _channeledConsumed: 1}),
        new CostModifier({_channeled: 0, _consumed: 1, _exhausted: 1, _channeledConsumed: 0}),
        new CostModifier({_channeled: 0, _consumed: 1, _exhausted: 1, _channeledConsumed: 0}),
        new CostModifier({_channeled: 1, _consumed: 0, _exhausted: 0, _channeledConsumed: 1}),
        new CostModifier({_channeled: 1, _consumed: 1, _exhausted: 0, _channeledConsumed: 1}),
        new CostModifier({_channeled: 1, _consumed: 0, _exhausted: 1, _channeledConsumed: 1}),
        new CostModifier({_channeled: 1, _consumed: 1, _exhausted: 1, _channeledConsumed: 1}),
    ].forEach((cost,index) => {

        it(`cost modifier ${index} should be same type as itsself`, () => {
            expect(isSameCostType(cost, cost)).to.be.true;
        })

        it(`cost modifier ${index} should be same type as itsself scaled`, () => {
            expect(isSameCostType(cost, cost.multiply(2))).to.be.true;
        });

        it(`cost modifier ${index} scaled by a lot should be same type as itsself`, () => {
            expect(isSameCostType(cost.multiply(200000), cost)).to.be.true;
        });

        it(`cost modifier ${index} should not be equal to linearly independet vector`, () => {
            expect(isSameCostType(
                cost,
                new CostModifier({_channeled: 2, _consumed: 1, _exhausted: 25, _channeledConsumed: 1})))
                .to.be.false;
        });
    });
    [
        new CostModifier({_channeled: 1, _consumed: 0, _exhausted: 0, _channeledConsumed: 0}),
        new CostModifier({_channeled: 100000, _consumed: 0, _exhausted: 0, _channeledConsumed: 0}),
    ].forEach((cost,index) => {
        it(`${index} should not be the same type as one with a consumed  portion`,() =>{
           const unequal = new CostModifier({_channeled: 0, _consumed: 1, _exhausted: 0, _channeledConsumed: 0});

           expect(isSameCostType(cost, unequal)).to.be.false;
        })
    });


    [
        new PrimaryCost({_consumed:1, _nonConsumed:0, _isChanneled:true}),
        new PrimaryCost({_consumed:0, _nonConsumed:1, _isChanneled:true}),
        new PrimaryCost({_consumed:1, _nonConsumed:1, _isChanneled:true}),
        new PrimaryCost({_consumed:1, _nonConsumed:0, _isChanneled:false}),
        new PrimaryCost({_consumed:0, _nonConsumed:1, _isChanneled:false}),
        new PrimaryCost({_consumed:1, _nonConsumed:1, _isChanneled:false}),
    ].forEach((cost,index) => {

            it(`Primary cost ${index} should be same type as itsself`, () => {
                expect(isSameCostType(cost, cost)).to.be.true;
            })

            it(`Primary cost ${index} should be same type as itsself scaled`, () => {
                expect(isSameCostType(cost, cost.add(cost.toModifier(true)))).to.be.true;
            });
    });

    // a single scale of 1000 is already significanly larger than the largest realistic value for any entry.
    it("Cost modifier should be not equal even for narrow angles", () => {
        const cost1 = new CostModifier({_channeled: 1, _consumed: 0, _exhausted: 0, _channeledConsumed: 0});
        const cost2 = new CostModifier({_channeled: 1000, _consumed: 0, _exhausted: 0, _channeledConsumed: 1});

        expect(isSameCostType(cost1, cost2)).to.be.false;
    })
});