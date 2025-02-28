import "../../../foundryMocks.js"
import {describe, it} from "mocha";
import {expect} from "chai";
import {Cost} from "module/util/costs/Cost.js";

describe("Cost object edge cases", () => {
    it("should return zero costs when adding two zero cost objects", () => {
        const costs = new Cost(0, 0, false).asModifier();
        const result = costs.add(new Cost(0, 0, false).asModifier());
        expect(result).to.deep.equal(new Cost(0, 0, false).asModifier());
    });

    it("should return zero costs when subtracting two zero cost objects", () => {
        const costs = new Cost(0, 0, false).asModifier();
        const result = costs.subtract(new Cost(0, 0, false).asModifier());
        expect(result).to.deep.equal(new Cost(0, 0, false).asModifier());
    });

    it("should allow negative starting input", () => {
        const costs = new Cost(-1, -1, false);
        expect(costs.toString()).to.equal("-2V1");
    });

    it("should produce negative costs", () => {
        const costs = new Cost(1, 0, false).asModifier();
        const result = costs.subtract(new Cost(2, 0, false).asModifier());
        expect(result).to.deep.equal(new Cost(-1, 0, false).asModifier());
    });

    it("should ignore the channeled property for the purpose of addition", () => {
        const costs = new Cost(1, 0, true).asModifier();
        const result = costs.add(new Cost(2, 0, false).asModifier());
        expect(result).to.deep.equal(new Cost(3, 0, true).asModifier());
    });

    it("should ignore garbage input", () => {
        const costs = new Cost("a" as any, true as any, "kanalisiert" as any);
        expect(costs).to.deep.equal(new Cost(0, 0, true));
    });
});

describe("Cost object operation", () => {
    [
        [new Cost(3, 1, false), new Cost(4, 2, false), new Cost(7, 3, false)],
        [new Cost(0, 5, false), new Cost(4, 0, false), new Cost(4, 5, false)],
        [new Cost(0, 1, true), new Cost(0, 1, false), new Cost(0, 2, true)],
        [new Cost(0, 1, false), new Cost(0, 1, true), new Cost(0, 2, false)],
        [new Cost(3, 1, false), new Cost(0, 0, true), new Cost(3, 1, false)],
        [new Cost(0, 0, false), new Cost(3, 0, true), new Cost(3, 0, false)],
        [new Cost(0, 3, false), new Cost(0, 3, true), new Cost(0, 6, false)],
        [new Cost(100, 3000, false), new Cost(0, 1, true), new Cost(100, 3001, false)],
    ].forEach(
        ([costs1, costs2, expected]) => {
            const actual1 = costs1.asModifier();
            const actual2 = costs2.asModifier();
            it(`should add ${costs1} and ${costs2} to ${expected}`, () => {
                    const result = actual1.add(actual2);
                    expect(result).to.deep.equal(expected.asModifier());
                }
            );

            it(`negative should add ${costs1} and ${costs2} to ${expected}`, () => {
                const results = actual1.negate().add(actual2.negate());
                expect(results).to.deep.equal(expected.asModifier().negate());
            });
        });

    ([
        [new Cost(4, 2, false), new Cost(3, 1, false), {
            _exhausted: 1,
            _consumed: 1,
            _channeled: 1,
            _channeledConsumed: 1
        }],
        [new Cost(0, 5, false), new Cost(4, 0, false), {
            _exhausted: -4,
            _consumed: 5,
            _channeled: -4,
            _channeledConsumed: 5
        }],
        [new Cost(0, 1, true), new Cost(0, 1, false), {
            _exhausted: 0,
            _consumed: 0,
            _channeled: 0,
            _channeledConsumed: 0
        }],
        [new Cost(3, 1, false), new Cost(0, 2, true), {
            _exhausted: 3,
            _consumed: -1,
            _channeled: 3,
            _channeledConsumed: -1
        }],
        [new Cost(0, 0, false), new Cost(3, 0, true), {
            _exhausted: -3,
            _consumed: 0,
            _channeled: -3,
            _channeledConsumed: 0
        }],
        [new Cost(5, 3, false), new Cost(0, 3, true), {
            _exhausted: 5,
            _consumed: 0,
            _channeled: 5,
            _channeledConsumed: 0
        }],
        [new Cost(-5, -3, false), new Cost(0, -3, true), {
            _exhausted: -5,
            _consumed: 0,
            _channeled: -5,
            _channeledConsumed: 0
        }],
        [new Cost(-3, -1, false), new Cost(0, -2, true), {
            _exhausted: -3,
            _consumed: 1,
            _channeled: -3,
            _channeledConsumed: 1
        }],
        [new Cost(5, 3, false), new Cost(0, -3, true), {
            _exhausted: 5,
            _consumed: 6,
            _channeled: 5,
            _channeledConsumed: 6
        }],
    ]as const).forEach(
        ([costs1, costs2, expected]) => {
            const actual1 = costs1.asModifier();
            const actual2 = costs2.asModifier();
            it(`subtracting ${costs2} from ${costs1} yields composite`, () => {
                const result = actual1.subtract(actual2);
                expect(result).to.deep.equal(expected);
            });
        });
    ([
        [new Cost(4, 2, false), {_exhausted: -4, _consumed: -2, _channeled: -4, _channeledConsumed: -2}],
        [new Cost(0, 5, true), {_exhausted: -0, _consumed: -5, _channeled: -0, _channeledConsumed: -5}],
    ]as const).forEach(
        ([costs, expected]) => it(`should negate ${costs} correctly`, () => {
            const result = costs.asModifier().negate();
            expect(result).to.deep.equal(expected);
        }));

    ([
        [new Cost(1, 0, false), 1, new Cost(1, 0, false)],
        [new Cost(2, 0, false), 2, new Cost(4, 0, false)],
        [new Cost(0, 3, true), 4, new Cost(0, 12, false)],
        [new Cost(1, 1, true), -2, new Cost(-2, -2, false)]
    ]as const).forEach(
        ([costs, multiplier, expected]) => {
            it(`should multiply ${costs} correctly`, () => {
                expect(costs.asModifier().multiply(multiplier)).to.deep.equal(expected.asModifier());
            });
        });
});

