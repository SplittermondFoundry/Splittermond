import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { Modifier, InverseModifier, MultiplicativeModifier, CostModifier, SplittermondActiveEffect } from "module/activeEffect";
import { evaluate, of, plus, times } from "module/modifiers/expressions/scalar";
import { of as costOf, evaluate as costEvaluate } from "module/modifiers/expressions/cost";
import { CostModifier as Cost } from "module/util/costs/Cost";
import { withActor } from "./fixtures";

export function activeEffectDataModelTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("ActiveEffect DataModel serialization via Foundry persistence", () => {
        describe("ModifierDataModel", () => {
            it("should persist and restore a simple expression through an ActiveEffect", withActor(async (actor) => {
                const initData = Modifier.init("test.path", of(5), { name: "Test", type: "innate" });
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
                const initData = Modifier.init("complex.path", expr, { name: "Complex", type: "magic" });
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Complex Effect", type: "modifier", system: initData },
                ]);

                const restored = actor.effects.get(effect.id);
                expect(evaluate(restored.system.value)).to.equal(11);
            }));

            it("should survive actor re-preparation", withActor(async (actor) => {
                const initData = Modifier.init("prep.path", of(7), { name: "Prep", type: "innate" });
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
                const initData = InverseModifier.init("inv.path", of(-3), { name: "Inverse", type: "innate" });
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
                const initData = MultiplicativeModifier.init("mult.path", of(3), {
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
                const costMod = new Cost({ _channeled: 3, _channeledConsumed: 0, _exhausted: 2, _consumed: 0 });
                const initData = CostModifier.init("focus.reduction", costOf(costMod), "fireMagic");
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

        describe("SplittermondActiveEffect suppression", () => {
            it("should suppress transferred weapon effects when unequipped", withActor(async (actor) => {
                const [weapon] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "weapon",
                        name: "Training Sword",
                        system: {
                            equipped: false,
                        },
                    },
                ]);
                await weapon.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "skills.acrobatics +2",
                        type: "modifier",
                        transfer: true,
                        disabled: false,
                        system: Modifier.init("actor.skills", of(2), { name: "Training Sword", type: "innate",skill:"acrobatics" }),
                    },
                ]);

                actor.prepareData();
                const whileUnequipped = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                expect(whileUnequipped).to.have.length(0);

                await weapon.update({ system: { equipped: true } });
                actor.prepareData();
                const whileEquipped = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                expect(whileEquipped).to.have.length(1);
                expect(evaluate(whileEquipped[0].value)).to.equal(2);
            }));

            it("should suppress transferred spell effects when inactive", withActor(async (actor) => {
                const [spellEffectItem] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "spelleffect",
                        name: "Arcane Focus",
                        system: {
                            active: false,
                        },
                    },
                ]);
                await spellEffectItem.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "skills.mysticism +1",
                        type: "modifier",
                        transfer: true,
                        disabled: false,
                        system: Modifier.init("skills.mysticism", of(1), { name: "Arcane Focus", type: "magic" }),
                    },
                ]);

                actor.prepareData();
                const whileInactive = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                expect(whileInactive).to.have.length(0);

                await spellEffectItem.update({ system: { active: true } });
                actor.prepareData();
                const whileActive = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                expect(whileActive).to.have.length(1);
                expect(evaluate(whileActive[0].value)).to.equal(1);
            }));
        });
    });
}
