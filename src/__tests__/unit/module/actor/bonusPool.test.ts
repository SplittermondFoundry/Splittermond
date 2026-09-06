import { expect } from "chai";
import { describe, it } from "mocha";
import {
    allocateFromBonusPool,
    evaluateBonusPool,
    isEffectBonusExhausted,
    type BonusGrant,
} from "module/actor/bonusPool";

function grant(sourceId: string, value: number): BonusGrant {
    return { sourceId, value };
}

describe("evaluateBonusPool", () => {
    it("grants the full value for a fresh source without entry", () => {
        const state = evaluateBonusPool([], [grant("effect-a", 5)]);
        expect(state).to.deep.equal({ granted: 5, remaining: 5, used: 0 });
    });

    it("clamps an existing entry when the grant shrinks", () => {
        const state = evaluateBonusPool([{ sourceId: "effect-a", value: 5 }], [grant("effect-a", 3)]);
        expect(state).to.deep.equal({ granted: 3, remaining: 3, used: 0 });
    });

    it("drops vanished sources", () => {
        const state = evaluateBonusPool(
            [
                { sourceId: "effect-a", value: 5 },
                { sourceId: "effect-gone", value: 4 },
            ],
            [grant("effect-a", 5)]
        );
        expect(state).to.deep.equal({ granted: 5, remaining: 5, used: 0 });
    });

    it("sums per source", () => {
        const state = evaluateBonusPool(
            [{ sourceId: "effect-a", value: 2 }],
            [grant("effect-a", 5), grant("effect-b", 4)]
        );
        expect(state).to.deep.equal({ granted: 9, remaining: 6, used: 3 });
    });

    it("floors negative grants at zero", () => {
        const state = evaluateBonusPool([{ sourceId: "effect-a", value: 5 }], [grant("effect-a", -2)]);
        expect(state).to.deep.equal({ granted: 0, remaining: 0, used: 0 });
    });
});

describe("allocateFromBonusPool", () => {
    it("fully absorbs a cost from a fresh grant", () => {
        const result = allocateFromBonusPool([], [grant("effect-a", 5)], 3);
        expect(result.absorbed).to.equal(3);
        expect(result.entries).to.deep.equal([{ sourceId: "effect-a", value: 2 }]);
    });

    it("falls back to the counter for amounts beyond the pool", () => {
        const result = allocateFromBonusPool([{ sourceId: "effect-a", value: 2 }], [grant("effect-a", 5)], 5);
        expect(result.absorbed).to.equal(2);
        expect(result.entries).to.deep.equal([{ sourceId: "effect-a", value: 0 }]);
    });

    it("clamps the withdrawal of an entry to its current grant", () => {
        const result = allocateFromBonusPool([{ sourceId: "effect-a", value: 5 }], [grant("effect-a", 3)], 5);
        expect(result.absorbed).to.equal(3);
        expect(result.entries).to.deep.equal([{ sourceId: "effect-a", value: 2 }]);
    });

    it("spends across entries oldest first", () => {
        const result = allocateFromBonusPool(
            [
                { sourceId: "effect-a", value: 2 },
                { sourceId: "effect-b", value: 5 },
            ],
            [grant("effect-a", 5), grant("effect-b", 5)],
            6
        );
        expect(result.absorbed).to.equal(6);
        expect(result.entries).to.deep.equal([
            { sourceId: "effect-a", value: 0 },
            { sourceId: "effect-b", value: 1 },
        ]);
    });

    it("allocates nothing for a zero cost but still materializes fresh grants", () => {
        const result = allocateFromBonusPool([], [grant("effect-a", 5)], 0);
        expect(result.absorbed).to.equal(0);
        expect(result.entries).to.deep.equal([{ sourceId: "effect-a", value: 5 }]);
    });

    it("does not top up existing entries on a repeated call", () => {
        const grants = [grant("effect-a", 5)];
        const first = allocateFromBonusPool([], grants, 2);
        const second = allocateFromBonusPool(first.entries, grants, 0);
        expect(second.entries).to.deep.equal([{ sourceId: "effect-a", value: 3 }]);
        expect(second.absorbed).to.equal(0);
    });

    it("continues spending reduced entries instead of re-materializing them", () => {
        const grants = [grant("effect-a", 5)];
        const first = allocateFromBonusPool([], grants, 2);
        const second = allocateFromBonusPool(first.entries, grants, 2);
        expect(second.absorbed).to.equal(2);
        expect(second.entries).to.deep.equal([{ sourceId: "effect-a", value: 1 }]);
    });

    it("leaves entries of vanished sources untouched", () => {
        const result = allocateFromBonusPool([{ sourceId: "effect-gone", value: 4 }], [grant("effect-a", 5)], 3);
        expect(result.absorbed).to.equal(3);
        expect(result.entries).to.deep.equal([
            { sourceId: "effect-gone", value: 4 },
            { sourceId: "effect-a", value: 2 },
        ]);
    });

    it("does not mutate its inputs", () => {
        const entries = [{ sourceId: "effect-a", value: 5 }];
        allocateFromBonusPool(entries, [grant("effect-a", 5)], 3);
        expect(entries).to.deep.equal([{ sourceId: "effect-a", value: 5 }]);
    });
});

describe("isEffectBonusExhausted", () => {
    it("is false for an effect that grants nothing", () => {
        expect(isEffectBonusExhausted("effect-a", [{ entries: [], grants: [grant("effect-b", 5)] }])).to.be.false;
    });

    it("is false for an unspent grant without a persisted entry", () => {
        expect(isEffectBonusExhausted("effect-a", [{ entries: [], grants: [grant("effect-a", 5)] }])).to.be.false;
    });

    it("is false while the entry still holds points", () => {
        expect(
            isEffectBonusExhausted("effect-a", [
                { entries: [{ sourceId: "effect-a", value: 2 }], grants: [grant("effect-a", 5)] },
            ])
        ).to.be.false;
    });

    it("is true when the entry has reached zero", () => {
        expect(
            isEffectBonusExhausted("effect-a", [
                { entries: [{ sourceId: "effect-a", value: 0 }], grants: [grant("effect-a", 5)] },
            ])
        ).to.be.true;
    });

    it("is false when one of several pools still holds points", () => {
        const result = isEffectBonusExhausted("effect-a", [
            { entries: [{ sourceId: "effect-a", value: 0 }], grants: [grant("effect-a", 5)] },
            { entries: [{ sourceId: "effect-a", value: 1 }], grants: [grant("effect-a", 3)] },
        ]);
        expect(result).to.be.false;
    });

    it("is false when one of several pools is still unspent", () => {
        const result = isEffectBonusExhausted("effect-a", [
            { entries: [{ sourceId: "effect-a", value: 0 }], grants: [grant("effect-a", 5)] },
            { entries: [], grants: [grant("effect-a", 3)] },
        ]);
        expect(result).to.be.false;
    });

    it("is true when every granting pool has reached zero", () => {
        const result = isEffectBonusExhausted("effect-a", [
            { entries: [{ sourceId: "effect-a", value: 0 }], grants: [grant("effect-a", 5)] },
            {
                entries: [
                    { sourceId: "effect-b", value: 4 },
                    { sourceId: "effect-a", value: 0 },
                ],
                grants: [grant("effect-a", 3)],
            },
        ]);
        expect(result).to.be.true;
    });

    it("ignores a zero tombstone of a vanished source when the effect no longer grants", () => {
        expect(
            isEffectBonusExhausted("effect-a", [
                { entries: [{ sourceId: "effect-a", value: 0 }], grants: [grant("effect-b", 5)] },
            ])
        ).to.be.false;
    });
});
