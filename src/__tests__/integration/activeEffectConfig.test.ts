import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import {
    CostModifier,
    InverseModifier,
    Modifier,
    MultiplicativeModifier,
    SplittermondActiveEffect,
} from "module/activeEffect";
import { foundryApi } from "module/api/foundryApi";
import { SplittermondActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { evaluate, of, plus, ref, times } from "module/modifiers/expressions/scalar";
import { evaluate as costEvaluate, of as costOf } from "module/modifiers/expressions/cost";
import { CostModifier as Cost } from "module/util/costs/Cost";
import { withActiveEffect, withActor } from "./fixtures";
import { passesEventually } from "../util";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import type { ModifierDataModel } from "module/activeEffect/dataModel/ModifierDataModel";
import type { InverseModifierDataModel } from "module/activeEffect/dataModel/InverseModifierDataModel";
import type { CostModifierDataModel } from "module/activeEffect/dataModel/CostModifierDataModel";

declare const Item: any;

async function enterInSheet(sheet: SplittermondActiveEffectConfig, inputName: string, value: string) {
    await sheet.render(true);
    const input = sheet.element.querySelector(`input[name='${inputName}']`) as HTMLInputElement | null;
    input!.value = value;
    input!.dispatchEvent(new Event("input", { bubbles: true }));
    input!.dispatchEvent(new Event("change", { bubbles: true }));
    const submitButton = sheet.element.querySelector(
        "button[type='submit'], button[data-action='submit']"
    ) as HTMLButtonElement | null;
    if (submitButton) {
        submitButton.dispatchEvent(new PointerEvent("click", { bubbles: true }));
        return;
    }

    const form = sheet.element.querySelector("form") as HTMLFormElement | null;
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

export function activeEffectTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("SplittermondActiveEffectConfig", () => {
        it(
            "should update scalar modifier from raw input",
            withActiveEffect(
                {
                    name: "Start",
                    type: "modifier",
                    system: Modifier.init("skills", of(1), { name: "Test", type: "innate", skill: "acrobatics" }),
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await enterInSheet(sheet, "splittermondRawInput", "skills skill=acrobatics +2");

                    await passesEventually(
                        () => {
                            expect(effect.system.path).to.equal("actor.skills");
                            expect(effect.getFlag("splittermond", "rawInput")).to.equal("skills skill=acrobatics +2");
                        },
                        1500,
                        100
                    );
                }
            )
        );

        it(
            "should update cost modifier formula and skill",
            withActiveEffect(
                {
                    name: "Kosten",
                    type: "costModifier",
                    system: {
                        label: "kosten -1",
                        serializedValue: {
                            type: "amount",
                            amount: {
                                _channeled: 0,
                                _channeledConsumed: 0,
                                _exhausted: 1,
                                _consumed: 0,
                            },
                        },
                        skill: null,
                        attributes: {},
                    },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await sheet.render(true);
                    const formulaInput = sheet.element.querySelector(
                        "input[name='splittermondCostFormula']"
                    ) as HTMLInputElement;
                    const skillInput = sheet.element.querySelector(
                        "input[name='splittermondCostSkill']"
                    ) as HTMLInputElement;

                    formulaInput.value = "focus.addition 2";
                    skillInput.value = "fireMagic";
                    formulaInput.dispatchEvent(new Event("input", { bubbles: true }));
                    formulaInput.dispatchEvent(new Event("change", { bubbles: true }));
                    skillInput.dispatchEvent(new Event("input", { bubbles: true }));
                    skillInput.dispatchEvent(new Event("change", { bubbles: true }));
                    const submitButton = sheet.element.querySelector(
                        "button[type='submit'], button[data-action='submit']"
                    ) as HTMLButtonElement | null;
                    if (submitButton) {
                        submitButton.dispatchEvent(new PointerEvent("click", { bubbles: true }));
                    } else {
                        const form = sheet.element.querySelector("form") as HTMLFormElement | null;
                        form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                    }

                    await passesEventually(
                        () => {
                            expect(effect.system.label, "label value").to.equal("focus.reduction");
                            expect(effect.system.skill, "skill value").to.equal("fireMagic");
                            expect(effect.getFlag("splittermond", "rawInput"), "raw Input").to.equal(
                                "focus.addition 2"
                            );
                        },
                        1500,
                        100
                    );
                }
            )
        );

        it(
            "should warn and block scalar effect when entering cost formula",
            withActiveEffect(
                {
                    name: "Start",
                    type: "modifier",
                    system: Modifier.init("skills", of(1), { name: "Test", type: "innate", skill: "acrobatics" }),
                },
                async (effect) => {
                    const sandbox = sinon.createSandbox();
                    try {
                        const warnSpy = sandbox.spy(foundryApi, "warnUser");
                        const sheet = effect.sheet as SplittermondActiveEffectConfig;
                        await enterInSheet(sheet, "splittermondRawInput", "focus.reduction -K1V1");

                        expect(warnSpy.callCount, "UI Warnings emitted").to.equal(1);
                        expect(effect.type).to.equal("modifier");
                        expect(effect.system.path).to.equal("skills");
                    } finally {
                        sandbox.restore();
                    }
                }
            )
        );

        it(
            "should warn and block cost effect when entering scalar modifier",
            withActiveEffect(
                {
                    name: "Kosten",
                    type: "costModifier",
                    system: {
                        label: "kosten -1",
                        serializedValue: {
                            type: "amount",
                            amount: {
                                _channeled: 0,
                                _channeledConsumed: 0,
                                _exhausted: 1,
                                _consumed: 0,
                            },
                        },
                        skill: null,
                        attributes: {},
                    },
                },
                async (effect) => {
                    const sandbox = sinon.createSandbox();
                    try {
                        const warnSpy = sandbox.spy(foundryApi, "warnUser");
                        const sheet = effect.sheet as SplittermondActiveEffectConfig;
                        await sheet.render(true);
                        const formulaInput = sheet.element.querySelector(
                            "input[name='splittermondCostFormula']"
                        ) as HTMLInputElement;
                        formulaInput.value = "skills skill=acrobatics +2";
                        formulaInput.dispatchEvent(new Event("input", { bubbles: true }));
                        formulaInput.dispatchEvent(new Event("change", { bubbles: true }));
                        const submitButton = sheet.element.querySelector(
                            "button[type='submit'], button[data-action='submit']"
                        ) as HTMLButtonElement | null;
                        if (submitButton) {
                            submitButton.dispatchEvent(new PointerEvent("click", { bubbles: true }));
                        } else {
                            const form = sheet.element.querySelector("form") as HTMLFormElement | null;
                            form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                        }

                        expect(warnSpy.callCount, "UI Warnings emitted").to.equal(1);
                        expect(effect.type).to.equal("costModifier");
                        expect(effect.system.label).to.equal("kosten -1");
                    } finally {
                        sandbox.restore();
                    }
                }
            )
        );
    });

    describe("ActiveEffect DataModel serialization via Foundry persistence", () => {
        describe("SplittermondActiveEffect type updates", () => {
            it(
                "should change type via update",
                withActor(async (actor) => {
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Type Change",
                            type: "modifier",
                            system: Modifier.init("skills", of(1), {
                                name: "Type Change",
                                type: "innate",
                                skill: "acrobatics",
                            }),
                        },
                    ]);

                    await effect.update({
                        type: "inverseModifier",
                        system: InverseModifier.init("skills", of(-1), {
                            name: "Type Change",
                            type: "innate",
                            skill: "acrobatics",
                        }),
                    });

                    const updated = actor.effects.get(effect.id) as SplittermondActiveEffect & {
                        system: InverseModifierDataModel;
                    };
                    expect(updated.type).to.equal("inverseModifier");
                    expect(evaluate(updated.system.value)).to.equal(-1);
                })
            );

            it(
                "should change type via updateSource",
                withActor(async (actor) => {
                    const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Type Change Source",
                            type: "modifier",
                            system: Modifier.init("skills", of(1), {
                                name: "Type Change Source",
                                type: "innate",
                                skill: "acrobatics",
                            }),
                        },
                    ]);

                    const effect = created as SplittermondActiveEffect & { system: InverseModifierDataModel };
                    effect.updateSource({
                        type: "inverseModifier",
                        system: {
                            ...InverseModifier.init("skills", of(-2), {
                                name: "Type Change Source",
                                type: "innate",
                                skill: "acrobatics",
                            }),
                            changes: [],
                        },
                    });

                    expect(effect.type).to.equal("inverseModifier");
                    expect(evaluate(effect.system.value)).to.equal(-2);
                })
            );
        });

        describe("ModifierDataModel", () => {
            it(
                "should persist and restore a simple expression through an ActiveEffect",
                withActor(async (actor) => {
                    const initData = Modifier.init("test.path", of(5), { name: "Test", type: "innate" });
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Test Effect", type: "modifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect & {
                        system: ModifierDataModel;
                    };
                    expect(restored).to.exist;
                    expect(evaluate(restored.system.value)).to.equal(5);
                    expect(restored.system.groupId).to.equal("test.path");
                    expect(restored.system.attributes.name).to.equal("Test");
                })
            );

            it(
                "should persist and restore a complex expression",
                withActor(async (actor) => {
                    const expr = plus(of(3), times(of(2), of(4)));
                    const initData = Modifier.init("complex.path", expr, { name: "Complex", type: "magic" });
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Complex Effect", type: "modifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect & {
                        system: ModifierDataModel;
                    };
                    expect(evaluate(restored.system.value)).to.equal(11);
                })
            );

            it(
                "should survive actor re-preparation",
                withActor(async (actor) => {
                    const initData = Modifier.init("prep.path", of(7), { name: "Prep", type: "innate" });
                    await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Prep Effect", type: "modifier", system: initData },
                    ]);

                    actor.prepareData();

                    const effect = actor.effects.contents[0];
                    expect(evaluate(effect.system.value)).to.equal(7);
                })
            );

            it(
                "should persist and restore a reference expression through an ActiveEffect",
                withActor(async (actor) => {
                    actor.updateSource({ system: { attributes: { intuition: { initial: 3 } } } });

                    const expr = ref("attributes.intuition.value", () => null, "attributes.intuition.value");
                    const initData = Modifier.init("empathy", expr, { name: "RefTest", type: "innate" });
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Ref Effect", type: "modifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as any;
                    expect(evaluate(restored.system.value)).to.equal(3);
                })
            );

            it(
                "should apply a reference modifier from an ActiveEffect to a skill",
                withActor(async (actor) => {
                    actor.updateSource({
                        system: {
                            attributes: {
                                constitution: { initial: 2 },
                                intuition: { initial: 2 },
                                mind: { initial: 3 },
                            },
                        },
                    });

                    const expr = ref("attributes.intuition.value", () => null, "attributes.intuition.value");
                    const initData = Modifier.init("empathy", expr, { name: "EmpathyBoost", type: "innate" });
                    await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Empathy Boost", type: "modifier", system: initData },
                    ]);

                    actor.prepareBaseData();
                    await actor.prepareEmbeddedDocuments();
                    actor.prepareDerivedData();

                    expect(actor.skills.empathy.value).to.equal(7);
                })
            );
        });

        describe("InverseModifierDataModel", () => {
            it(
                "should persist and restore through an ActiveEffect",
                withActor(async (actor) => {
                    const initData = InverseModifier.init("inv.path", of(-3), { name: "Inverse", type: "innate" });
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Inverse Effect", type: "inverseModifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect & {
                        system: InverseModifierDataModel;
                    };
                    expect(evaluate(restored.system.value)).to.equal(-3);
                    expect(restored.system.isBonus).to.be.true;
                })
            );
        });

        describe("MultiplicativeModifierDataModel", () => {
            it(
                "should persist and restore through an ActiveEffect",
                withActor(async (actor) => {
                    const initData = MultiplicativeModifier.init("mult.path", of(3), {
                        name: "Mult",
                        type: "innate",
                    });
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Mult Effect", type: "multiplicativeModifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect & {
                        system: InverseModifierDataModel;
                    };
                    expect(evaluate(restored.system.value)).to.equal(3);
                    expect(restored.system.isBonus).to.be.true;
                })
            );
        });

        describe("CostModifierDataModel", () => {
            it(
                "should persist and restore through an ActiveEffect",
                withActor(async (actor) => {
                    const costMod = new Cost({ _channeled: 3, _channeledConsumed: 0, _exhausted: 2, _consumed: 0 });
                    const initData = CostModifier.init("focus.reduction", costOf(costMod), "fireMagic");
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Cost Effect", type: "costModifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect & {
                        system: CostModifierDataModel;
                    };
                    const result = costEvaluate(restored.system.value);
                    expect(result.toObject()).to.deep.equal(costMod.toObject());
                    expect(restored.system.label).to.equal("focus.reduction");
                    expect(restored.system.skill).to.equal("fireMagic");
                })
            );
        });

        describe("SplittermondActiveEffect suppression", () => {
            it(
                "should suppress transferred weapon effects when unequipped",
                withActor(async (actor) => {
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
                            system: Modifier.init("actor.skills", of(2), {
                                name: "Training Sword",
                                type: "innate",
                                skill: "acrobatics",
                            }),
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
                })
            );

            it(
                "should suppress transferred spell effects when inactive",
                withActor(async (actor) => {
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
                })
            );
        });
    });

    describe("Active effect drag/drop", () => {
        it(
            "should drag an active effect between two actors",
            withActor(
                withActor(async (source, target) => {
                    const [effect] = await source.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Drag Test Effect" },
                    ]);
                    const sourceSheet = await new SplittermondCharacterSheet({ document: source }).render({
                        force: true,
                    });
                    const targetSheet = await new SplittermondCharacterSheet({ document: target }).render({
                        force: true,
                    });

                    const dataTransfer = new DataTransfer();
                    const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                    const dragStop = new DragEvent("drop", { dataTransfer });
                    sourceSheet.element.querySelector(`[data-effect-id='${effect.id}']`)?.dispatchEvent(dragStart);
                    targetSheet.element.dispatchEvent(dragStop);

                    await passesEventually(() => {
                        expect(target.effects.map((e: { name: string }) => e.name)).to.include("Drag Test Effect");
                    });

                    sourceSheet.close();
                    targetSheet.close();
                })
            )
        );

        it("should drag an active effect between two items", async () => {
            const sourceItem = await Item.create({ type: "weapon", name: "Drag Source Item" });
            const targetItem = await Item.create({ type: "weapon", name: "Drag Target Item" });
            try {
                const [effect] = await sourceItem.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Drag Test Effect" },
                ]);
                const sourceSheet = await new SplittermondItemSheet({ document: sourceItem }).render({ force: true });
                const targetSheet = await new SplittermondItemSheet({ document: targetItem }).render({ force: true });

                const dataTransfer = new DataTransfer();
                const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                const dragStop = new DragEvent("drop", { dataTransfer });
                sourceSheet.element.querySelector(`[data-effect-id='${effect.id}']`)?.dispatchEvent(dragStart);
                targetSheet.element.dispatchEvent(dragStop);

                await passesEventually(() => {
                    expect(targetItem.effects.map((e: { name: string }) => e.name)).to.include("Drag Test Effect");
                });

                sourceSheet.close();
                targetSheet.close();
            } finally {
                await Item.deleteDocuments([sourceItem.id, targetItem.id]);
            }
        });
    });
}
