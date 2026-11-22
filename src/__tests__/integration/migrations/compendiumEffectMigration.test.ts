import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "../fixtures";
import { SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";
import { InverseModifier, Modifier } from "module/activeEffect";
import { of } from "module/modifiers/expressions/scalar";
import type { ActionEffectDataModel } from "module/activeEffect/dataModel/ActionEffectDataModel";
import type { SplittermondActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { passesEventually } from "../../util";
import { readStoredActor, withoutCompendiumEffectMigrations } from "./fixtures";

export function compendiumEffectMigrationTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;
    describe("Legacy compendium effects", () => {
        it(
            "migrates persisted legacy effects when their actor is loaded again from the database",
            withActor(async (actor) => {
                const initialInitiative = actor.derivedValues.initiative.value.calculateSync();
                const actorName = actor.name;
                const fixtureName = `Legacy effects ${actor.id}`;
                const [reflexes, defense] = await actor.createEmbeddedDocuments("Item", [
                    { name: "Stored legacy reflexes", type: "mastery", system: { skill: "acrobatics" } },
                    { name: "Stored legacy defense", type: "mastery", system: { skill: "blades" } },
                ]);
                const stored = await withoutCompendiumEffectMigrations(fixtureName, async () => {
                    await reflexes.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Legacy reflexes",
                            type: "modifier",
                            transfer: true,
                            flags: { splittermond: { rawInput: "INI -3", durationMode: "permanent" } },
                            system: {
                                modifiers: [
                                    InverseModifier.init("actor.initiative", of(-3), {
                                        name: fixtureName,
                                        type: "innate",
                                    }),
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);
                    await defense.createEmbeddedDocuments("ActiveEffect", [
                        {
                            name: "Legacy defense",
                            type: "modifier",
                            transfer: true,
                            flags: {
                                splittermond: { rawInput: "item.defenseTickCost skill= -1", durationMode: "permanent" },
                            },
                            system: {
                                modifiers: [
                                    Modifier.init("item.defenseTickCost", of(-1), {
                                        name: fixtureName,
                                        type: "innate",
                                        skill: "blades",
                                    }),
                                ],
                                costModifiers: [],
                            },
                        },
                    ]);
                    // A local-only edit distinguishes a database read from the cached actor or its toObject().
                    actor.updateSource({ name: "Unsaved actor name" });
                    return readStoredActor(actor.id);
                });
                expect(stored).not.to.equal(actor);
                expect(stored.name).to.equal(actorName);
                expect(stored.derivedValues.initiative.value.calculateSync()).to.equal(initialInitiative);
                expect(stored.items.get(reflexes.id)!.effects.contents[0].system).to.have.nested.property(
                    "modifiers.0.path",
                    "actor.initiative"
                );
                expect(stored.items.get(defense.id)!.effects.contents[0].getFlag("splittermond", "rawInput")).to.equal(
                    "item.defenseTickCost skill= -1"
                );

                const reloaded = await readStoredActor(actor.id);

                expect(reloaded).not.to.equal(stored);
                expect(reloaded.id).to.equal(actor.id);
                expect(reloaded.name).to.equal(actorName);
                expect(reloaded.derivedValues.initiative.value.calculateSync()).to.equal(initialInitiative - 3);
                const migratedReflexes = reloaded.items.get(reflexes.id)!.effects.contents[0];
                expect(migratedReflexes.system).to.have.nested.property("modifiers.0.path", "initiative");
                expect(migratedReflexes.system).to.have.nested.property("modifiers.0.attributes.name", fixtureName);
                expect(migratedReflexes.getFlag("splittermond", "rawInput")).to.equal("INI -3");
                const migratedDefense = reloaded.items.get(defense.id)!.effects.contents[0];
                expect(migratedDefense.getFlag("splittermond", "rawInput")).to.equal(
                    'item.defenseTickCost skill="blades" -1'
                );
                expect(migratedDefense.system).to.have.nested.property("modifiers.0.attributes.skill", "blades");
                expect(migratedDefense.system).to.have.nested.property("modifiers.0.attributes.name", fixtureName);
            })
            // Persisting both effects and reading twice exceeded the two-second default in Foundry.
        ).timeout(5000);

        it(
            "migrates an embedded initiative effect through creation, partial updates and a data roundtrip",
            withActor(async (actor) => {
                const initialInitiative = actor.derivedValues.initiative.value.calculateSync();
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    { name: "Legacy mastery", type: "mastery", system: { skill: "acrobatics" } },
                ]);
                const [effect] = await item.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Custom reflexes",
                        type: "modifier",
                        transfer: true,
                        flags: { splittermond: { rawInput: "INI -3", durationMode: "permanent" } },
                        system: {
                            modifiers: [
                                InverseModifier.init("actor.initiative", of(-3), {
                                    name: "Custom source",
                                    type: "innate",
                                }),
                            ],
                            costModifiers: [],
                        },
                    },
                ]);

                expect(actor.derivedValues.initiative.value.calculateSync()).to.equal(initialInitiative - 3);
                await effect.update({ disabled: true });
                expect(actor.derivedValues.initiative.value.calculateSync()).to.equal(initialInitiative);
                await effect.update({ disabled: false, name: "Renamed effect" });
                expect(actor.derivedValues.initiative.value.calculateSync()).to.equal(initialInitiative - 3);
                const restored = new SplittermondActiveEffect(effect.toObject(), { parent: item });
                const system = restored.system as ActionEffectDataModel;
                expect(system.modifiers).to.have.length(1);
                expect(system.modifiers[0].path).to.equal("initiative");
                expect(system.modifiers[0].attributes.name).to.equal("Custom source");
                expect(restored.name).to.equal("Renamed effect");
                expect(restored.getFlag("splittermond", "rawInput")).to.equal("INI -3");
                expect(item.effects).to.have.length(1);
            })
        );

        it(
            "repairs an existing defense effect's input and preserves its skill when edited in its sheet",
            withActor(async (actor) => {
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    { name: "Legacy defense mastery", type: "mastery", system: { skill: "blades" } },
                ]);
                const [document] = await item.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Custom defense",
                        type: "modifier",
                        transfer: true,
                        flags: {
                            splittermond: { rawInput: "item.defenseTickCost skill= -1", durationMode: "permanent" },
                        },
                        system: {
                            modifiers: [
                                Modifier.init("item.defenseTickCost", of(-1), {
                                    name: "Custom source",
                                    type: "innate",
                                    skill: "blades",
                                }),
                            ],
                            costModifiers: [],
                        },
                    },
                ]);
                const effect = document as SplittermondActiveEffect;
                const sheet = effect.sheet as SplittermondActiveEffectConfig;
                try {
                    await sheet.render({ force: true });
                    const input = sheet.element.querySelector<HTMLInputElement>('[name="splittermondRawInput"]');
                    expect(input?.value).to.equal('item.defenseTickCost skill="blades" -1');
                    expect((effect.system as ActionEffectDataModel).modifiers[0].attributes.name).to.equal(
                        "Custom source"
                    );

                    input!.value = 'item.defenseTickCost skill="blades" -2';
                    input!.form!.requestSubmit();

                    await passesEventually(() => {
                        expect(effect.getFlag("splittermond", "rawInput")).to.equal(
                            'item.defenseTickCost skill="blades" -2'
                        );
                        expect((effect.system as ActionEffectDataModel).modifiers[0].serializedValue).to.deep.equal({
                            type: "amount",
                            amount: -2,
                        });
                    });
                    const restored = new SplittermondActiveEffect(effect.toObject(), { parent: item });
                    expect((restored.system as ActionEffectDataModel).modifiers[0].attributes.skill).to.equal("blades");
                    expect(restored.getFlag("splittermond", "rawInput")).to.equal(
                        'item.defenseTickCost skill="blades" -2'
                    );
                } finally {
                    await sheet.close();
                }
            })
            // Rendering the real sheet and persisting its edit can exceed Quench's two-second default.
        ).timeout(5000);
    });
}
