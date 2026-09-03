import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import { Modifier, SplittermondActiveEffect } from "module/activeEffect";
import type SplittermondActor from "module/actor/actor";
import { SplittermondActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { evaluate, of, plus, ref, times } from "module/modifiers/expressions/scalar";
import { createScene, withActiveEffect, withActor } from "./fixtures";
import { passesEventually } from "../util";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondItemEffectsSheet from "module/item/sheets/item-effects-sheet";
import { serialize as serializeScalar } from "module/modifiers/expressions/scalar/serialization";
import { splittermond } from "module/config";
import type { FoundryScene } from "module/api/foundryTypes";

declare const Item: any;
declare const Scene: FoundryScene;
declare const game: { time: { worldTime: number; advance(delta: number): Promise<unknown> } };

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

                    try {
                        await passesEventually(
                            () => {
                                expect(effect.system.modifiers[0].path).to.equal("actor.skills");
                                expect(effect.system.modifiers[0].attributes.type).to.equal("innate");
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal(
                                    "skills skill=acrobatics +2"
                                );
                            },
                            1500,
                            100
                        );
                    } finally {
                        await effect.sheet?.close();
                    }
                }
            )
        );

        it(
            "should classify a spellEffect-type effect created directly on an actor as magic",
            withActiveEffect(
                {
                    name: "Direct SpellEffect",
                    type: "spellEffect",
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await enterInSheet(sheet, "splittermondRawInput", "skills skill=acrobatics +2");

                    try {
                        await passesEventually(
                            () => {
                                expect(effect.system.modifiers[0].path).to.equal("actor.skills");
                                expect(effect.system.modifiers[0].attributes.type).to.equal("magic");
                            },
                            1500,
                            100
                        );
                    } finally {
                        await effect.sheet?.close();
                    }
                }
            )
        );

        it(
            "should classify a spellEnhancedEffect-type effect created directly on an actor as magic",
            withActiveEffect(
                {
                    name: "Direct SpellEnhancedEffect",
                    type: "spellEnhancedEffect",
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await enterInSheet(sheet, "splittermondRawInput", "skills skill=acrobatics +2");

                    try {
                        await passesEventually(
                            () => {
                                expect(effect.system.modifiers[0].path).to.equal("actor.skills");
                                expect(effect.system.modifiers[0].attributes.type).to.equal("magic");
                            },
                            1500,
                            100
                        );
                    } finally {
                        await effect.sheet?.close();
                    }
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

        it(
            "should not pre-fill the modifier input with the effect name when no rawInput flag is set",
            withActiveEffect(
                {
                    name: "My Effect",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await sheet.render(true);
                    const input = sheet.element.querySelector(
                        "input[name='splittermondRawInput']"
                    ) as HTMLInputElement | null;
                    expect(input?.value).to.equal("");
                    await sheet.close();
                }
            )
        );

        it(
            "should render the rawInput flag value in the modifier input when the flag is set",
            withActiveEffect(
                {
                    name: "My Effect",
                    type: "modifier",
                    flags: { splittermond: { rawInput: "skills +2" } },
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await sheet.render(true);
                    const input = sheet.element.querySelector(
                        "input[name='splittermondRawInput']"
                    ) as HTMLInputElement | null;
                    expect(input?.value).to.equal("skills +2");
                    await sheet.close();
                }
            )
        );
    });

    describe("SplittermondActiveEffectConfig — skill group modifiers", () => {
        it(
            "should persist a grouped skill fragment as one effect with N entries",
            withActiveEffect(
                {
                    name: "Group",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await enterInSheet(sheet, "splittermondRawInput", "skills.general +2");

                    try {
                        await passesEventually(
                            () => {
                                expect(effect.system.modifiers).to.have.length(splittermond.skillGroups.general.length);
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal("skills.general +2");
                            },
                            1500,
                            100
                        );
                    } finally {
                        await effect.sheet?.close();
                    }
                }
            )
        );

        it(
            "should reject a two-fragment input with the singleModifierOnly warning",
            withActiveEffect(
                {
                    name: "Two",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    await enterInSheet(sheet, "splittermondRawInput", "skills.general +2, VTD +1");

                    try {
                        await new Promise((resolve) => setTimeout(resolve, 300));
                        expect(effect.system.modifiers).to.have.length(0);
                    } finally {
                        await effect.sheet?.close();
                    }
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

        describe("Real-time duration expiry via worldTime advance", () => {
            it(
                "should mark a timed seconds-duration effect expired when worldTime advances past it",
                withActiveEffect(
                    {
                        name: "Timed Seconds",
                        type: "modifier",
                        flags: { splittermond: { durationMode: "timed" } },
                        duration: { value: 60, units: "seconds" },
                        system: { modifiers: [], costModifiers: [] },
                    },
                    async (effect) => {
                        const baseline = game.time.worldTime;
                        const restored = effect as SplittermondActiveEffect;
                        expect(restored.start?.time, "start.time must be set").to.be.a("number");
                        expect(restored.duration.expired, "freshly created").to.be.false;

                        try {
                            await game.time.advance(120);
                            await passesEventually(
                                () => expect(restored.duration.expired, "after +120s").to.be.true,
                                1500,
                                50
                            );
                        } finally {
                            await game.time.advance(baseline - game.time.worldTime);
                        }
                    }
                )
            );

            it(
                "should mark a timed hours-duration effect expired when worldTime advances past it",
                withActiveEffect(
                    {
                        name: "Timed Hours",
                        type: "modifier",
                        flags: { splittermond: { durationMode: "timed" } },
                        duration: { value: 2, units: "hours" },
                        system: { modifiers: [], costModifiers: [] },
                    },
                    async (effect) => {
                        const baseline = game.time.worldTime;
                        const restored = effect as SplittermondActiveEffect;
                        expect(restored.start?.time, "start.time must be set").to.be.a("number");
                        expect(restored.duration.expired, "freshly created").to.be.false;

                        try {
                            await game.time.advance(3 * 3600 + 10);
                            await passesEventually(
                                () => expect(restored.duration.expired, "after +3h10m").to.be.true,
                                1500,
                                50
                            );
                        } finally {
                            await game.time.advance(baseline - game.time.worldTime);
                        }
                    }
                )
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

                    await sourceSheet.close();
                    await targetSheet.close();
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
                const sourceSheet = await new SplittermondItemEffectsSheet({ document: sourceItem }).render({
                    force: true,
                });
                const targetSheet = await new SplittermondItemEffectsSheet({ document: targetItem }).render({
                    force: true,
                });

                const dataTransfer = new DataTransfer();
                const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                const dragStop = new DragEvent("drop", { dataTransfer });
                sourceSheet.element.querySelector(`[data-effect-id='${effect.id}']`)?.dispatchEvent(dragStart);
                targetSheet.element.dispatchEvent(dragStop);

                await passesEventually(() => {
                    expect(targetItem.effects.map((e: { name: string }) => e.name)).to.include("Drag Test Effect");
                });

                await sourceSheet.close();
                await targetSheet.close();
            } finally {
                await Item.deleteDocuments([sourceItem.id, targetItem.id]);
            }
        });

        it(
            "should set a valid ActiveEffect drag payload for an effect transferred from an embedded item",
            withActor(async (actor) => {
                const [weapon] = await actor.createEmbeddedDocuments("Item", [
                    { type: "weapon", name: "Transferred Effect Source", system: { equipped: true } },
                ]);
                const [effect] = await weapon.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Transferred Drag Effect", type: "modifier", transfer: true },
                ]);

                actor.prepareData();
                const applicableEffects = Array.from(actor.allApplicableEffects());
                const transferredEffect = applicableEffects.find((e) => e.id === effect.id);
                expect(transferredEffect, "precondition: transferred effect appears in actor.allApplicableEffects()").to
                    .exist;
                expect(transferredEffect!.parent, "precondition: effect parent is the embedded item").to.equal(weapon);

                const sheet = await new SplittermondCharacterSheet({ document: actor }).render({ force: true });

                const effectLi = sheet.element.querySelector(`[data-effect-uuid='${effect.uuid}']`);
                expect(effectLi, "precondition: sheet renders an <li> with the transferred effect's uuid").to.exist;

                const dataTransfer = new DataTransfer();
                const setDataSpy = sinon.spy(dataTransfer, "setData");
                const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                effectLi!.dispatchEvent(dragStart);

                expect(setDataSpy.calledOnce, "setData called once during dragstart").to.be.true;
                const payload = JSON.parse(setDataSpy.firstCall.args[1]) as { type: string; uuid: string };
                expect(payload.type, "payload type is ActiveEffect").to.equal("ActiveEffect");
                expect(payload.uuid, "payload uuid is the embedded-effect uuid").to.equal(effect.uuid);

                await sheet.close();
            })
        );

        it(
            "should set a valid ActiveEffect drag payload for a directly-owned actor effect",
            withActor(async (actor) => {
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{ name: "Direct Drag Effect" }]);

                expect(effect.parent, "precondition: effect parent is the actor").to.equal(actor);

                const sheet = await new SplittermondCharacterSheet({ document: actor }).render({ force: true });

                const effectLi = sheet.element.querySelector(`[data-effect-uuid='${effect.uuid}']`);
                expect(effectLi, "precondition: sheet renders an <li> with the effect's uuid").to.exist;

                const dataTransfer = new DataTransfer();
                const setDataSpy = sinon.spy(dataTransfer, "setData");
                const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                effectLi!.dispatchEvent(dragStart);

                expect(setDataSpy.calledOnce, "setData called once during dragstart").to.be.true;
                const payload = JSON.parse(setDataSpy.firstCall.args[1]) as { type: string; uuid: string };
                expect(payload.type, "payload type is ActiveEffect").to.equal("ActiveEffect");
                expect(payload.uuid, "payload uuid is the effect uuid").to.equal(effect.uuid);

                await sheet.close();
            })
        );
    });

    describe("autoGenerated → modifier flip on drop", () => {
        it(
            "flips an autoGenerated effect to modifier when dragged between two actors",
            withActor(
                withActor(async (source, target) => {
                    const [effect] = await source.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Auto",
                            type: "autoGenerated",
                            system: { modifiers: [], costModifiers: [] },
                        },
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
                        const dropped = target.effects.find((e: { name: string }) => e.name === "Auto");
                        expect(dropped, "dropped effect exists on target").to.exist;
                        expect(dropped!.type, "dropped autoGenerated effect flips to modifier").to.equal("modifier");
                        expect(dropped!.origin, "dropped effect origin is the target actor uuid").to.equal(target.uuid);
                    });

                    await sourceSheet.close();
                    await targetSheet.close();
                })
            )
        );

        it("flips an autoGenerated effect to modifier when dragged between two items", async () => {
            const sourceItem = await Item.create({ type: "weapon", name: "Auto Source Item" });
            const targetItem = await Item.create({ type: "weapon", name: "Auto Target Item" });
            try {
                const [effect] = await sourceItem.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Auto",
                        type: "autoGenerated",
                        system: { modifiers: [], costModifiers: [] },
                    },
                ]);
                const sourceSheet = await new SplittermondItemEffectsSheet({ document: sourceItem }).render({
                    force: true,
                });
                const targetSheet = await new SplittermondItemEffectsSheet({ document: targetItem }).render({
                    force: true,
                });

                const dataTransfer = new DataTransfer();
                const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                const dragStop = new DragEvent("drop", { dataTransfer });
                sourceSheet.element.querySelector(`[data-effect-id='${effect.id}']`)?.dispatchEvent(dragStart);
                targetSheet.element.dispatchEvent(dragStop);

                await passesEventually(() => {
                    const dropped = targetItem.effects.find((e: { name: string }) => e.name === "Auto");
                    expect(dropped, "dropped effect exists on target item").to.exist;
                    expect(dropped!.type, "dropped autoGenerated effect flips to modifier").to.equal("modifier");
                });

                await sourceSheet.close();
                await targetSheet.close();
            } finally {
                await Item.deleteDocuments([sourceItem.id, targetItem.id]);
            }
        });

        it(
            "leaves a non-autoGenerated effect's type unchanged when dragged between two actors",
            withActor(
                withActor(async (source, target) => {
                    const [effect] = await source.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Manual",
                            type: "modifier",
                            system: { modifiers: [], costModifiers: [] },
                        },
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
                        const dropped = target.effects.find((e: { name: string }) => e.name === "Manual");
                        expect(dropped, "dropped effect exists on target").to.exist;
                        expect(dropped!.type, "non-autoGenerated effect type is unchanged").to.equal("modifier");
                    });

                    await sourceSheet.close();
                    await targetSheet.close();
                })
            )
        );

        it(
            "rejects a self-drop of an autoGenerated effect without creating a duplicate",
            withActor(async (actor) => {
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Self Auto",
                        type: "autoGenerated",
                        system: { modifiers: [], costModifiers: [] },
                    },
                ]);
                const before = actor.effects.size;
                const sheet = await new SplittermondCharacterSheet({ document: actor }).render({ force: true });

                const dataTransfer = new DataTransfer();
                const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                const dragStop = new DragEvent("drop", { dataTransfer });
                sheet.element.querySelector(`[data-effect-id='${effect.id}']`)?.dispatchEvent(dragStart);
                sheet.element.dispatchEvent(dragStop);

                await passesEventually(() => {
                    expect(actor.effects.size, "no duplicate effect created on self-drop").to.equal(before);
                });

                await sheet.close();
            })
        );
    });

    describe("modifierType recalculation on drop", () => {
        it(
            "should recalculate scalar modifier type when an effect is created on a weapon item",
            withActor(async (actor) => {
                const [weapon] = await actor.createEmbeddedDocuments("Item", [
                    { type: "weapon", name: "Sword", system: { equipped: true } },
                ]);
                const [effect] = await weapon.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Dropped Effect",
                        type: "modifier",
                        system: {
                            modifiers: [Modifier.init("skills", of(1), { name: "Dropped", type: "innate" })],
                            costModifiers: [],
                        },
                    },
                ]);

                const restored = weapon.effects.get(effect.id);
                expect(restored!.system.modifiers[0].attributes.type).to.equal("equipment");
            })
        );

        it(
            "should recalculate scalar modifier type when an effect is created on a spelleffect item",
            withActor(async (actor) => {
                const [spelleffect] = await actor.createEmbeddedDocuments("Item", [
                    { type: "spelleffect", name: "Glow", system: { active: true } },
                ]);
                const [effect] = await spelleffect.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Dropped Effect",
                        type: "modifier",
                        system: {
                            modifiers: [Modifier.init("skills", of(1), { name: "Dropped", type: "equipment" })],
                            costModifiers: [],
                        },
                    },
                ]);

                const restored = spelleffect.effects.get(effect.id);
                expect(restored!.system.modifiers[0].attributes.type).to.equal("magic");
            })
        );

        it(
            "should recalculate scalar modifier type when an effect is created directly on an actor as a spellEffect",
            withActor(async (actor) => {
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Direct SpellEffect",
                        type: "spellEffect",
                        system: {
                            modifiers: [Modifier.init("skills", of(1), { name: "Direct", type: "equipment" })],
                            costModifiers: [],
                        },
                    },
                ]);
                await effect.sheet?.close();

                const restored = actor.effects.get(effect.id);
                expect(restored!.system.modifiers[0].attributes.type).to.equal("magic");
            })
        );

        it(
            "should recalculate scalar modifier type when an effect is created directly on an actor as a base modifier effect",
            withActor(async (actor) => {
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Direct Modifier",
                        type: "modifier",
                        system: {
                            modifiers: [Modifier.init("skills", of(1), { name: "Direct", type: "equipment" })],
                            costModifiers: [],
                        },
                    },
                ]);
                await effect.sheet?.close();

                const restored = actor.effects.get(effect.id);
                expect(restored!.system.modifiers[0].attributes.type).to.equal("innate");
            })
        );

        it(
            "should not modify cost modifier attributes when an effect is created on a weapon item",
            withActor(async (actor) => {
                const [weapon] = await actor.createEmbeddedDocuments("Item", [
                    { type: "weapon", name: "Sword", system: { equipped: true } },
                ]);
                const [effect] = await weapon.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Cost Effect",
                        type: "modifier",
                        system: {
                            modifiers: [],
                            costModifiers: [
                                {
                                    label: "focus.reduction",
                                    serializedValue: { type: "amount", amount: { _exhausted: 1 } },
                                    skill: null,
                                    attributes: { type: "defensive" },
                                },
                            ],
                        },
                    },
                ]);

                const restored = weapon.effects.get(effect.id);
                expect(restored!.system.costModifiers[0].attributes.type).to.equal("defensive");
            })
        );

        it(
            "should recalculate modifier type when an effect is dragged from an actor onto a weapon item",
            withActor(async (sourceActor) => {
                const [weapon] = await sourceActor.createEmbeddedDocuments("Item", [
                    { type: "weapon", name: "Target Weapon", system: { equipped: true } },
                ]);
                const sourceEffectData = {
                    name: "Dragged",
                    type: "modifier",
                    system: {
                        modifiers: [Modifier.init("skills", of(1), { name: "Dragged", type: "innate" })],
                        costModifiers: [],
                    },
                };
                const [sourceEffect] = await sourceActor.createEmbeddedDocuments("ActiveEffect", [sourceEffectData]);

                await weapon.createEmbeddedDocuments("ActiveEffect", [sourceEffect.toObject()]);

                const targetEffect = weapon.effects.contents[0];
                expect(targetEffect.system.modifiers[0].attributes.type).to.equal("equipment");
            })
        );
    });

    describe("Combat-aware default duration units", () => {
        let combatScene: FoundryScene;
        let originalScene: FoundryScene | null;

        before(async () => {
            originalScene = (game as any).canvas?.scene ?? null;
            combatScene = await createScene();
            await combatScene.view();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await combatScene.activate();
        });

        afterEach(async () => {
            await Combat.deleteDocuments(Array.from((game as any).combats.keys()));
            await combatScene.deleteEmbeddedDocuments(
                "Token",
                combatScene.tokens.map((t: TokenDocument) => t.id)
            );
        });

        after(async () => {
            await Scene.deleteDocuments([combatScene.id]);
            if (originalScene) await originalScene.activate();
        });

        async function addActorToCombat(actor: SplittermondActor) {
            const combat = (await Combat.create({})) as any;
            await combat.update({ active: true });
            await combat.startCombat();
            const tokenDocument = (
                await combatScene.createEmbeddedDocuments("Token", [
                    {
                        type: "base",
                        actorId: actor.id,
                        x: combatScene._viewPosition.x,
                        y: combatScene._viewPosition.y,
                    },
                ])
            )[0] as TokenDocument;
            await combat.createEmbeddedDocuments("Combatant", [
                {
                    type: "base",
                    actorId: actor.id,
                    sceneId: combatScene.id,
                    tokenId: tokenDocument.id,
                    defeated: false,
                    group: null,
                },
            ]);
            return combat;
        }

        it(
            "defaults timed units to hours when the actor is not in combat",
            withActor(async (actor) => {
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "NonCombat Timed",
                        type: "modifier",
                        flags: { splittermond: { durationMode: "timed" } },
                        system: { modifiers: [], costModifiers: [] },
                    },
                ]);
                const sheet = effect.sheet as SplittermondActiveEffectConfig;
                await sheet.render(true);
                try {
                    const unitsSelect = sheet.element.querySelector(
                        "select[name='duration.units']"
                    ) as HTMLSelectElement | null;
                    expect(unitsSelect, "duration units dropdown rendered").to.exist;
                    expect(unitsSelect!.value, "non-combat actor defaults to hours").to.equal("hours");
                } finally {
                    await sheet.close();
                }
            })
        );

        it(
            "defaults timed units to rounds when the actor is in combat",
            withActor(async (actor) => {
                await addActorToCombat(actor);
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Combat Timed",
                        type: "modifier",
                        flags: { splittermond: { durationMode: "timed" } },
                        system: { modifiers: [], costModifiers: [] },
                    },
                ]);
                const sheet = effect.sheet as SplittermondActiveEffectConfig;
                await sheet.render(true);
                try {
                    const unitsSelect = sheet.element.querySelector(
                        "select[name='duration.units']"
                    ) as HTMLSelectElement | null;
                    expect(unitsSelect, "duration units dropdown rendered").to.exist;
                    expect(unitsSelect!.value, "combat actor defaults to rounds").to.equal("rounds");
                    const expiryInput = sheet.element.querySelector(
                        "input[name='duration.expiry']"
                    ) as HTMLInputElement | null;
                    expect(expiryInput?.value, "rounds expiry is roundEnd").to.equal("roundEnd");
                } finally {
                    await sheet.close();
                }
            })
        );

        it(
            "persists combat-aware rounds default after submitting the duration form",
            withActor(async (actor) => {
                await addActorToCombat(actor);
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Combat Submit",
                        type: "modifier",
                        flags: { splittermond: { durationMode: "timed" } },
                        system: { modifiers: [], costModifiers: [] },
                    },
                ]);
                const sheet = effect.sheet as SplittermondActiveEffectConfig;
                await enterInSheet(sheet, "duration.value", "2");
                try {
                    await passesEventually(
                        () => {
                            const restored = actor.effects.get(effect.id) as SplittermondActiveEffect;
                            expect(restored.duration.units, "persisted units").to.equal("rounds");
                            expect(restored.duration.expiry, "persisted expiry").to.equal("roundEnd");
                        },
                        2000,
                        100
                    );
                } finally {
                    await sheet.close();
                }
            })
        );
    });
}
