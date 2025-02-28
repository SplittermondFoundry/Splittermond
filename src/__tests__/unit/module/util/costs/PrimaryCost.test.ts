import "../../../foundryMocks.js"
import {describe, it} from "mocha";
import {expect} from "chai";
import {PrimaryCost} from "module/util/costs/PrimaryCost.js";
import {Cost} from "module/util/costs/Cost.js";
import {parseCostString} from "module/util/costs/costParser.js";

describe("BaseCost object edge cases", () => {
    it("isZero should return true for a zero cost object", () => {
        expect(new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false}).isZero()).to.be.true;
    });

    it("isZero should return false for a non-zero cost object", () => {
        expect(new PrimaryCost({_nonConsumed: 1, _consumed: 0, _isChanneled: false}).isZero()).to.be.false;
    });

    it("should return zero BaseCosts when adding two zero cost objects", () => {
        const costs = new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false});
        const result = costs.add(new Cost(0, 0, false).asModifier());
        expect(result).to.deep.equal(new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false}));
    });

    it("should return zero costs when subtracting two zero cost objects", () => {
        const costs = new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false});
        const result = costs.subtract(new Cost(0, 0, false).asModifier());
        expect(result).to.deep.equal(new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false}));
    });

    it("should not produce negative costs", () => {
        const costs = new PrimaryCost({_nonConsumed: 1, _consumed: 0, _isChanneled: false});
        const result = costs.subtract(new Cost(2, 0, false).asModifier());
        expect(result).to.deep.equal(new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false}));
    });

    it("should ignore the channeled property for the purpose of addition", () => {
        const costs = new PrimaryCost({_nonConsumed: 1, _consumed: 0, _isChanneled: false});
        const result = costs.add(new Cost(2, 0, false).asModifier());
        expect(result).to.deep.equal(new PrimaryCost({_nonConsumed: 3, _consumed: 0, _isChanneled: false}));
    });

});

describe("BaseCost object operation", () => {
    ([
        [new PrimaryCost({
            _nonConsumed: 3,
            _consumed: 1,
            _isChanneled: false
        }), new Cost(4, 2, false), new PrimaryCost({_nonConsumed: 7, _consumed: 3, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 5,
            _isChanneled: false
        }), new Cost(4, 0, false), new PrimaryCost({_nonConsumed: 4, _consumed: 5, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 1,
            _isChanneled: true
        }), new Cost(0, 1, false), new PrimaryCost({_nonConsumed: 0, _consumed: 2, _isChanneled: true})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 1,
            _isChanneled: false
        }), new Cost(0, 1, true), new PrimaryCost({_nonConsumed: 0, _consumed: 2, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 3,
            _consumed: 1,
            _isChanneled: false
        }), new Cost(0, 0, true), new PrimaryCost({_nonConsumed: 3, _consumed: 1, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 0,
            _isChanneled: false
        }), new Cost(3, 0, true), new PrimaryCost({_nonConsumed: 3, _consumed: 0, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 3,
            _isChanneled: false
        }), new Cost(0, 3, true), new PrimaryCost({_nonConsumed: 0, _consumed: 6, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 100,
            _consumed: 3000,
            _isChanneled: false
        }), new Cost(0, 1, true), new PrimaryCost({_nonConsumed: 100, _consumed: 3001, _isChanneled: false})],
    ] as const).forEach(
        ([costs1, costs2, expected]) => it(`should add ${costs1} and ${costs2} to ${expected}`, () => {
            const result = costs1.add(costs2.asModifier());
            expect(result).to.deep.equal(expected);
        }));

    ([
        [new PrimaryCost({
            _nonConsumed: 4,
            _consumed: 2,
            _isChanneled: false
        }), new Cost(3, 1, false), new PrimaryCost({_nonConsumed: 1, _consumed: 1, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 5,
            _isChanneled: false
        }), new Cost(4, 0, false), new PrimaryCost({_nonConsumed: 0, _consumed: 5, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 1,
            _isChanneled: true
        }), new Cost(0, 1, false), new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: true})],
        [new PrimaryCost({
            _nonConsumed: 3,
            _consumed: 1,
            _isChanneled: false
        }), new Cost(0, 2, true), new PrimaryCost({_nonConsumed: 2, _consumed: 0, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 0,
            _consumed: 0,
            _isChanneled: false
        }), new Cost(3, 0, true), new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false})],
        [new PrimaryCost({
            _nonConsumed: 5,
            _consumed: 3,
            _isChanneled: false
        }), new Cost(0, 3, true), new PrimaryCost({_nonConsumed: 5, _consumed: 0, _isChanneled: false})],
    ] as const).forEach(
        ([costs1, costs2, expected]) => it(`substracting ${costs2} from ${costs1} yields ${expected}`, () => {
            const result = costs1.subtract(costs2.asModifier());
            expect(result).to.deep.equal(expected);
        }));

    it("should convert to a modifier", () => {
        const costs = new PrimaryCost({_nonConsumed: 3, _consumed: 1, _isChanneled: false});
        const result = costs.toModifier();
        expect(result._exhausted).to.equal(3);
        expect(result._consumed).to.equal(1);
        expect(result._channeled).to.equal(3);
        expect(result._channeledConsumed).to.equal(1);
    })


    it("should hold up for a real world example", () => {
        const highBenediction = parseCostString("12V3").asPrimaryCost();
        const thriftySorcerer = parseCostString("-2V1").asModifier();
        const rupturedEnvironment = parseCostString("K2V2").asModifier();
        const outstandingSuccess = new Cost(0, -1, false, true).asModifier();
        const consumptionReduction = new Cost(0, -1, false, true).asModifier();
        const exhaustionReduction = new Cost(-1, 0, false, true).asModifier();
        const enhancement = parseCostString("2EG/+3V1").asModifier();

        const result = highBenediction
            .add(thriftySorcerer)
            .add(rupturedEnvironment)
            .add(outstandingSuccess)
            .add(consumptionReduction)
            .add(exhaustionReduction)
            .add(enhancement);
        expect(result.render()).to.equal("12V3");
    });
});

