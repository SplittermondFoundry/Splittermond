import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { ModifierDataModel } from "module/activeEffect/dataModel/ModifierDataModel";
import { InverseModifierDataModel } from "module/activeEffect/dataModel/InverseModifierDataModel";
import { MultiplicativeModifierDataModel } from "module/activeEffect/dataModel/MultiplicativeModifierDataModel";
import { CostModifierDataModel } from "module/activeEffect/dataModel/CostModifierDataModel";
import { evaluate, of, plus, times } from "module/modifiers/expressions/scalar";
import { of as costOf, evaluate as costEvaluate } from "module/modifiers/expressions/cost";
import { CostModifier } from "module/util/costs/Cost";
import { withActor } from "./fixtures";

export function activeEffectDataModelTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("ActiveEffect DataModel serialization via Foundry persistence", () => {
        describe("ModifierDataModel", () => {
            it("should persist and restore a simple expression through an ActiveEffect", withActor(async (actor) => {
                const initData = ModifierDataModel.init("test.path", of(5), { name: "Test", type: "innate" });
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Test Effect", type: "modifier", system: initData },
                ]);

                const restored = actor.effects.get(effect.id);
                expect(restored).to.exist;
                expect(evaluate(restored.system.value)).to.equal(5);
                expect(restored.system.groupId).to.equal("test.path");
                expect(restored.system.attributes.name).to.equal("Test");
            }));

            it("should persist and restore a complex expression", withActor(async (actor) => {
                const expr = plus(of(3), times(of(2), of(4)));
                const initData = ModifierDataModel.init("complex.path", expr, { name: "Complex", type: "magic" });
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Complex Effect", type: "modifier", system: initData },
                ]);

                const restored = actor.effects.get(effect.id);
                expect(evaluate(restored.system.value)).to.equal(11);
            }));

            it("should survive actor re-preparation", withActor(async (actor) => {
                const initData = ModifierDataModel.init("prep.path", of(7), { name: "Prep", type: "innate" });
                await actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Prep Effect", type: "modifier", system: initData },
                ]);

                actor.prepareData();

                const effect = actor.effects.contents[0];
                expect(evaluate(effect.system.value)).to.equal(7);
            }));
        });

        describe("InverseModifierDataModel", () => {
            it("should persist and restore through an ActiveEffect", withActor(async (actor) => {
                const initData = InverseModifierDataModel.init("inv.path", of(-3), { name: "Inverse", type: "innate" });
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Inverse Effect", type: "inverseModifier", system: initData },
                ]);

                const restored = actor.effects.get(effect.id);
                expect(evaluate(restored.system.value)).to.equal(-3);
                expect(restored.system.isBonus).to.be.true;
            }));
        });

        describe("MultiplicativeModifierDataModel", () => {
            it("should persist and restore through an ActiveEffect", withActor(async (actor) => {
                const initData = MultiplicativeModifierDataModel.init("mult.path", of(3), {
                    name: "Mult",
                    type: "innate",
                });
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Mult Effect", type: "multiplicativeModifier", system: initData },
                ]);

                const restored = actor.effects.get(effect.id);
                expect(evaluate(restored.system.value)).to.equal(3);
                expect(restored.system.isBonus).to.be.true;
            }));
        });

        describe("CostModifierDataModel", () => {
            it("should persist and restore through an ActiveEffect", withActor(async (actor) => {
                const costMod = new CostModifier({ _channeled: 3, _channeledConsumed: 0, _exhausted: 2, _consumed: 0 });
                const initData = CostModifierDataModel.init("focus.reduction", costOf(costMod), "fireMagic");
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Cost Effect", type: "costModifier", system: initData },
                ]);

                const restored = actor.effects.get(effect.id);
                const result = costEvaluate(restored.system.value);
                expect(result.toObject()).to.deep.equal(costMod.toObject());
                expect(restored.system.label).to.equal("focus.reduction");
                expect(restored.system.skill).to.equal("fireMagic");
            }));
        });
    });
}
