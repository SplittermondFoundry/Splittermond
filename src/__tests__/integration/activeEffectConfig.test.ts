import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { Modifier, SplittermondActiveEffect } from "module/activeEffect";
import { SplittermondActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { evaluate, of, plus, ref, times } from "module/modifiers/expressions/scalar";
import { withActiveEffect, withActor } from "./fixtures";
import { passesEventually } from "../util";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import { serialize as serializeScalar } from "module/modifiers/expressions/scalar/serialization";

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
                    system: {
                        modifiers: [
                            Modifier.init("skills", of(1), { name: "Test", type: "innate", skill: "acrobatics" }),
                        ],
                        costModifiers: [],
                    },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await enterInSheet(sheet, "splittermondRawInput", "skills skill=acrobatics +2");

                    await passesEventually(
                        () => {
                            expect(effect.system.modifiers[0].path).to.equal("actor.skills");
                            expect(effect.getFlag("splittermond", "rawInput")).to.equal("skills skill=acrobatics +2");
                        },
                        1500,
                        100
                    );
                }
            )
        );

        it(
            "should persist and restore a cost modifier through a modifier-type effect",
            withActiveEffect(
                {
                    name: "Kosten",
                    type: "modifier",
                    system: {
                        modifiers: [],
                        costModifiers: [
                            {
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
                        ],
                    },
                },
                async (effect) => {
                    const costModifiers = SplittermondActiveEffect.getCostModifiers([
                        effect as SplittermondActiveEffect,
                    ]);
                    expect(costModifiers).to.have.length(1);
                    expect(costModifiers[0].label).to.equal("kosten -1");
                }
            )
        );
    });

    describe("ActiveEffect DataModel serialization via Foundry persistence", () => {
        describe("SplittermondActiveEffect type updates", () => {
            it(
                "should update modifier kind via update",
                withActor(async (actor) => {
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Kind Change",
                            type: "modifier",
                            system: {
                                modifiers: [
                                    {
                                        path: "skills",
                                        serializedValue: serializeScalar(of(1)),
                                        implementation: "additive",
                                        selectable: false,
                                        attributes: { name: "Kind Change", type: "innate" },
                                    },
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);

                    await effect.update({
                        system: {
                            modifiers: [
                                {
                                    path: "skills",
                                    serializedValue: serializeScalar(of(-1)),
                                    implementation: "inverse",
                                    selectable: false,
                                    attributes: { name: "Kind Change", type: "innate" },
                                },
                            ],
                            costModifiers: [],
                        },
                    });

                    const updated = actor.effects.get(effect.id) as SplittermondActiveEffect;
                    expect(updated.type).to.equal("modifier");
                    const modifiers = SplittermondActiveEffect.getModifiers([updated]);
                    expect(modifiers).to.have.length(1);
                    expect(await evaluate(modifiers[0].value)).to.equal(-1);
                    expect(modifiers[0].isBonus).to.be.true;
                })
            );

            it(
                "should update modifier kind via updateSource",
                withActor(async (actor) => {
                    const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Kind Change Source",
                            type: "modifier",
                            system: {
                                modifiers: [
                                    {
                                        path: "skills",
                                        serializedValue: serializeScalar(of(1)),
                                        implementation: "additive",
                                        selectable: false,
                                        attributes: { name: "Kind Change Source", type: "innate" },
                                    },
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);

                    const effect = created as SplittermondActiveEffect;
                    effect.updateSource({
                        system: {
                            modifiers: [
                                {
                                    path: "skills",
                                    serializedValue: serializeScalar(of(-2)),
                                    implementation: "inverse",
                                    selectable: false,
                                    attributes: { name: "Kind Change Source", type: "innate" },
                                },
                            ],
                            costModifiers: [],
                        },
                    });

                    expect(effect.type).to.equal("modifier");
                    const modifiers = SplittermondActiveEffect.getModifiers([effect]);
                    expect(modifiers).to.have.length(1);
                    expect(await evaluate(modifiers[0].value)).to.equal(-2);
                })
            );
        });

        describe("ModifierDataModel", () => {
            it(
                "should persist and restore a simple expression through an ActiveEffect",
                withActor(async (actor) => {
                    const initData = {
                        modifiers: [Modifier.init("test.path", of(5), { name: "Test", type: "innate" })],
                        costModifiers: [],
                    };
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Test Effect", type: "modifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect;
                    expect(restored).to.exist;
                    const restoredModifier = SplittermondActiveEffect.getModifiers([restored])[0];
                    expect(await evaluate(restoredModifier.value)).to.equal(5);
                    expect(restoredModifier.groupId).to.equal("test.path");
                    expect(restoredModifier.attributes.name).to.equal("Test");
                })
            );

            it(
                "should persist and restore a complex expression",
                withActor(async (actor) => {
                    const expr = plus(of(3), times(of(2), of(4)));
                    const initData = {
                        modifiers: [Modifier.init("complex.path", expr, { name: "Complex", type: "magic" })],
                        costModifiers: [],
                    };
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Complex Effect", type: "modifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect;
                    const restoredModifier = SplittermondActiveEffect.getModifiers([restored])[0];
                    expect(await evaluate(restoredModifier.value)).to.equal(11);
                })
            );

            it(
                "should survive actor re-preparation",
                withActor(async (actor) => {
                    const initData = {
                        modifiers: [Modifier.init("prep.path", of(7), { name: "Prep", type: "innate" })],
                        costModifiers: [],
                    };
                    await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Prep Effect", type: "modifier", system: initData },
                    ]);

                    actor.prepareData();

                    const effect = actor.effects.contents[0] as SplittermondActiveEffect;
                    const effectModifier = SplittermondActiveEffect.getModifiers([effect])[0];
                    expect(await evaluate(effectModifier.value)).to.equal(7);
                })
            );

            it(
                "should persist and restore a reference expression through an ActiveEffect",
                withActor(async (actor) => {
                    actor.updateSource({ system: { attributes: { intuition: { initial: 3 } } } });

                    const expr = ref("attributes.intuition.value", () => null, "attributes.intuition.value");
                    const initData = {
                        modifiers: [Modifier.init("empathy", expr, { name: "RefTest", type: "innate" })],
                        costModifiers: [],
                    };
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Ref Effect", type: "modifier", system: initData },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect;
                    const restoredModifier = SplittermondActiveEffect.getModifiers([restored])[0];
                    expect(await evaluate(restoredModifier.value)).to.equal(3);
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
                    const initData = {
                        modifiers: [Modifier.init("empathy", expr, { name: "EmpathyBoost", type: "innate" })],
                        costModifiers: [],
                    };
                    await actor.createEmbeddedDocuments("ActiveEffect", [
                        { name: "Empathy Boost", type: "modifier", system: initData },
                    ]);

                    actor.prepareBaseData();
                    await actor.prepareEmbeddedDocuments();
                    actor.prepareDerivedData();

                    expect(await actor.skills.empathy.value.calculate()).to.equal(7);
                })
            );
        });

        describe("InverseModifierDataModel", () => {
            it(
                "should persist and restore through an ActiveEffect",
                withActor(async (actor) => {
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Inverse Effect",
                            type: "modifier",
                            system: {
                                modifiers: [
                                    {
                                        path: "inv.path",
                                        serializedValue: serializeScalar(of(-3)),
                                        implementation: "inverse",
                                        selectable: false,
                                        attributes: { name: "Inverse", type: "innate" },
                                    },
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect;
                    const modifiers = SplittermondActiveEffect.getModifiers([restored]);
                    expect(modifiers).to.have.length(1);
                    expect(await evaluate(modifiers[0].value)).to.equal(-3);
                    expect(modifiers[0].isBonus).to.be.true;
                })
            );
        });

        describe("MultiplicativeModifierDataModel", () => {
            it(
                "should persist and restore through an ActiveEffect",
                withActor(async (actor) => {
                    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Mult Effect",
                            type: "modifier",
                            system: {
                                modifiers: [
                                    {
                                        path: "mult.path",
                                        serializedValue: serializeScalar(of(3)),
                                        implementation: "multiplicative",
                                        selectable: false,
                                        attributes: { name: "Mult", type: "innate" },
                                    },
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);

                    const restored = actor.effects.get(effect.id) as SplittermondActiveEffect;
                    const modifiers = SplittermondActiveEffect.getModifiers([restored]);
                    expect(modifiers).to.have.length(1);
                    expect(await evaluate(modifiers[0].value)).to.equal(3);
                    expect(modifiers[0].isBonus).to.be.true;
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
                            system: {
                                modifiers: [
                                    Modifier.init("actor.skills", of(2), {
                                        name: "Training Sword",
                                        type: "innate",
                                        skill: "acrobatics",
                                    }),
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);

                    actor.prepareData();
                    const whileUnequipped = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                    expect(whileUnequipped).to.have.length(0);

                    await weapon.update({ system: { equipped: true } });
                    actor.prepareData();
                    const whileEquipped = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                    expect(whileEquipped).to.have.length(1);
                    expect(await evaluate(whileEquipped[0].value)).to.equal(2);
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
                            system: {
                                modifiers: [
                                    Modifier.init("skills.mysticism", of(1), { name: "Arcane Focus", type: "magic" }),
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);

                    actor.prepareData();
                    const whileInactive = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                    expect(whileInactive).to.have.length(0);

                    await spellEffectItem.update({ system: { active: true } });
                    actor.prepareData();
                    const whileActive = SplittermondActiveEffect.getModifiers(actor.allApplicableEffects());
                    expect(whileActive).to.have.length(1);
                    expect(await evaluate(whileActive[0].value)).to.equal(1);
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