describe("Cost object rendering", () => {
    ([
        [new Cost(0, 0, false), "0"],
        [new Cost(0, 0, true), "0"],
        [new Cost(0, 3, false), "3V3"],
        [new Cost(4, 3, true), "K7V3"],
        [new Cost(4, 3, false), "7V3"],
        [new Cost(4, 0, true), "K4"],
        [new Cost(-3, -4, false), "-7V4"],
        [new Cost(-4, -4, true), "-K8V4"],
        [new Cost(-4, 0, true), "-K4"],
        [new Cost(-4, 0, false), "-4"]
    ]as const).forEach(
        ([costs, expected]) => it(`should stringify ${costs} as ${expected}`, () => {
            const result = costs.toString();
            expect(result).to.equal(expected);
        }));
});

describe("Strict cost objects", () => {
    it("should subtract channeled costs from exhausted cost", () => {
        const costs = new Cost(2, 1, false, true).asModifier();
        const result = costs.subtract(new Cost(1, 1, true).asModifier());
        expect(result).to.deep.equal({_exhausted: 1, _channeled: -1, _consumed: 0, _channeledConsumed: -1});
    });

    it("should  add exhausted costs to channeled costs", () => {
        const costs = new Cost(2, 1, false, true).asModifier();
        const result = costs.add(new Cost(1, 1, true).asModifier());
        expect(result).to.deep.equal({_exhausted: 3, _channeled: 1, _consumed: 2, _channeledConsumed: 1});
    });

    it("should respect strictness of both operands", () => {
        const costs = new Cost(2, 1, false, false).asModifier();
        const result = costs.add(new Cost(1, 1, true, true).asModifier());
        expect(result).to.deep.equal({_exhausted: 2, _channeled: 3, _consumed: 1, _channeledConsumed: 2});
    });

    it("should add channeled costs to channeled costs", () => {
        const costs = new Cost(2, 1, true, true).asModifier();
        const result = costs.add(new Cost(1, 1, true, true).asModifier());
        expect(result).to.deep.equal(new Cost(3, 2, true, true).asModifier());
    });

    it("should subtract exhausted costs from exhausted costs", () => {
        const costs = new Cost(2, 1, false, true).asModifier();
        const result = costs.subtract(new Cost(1, 1, false, true).asModifier());
        expect(result).to.deep.equal(new Cost(1, 0, false, true).asModifier());
    });
});

describe("Length of cost vectors", () => {
    it("length of a non-strict cost is not the unit vector", () => {
        const costs = new Cost(1, 0, false, false).asModifier();
        expect(costs.length).to.be.closeTo(Math.sqrt(2),0.000001); //sqrt(2), because we have a 1-1 vector
    });

    it("should return the length of a unit cost vector", () => {
        const costs = new Cost(1, 0, true, true).asModifier();
        expect(costs.length).to.be.closeTo(1,0.000001);
    });

    it("should return the length of a cost vector", () => {
        const costs = new Cost(3, 4, true, false).asModifier();
        expect(costs.length).to.be.closeTo(7.07,0.01);
    });

    it("should return the length of a cost vector with negative values", () => {
        const costs = new Cost(-3, -4, true, false).asModifier();
        expect(costs.length).to.be.closeTo(7.07,0.01);
    });

    it("should return the length of a cost vector with zero values", () => {
        const costs = new Cost(0, 0, true, false).asModifier();
        expect(costs.length).to.equal(0);
    });

})