describe("BaseCost object rendering", () => {
    ([
        [new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: false}), "0"],
        [new PrimaryCost({_nonConsumed: 0, _consumed: 0, _isChanneled: true}), "0"],
        [new PrimaryCost({_nonConsumed: 0, _consumed: 3, _isChanneled: false}), "3V3"],
        [new PrimaryCost({_nonConsumed: 4, _consumed: 3, _isChanneled: true}), "K7V3"],
        [new PrimaryCost({_nonConsumed: 4, _consumed: 3, _isChanneled: false}), "7V3"],
        [new PrimaryCost({_nonConsumed: 4, _consumed: 0, _isChanneled: true}), "K4"],
    ] as const).forEach(
        ([costs, expected]) => it(`should render ${costs} as ${expected}`, () => {
            const result = costs.render();
            expect(result).to.equal(expected);
        }));
});

describe("Strict cost objects", () => {
    it("should not subtract channeled costs from exhausted costs", () => {
        const costs = new PrimaryCost({_nonConsumed: 2, _consumed: 1, _isChanneled: false});
        const result = costs.add(new Cost(1, 1, true, true).asModifier());
        expect(result).to.deep.equal(costs);
    });

    it("should add channeled costs to channeled costs", () => {
        const costs = new PrimaryCost({_nonConsumed: 2, _consumed: 1, _isChanneled: true});
        const result = costs.add(new Cost(1, 1, true, true).asModifier());
        expect(result).to.deep.equal(new PrimaryCost({_nonConsumed: 3, _consumed: 2, _isChanneled: true}));
    });

    it("should subtract exhausted costs from exhausted costs", () => {
        const costs = new PrimaryCost({_nonConsumed: 2, _consumed: 1, _isChanneled: false});
        const result = costs.subtract(new Cost(1, 1, false, true).asModifier());
        expect(result).to.deep.equal(new PrimaryCost({_nonConsumed: 1, _consumed: 0, _isChanneled: false}));
    });

    it("should not convert non-channeled costs to exhausted costs", () => {
        const costs = new PrimaryCost({_nonConsumed: 2, _consumed: 1, _isChanneled: false});
        const modifier = costs.toModifier(true);
        expect(modifier._exhausted).to.equal(2)
        expect(modifier._consumed).to.equal(1)
        expect(modifier._channeled).to.equal(0)
        expect(modifier._channeledConsumed).to.equal(0)
    });

    it("should not convert channeled costs to exhausted costs", () => {
        const costs = new PrimaryCost({_nonConsumed: 2, _consumed: 1, _isChanneled: true});
        const modifier = costs.toModifier(true);
        expect(modifier._exhausted).to.equal(0)
        expect(modifier._consumed).to.equal(0)
        expect(modifier._channeled).to.equal(2)
        expect(modifier._channeledConsumed).to.equal(1)
    });
});

describe("Fractional cost modifiers", () => {

    [5.7,7.5,3.3,101.0001].forEach(number => {
        it(`should round exclusively exhausted costs of ${number}`, () => {
            const base = new Cost(0,0,false,true).asPrimaryCost();
            const modifier = new Cost(number, 0, false, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(`${Math.round(number)}`);
        });
        it(`should round exclusively channeled costs of ${number}`, () => {
            const base = new Cost(0,0,true,true).asPrimaryCost();
            const modifier = new Cost(number, 0, true, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(`K${Math.round(number)}`);
        });

        it(`should round exclusively consumed costs of ${number}`, () => {
            const base = new Cost(0,0,false,true).asPrimaryCost();
            const modifier = new Cost(0, number, false, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(`${Math.round(number)}V${Math.round(number)}`);
        });
        it(`should round exclusively channeled consumed costs of ${number}`, () => {
            const base = new Cost(0,0,true,true).asPrimaryCost();
            const modifier = new Cost(0, number, true, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(`K${Math.round(number)}V${Math.round(number)}`);
        });

        it("round function should deliver equivalent results", () => {
            const base = new Cost(0,0,true,true).asPrimaryCost();
            const modifier = new Cost(0, number, true, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(result.round().render());
        });
    });
    [[5.7,7.5],[3.3,101.0001]].forEach(([number1, number2]) => {

        it(`should round mixed costs of ${number1} ${number2}`, () => {
            const base = new Cost(0,0,false,true).asPrimaryCost();
            const modifier = new Cost(number1, number2, false, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(`${Math.round(number1)+Math.round(number2)}V${Math.round(number2)}`);
        });

        it(`should round channeled mixed costs of ${number1} ${number2}`, () => {
            const base = new Cost(0,0,true,true).asPrimaryCost();
            const modifier = new Cost(number1, number2, true, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(`K${Math.round(number1)+Math.round(number2)}V${Math.round(number2)}`);
        });

        it("round function should deliver equivalent results", () => {
            const base = new Cost(0,0,true,true).asPrimaryCost();
            const modifier = new Cost(number1, number2, true, true).asModifier();
            const result = base.add(modifier);

            expect(result.render()).to.equal(result.round().render());
        });
    });

});
