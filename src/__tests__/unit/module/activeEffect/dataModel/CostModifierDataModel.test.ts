import { describe, it } from "mocha";
import { expect } from "chai";
import { CostModifierDataModel as CostModifier } from "module/activeEffect/dataModel/CostModifierDataModel";
import { CostModifier as Cost } from "module/util/costs/Cost";
import { evaluate, of, ref } from "module/modifiers/expressions/cost";
import type { ActorProvider } from "module/modifiers/expressions/ActorProvider";

describe("CostModifier", () => {
    it("should initialize with correct values", async () => {
        const cost = new Cost({ _channeled: 2, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 });
        const mod = new CostModifier(
            CostModifier.init("focus.reduction", of(cost), "fireMagic", { type: "magic" }),
            {}
        );

        expect(mod.label).to.equal("focus.reduction");
        expect(mod.skill).to.equal("fireMagic");
        expect((await evaluate(mod.value)).toObject()).to.deep.equal(cost.toObject());
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

    it("should use the injected actorProvider when resolving a reference value", async () => {
        const referenceExpr = ref("attributes.intuition.value", () => null, "attributes.intuition.value");
        let providerCalls = 0;
        const provider = (() => {
            providerCalls += 1;
            return null;
        }) as ActorProvider;
        const mod = new CostModifier(
            CostModifier.init("focus.reduction", referenceExpr, "fireMagic", { type: "magic" }),
            { actorProvider: provider }
        );

        expect(mod.value).to.not.equal(mod.value);
        await evaluate(mod.value);
        expect(providerCalls).to.be.greaterThan(0);
    });

    it("should fall back to the host actor provider when none is injected", async () => {
        const referenceExpr = ref("attributes.intuition.value", () => null, "attributes.intuition.value");
        const mod = new CostModifier(
            CostModifier.init("focus.reduction", referenceExpr, "fireMagic", { type: "magic" }),
            {}
        );

        expect(mod.value).to.not.equal(mod.value);
        const result = await evaluate(mod.value);
        expect(result.toObject()).to.deep.equal(Cost.zero.toObject());
    });
});
