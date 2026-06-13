import { describe, it } from "mocha";
import { expect } from "chai";
import { CostModifier } from "module/activeEffect";
import { CostModifier as Cost } from "module/util/costs/Cost";
import { evaluate, of } from "module/modifiers/expressions/cost";

describe("CostModifier", () => {
    it("should initialize with correct values", () => {
        const cost = new Cost({ _channeled: 2, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 });
        const mod = new CostModifier(
            CostModifier.init("focus.reduction", of(cost), "fireMagic", { type: "magic" }),
            {}
        );

        expect(mod.label).to.equal("focus.reduction");
        expect(mod.skill).to.equal("fireMagic");
        expect(mod.effectType).to.equal("costModifier");
        expect(evaluate(mod.value).toObject()).to.deep.equal(cost.toObject());
    });

    it("should default to null skill and empty attributes", () => {
        const cost = new Cost({ _channeled: 1, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 });
        const mod = new CostModifier(CostModifier.init("focus.reduction", of(cost)), {});

        expect(mod.skill).to.be.null;
        expect(mod.attributes).to.deep.equal({});
    });

    it("should preserve attributes", () => {
        const cost = new Cost({ _channeled: 0, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 });
        const attributes = { skill: "fireMagic", type: "innate" };
        const mod = new CostModifier(CostModifier.init("focus.reduction", of(cost), "fireMagic", attributes), {});

        expect(mod.attributes).to.deep.equal(attributes);
    });
});
