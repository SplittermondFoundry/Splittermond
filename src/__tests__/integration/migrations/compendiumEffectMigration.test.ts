import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "../fixtures";
import { SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";
import { InverseModifier, Modifier } from "module/activeEffect";
import { of } from "module/modifiers/expressions/scalar";
import type { ActionEffectDataModel } from "module/activeEffect/dataModel/ActionEffectDataModel";
import type { SplittermondActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { passesEventually } from "../../util";

export function compendiumEffectMigrationTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;
    describe("Legacy compendium effects", () => {
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
