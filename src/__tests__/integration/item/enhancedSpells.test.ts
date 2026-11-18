import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";
import type SplittermondActor from "module/actor/actor";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondSpellItem from "module/item/spell";
import SplittermondSpellSheet from "module/item/sheets/spell-sheet";
import { spellVariantProperties } from "module/item/dataModel/SpellValueVariants";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import { DamageModel } from "module/item/dataModel/propertyModels/DamageModel";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { foundryApi } from "module/api/foundryApi";
import { ChatMessage, type FoundryChatMessage } from "module/api/ChatMessage";
import { SplittermondChatMessage } from "module/data/SplittermondChatMessage";
import { handleChatAction, SplittermondChatCard } from "module/util/chat/SplittermondChatCard";
import { SpellRollMessage } from "module/util/chat/rollMessages/spellChatMessage/SpellRollMessage";
import { DamageMessage } from "module/util/chat/damageChatMessage/DamageMessage";

export function enhancedSpellsTest({ describe, it, expect, beforeEach, afterEach }: QuenchBatchContext) {
    let sheet: SplittermondSpellSheet | undefined;
    let actorSheet: SplittermondCharacterSheet | undefined;
    afterEach(async () => {
        await Promise.all([sheet?.close(), actorSheet?.close()]);
        sheet = undefined;
        actorSheet = undefined;
    });

    describe("Enhanced spell persistence and sheets", () => {
        it(
            "loads an old spell without enhanced data and inherits later normal updates",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                expect(spellVariantProperties.map((key) => spell.system[key].enhanced)).to.deep.equal(
                    Array(7).fill(null)
                );

                await spell.update({
                    "system.damage.base.stringInput": "3W6",
                    "system.range.base": "20m",
                    "system.effectArea.base": "2 m Radius",
                    "system.effectDuration.base": "5 min",
                });

                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("3W6");
                expect(spell.getValues({ enhanced: true })).to.include({
                    range: "20m",
                    effectArea: "2 m Radius",
                    effectDuration: "5 min",
                });
                if (!(spell.system instanceof SpellDataModel)) throw new Error("Missing spell data model");
                const restored = new SpellDataModel(spell.system.toObject());
                expect(spellVariantProperties.map((key) => restored[key].enhanced)).to.deep.equal(Array(7).fill(null));
            })
        );

        it(
            "keeps mixed enhanced overrides while other properties inherit later normal updates",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                await spell.update({
                    "system.features.base.internalFeatureList": [{ name: "Scharf", value: 2 }],
                    "system.effectArea.base": "2 m Radius",
                    "system.effectDuration.base": "5 min",
                    "system.damage.enhanced.stringInput": "2W6",
                    "system.range.enhanced": "20m",
                });
                const initial = spell.getValues({ enhanced: true });
                expect(initial.damage.displayValue).to.equal("2W6");
                expect(initial.features.features).to.equal("Scharf 2");
                expect(initial).to.include({
                    damageType: "wind",
                    costType: "V",
                    range: "20m",
                    effectArea: "2 m Radius",
                    effectDuration: "5 min",
                });

                await spell.update({
                    "system.damage.base.stringInput": "3W6",
                    "system.features.base.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.damageType.base": "fire",
                    "system.costType.base": "E",
                    "system.range.base": "30m",
                    "system.effectArea.base": "4 m Radius",
                    "system.effectDuration.base": "10 min",
                });

                const updated = spell.getValues({ enhanced: true });
                expect(updated.damage.displayValue, "own enhanced damage survives normal changes").to.equal("2W6");
                expect(updated.features.features, "features follow the updated normal value").to.equal("Kritisch 3");
                expect(updated).to.include({
                    damageType: "fire",
                    costType: "E",
                    range: "20m",
                    effectArea: "4 m Radius",
                    effectDuration: "10 min",
                });
                for (const key of ["features", "damageType", "costType", "effectArea", "effectDuration"] as const)
                    expect(spell.system[key].enhanced, `${key} remains inherited`).to.equal(null);
            })
        );

        it(
            "round-trips nested overrides and preserves them during unrelated partial updates",
            withActor(async (actor) => {
                const spell = await createSpell(actor);

                await spell.update({
                    "system.damage.enhanced.stringInput": "2W6",
                    "system.features.enhanced.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.damageType.enhanced": "none",
                    "system.costType.enhanced": "K",
                    "system.range.enhanced": "",
                });
                await spell.update({
                    "system.description": "Unrelated update",
                    "system.damage.base.stringInput": "4W6",
                });

                expect(spell.system.features.enhanced?.document, "nested features retain their owning item").to.equal(
                    spell
                );
                if (!(spell.system instanceof SpellDataModel)) throw new Error("Missing spell data model");
                const restored = new SpellDataModel(spell.system.toObject());
                expect(restored.damage.enhanced).to.be.instanceOf(DamageModel);
                expect(restored.damage.enhanced?.displayValue).to.equal("2W6");
                expect(restored.features.enhanced).to.be.instanceOf(ItemFeaturesModel);
                expect(restored.features.enhanced?.featureValue("Kritisch")).to.equal(3);
                expect(restored.damageType.enhanced).to.equal("none");
                expect(restored.costType.enhanced).to.deep.equal("K");
                expect(restored.range.enhanced).to.deep.equal("");
                expect(restored.effectArea.enhanced).to.equal(null);
            })
        );

        it(
            "retains preview text overrides and restores inheritance for empty preview defaults",
            withActor(async (actor) => {
                const spell = await createSpell(actor, {
                    range: "20m",
                    effectArea: "",
                    effectDuration: "10 min",
                });

                await spell.update({ "system.effectArea.base": "2 m Radius" });

                expect(spell.system.range.enhanced).to.deep.equal("20m");
                expect(spell.system.effectArea.enhanced).to.equal(null);
                expect(spell.getValues({ enhanced: true })).to.include({
                    range: "20m",
                    effectArea: "2 m Radius",
                    effectDuration: "10 min",
                });
            })
        );

        it(
            "migrates wrapped preview overrides without losing explicit zero, empty text or absent types",
            withActor(async (actor) => {
                const spell = await createSpell(actor, {
                    damage: { stringInput: "0" },
                    features: { internalFeatureList: [] },
                    damageType: { value: null },
                    costType: { value: null },
                    range: { value: "" },
                });
                await spell.update({ "system.range.base": "30m", "system.damageType.base": "fire" });

                if (!(spell.system instanceof SpellDataModel)) throw new Error("Missing spell data model");
                const restored = new SpellDataModel(spell.system.toObject());

                expect(restored.damage.enhanced?.calculationValue).to.equal("0");
                expect(restored.features.enhanced?.innateFeatures).to.equal("");
                expect(restored.damageType).to.deep.equal({ base: "fire", enhanced: "none" });
                expect(restored.costType).to.deep.equal({ base: "V", enhanced: "none" });
                expect(restored.range).to.deep.equal({ base: "30m", enhanced: "" });
                expect(spell.getValues({ enhanced: true })).to.include({ damageType: null, costType: null, range: "" });
            })
        );

        it(
            "opens the registered spell sheet from the character with all seven comparison rows",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                const characterSheet = actor.sheet;
                if (!(characterSheet instanceof SplittermondCharacterSheet))
                    throw new Error("Wrong registered character sheet");
                actorSheet = characterSheet;
                await actorSheet.render(true);
                actorSheet.changeTab("spells", "primary");
                const edit = actorSheet.element.querySelector<HTMLButtonElement>(
                    `[data-item-id='${spell.id}'] [data-action='edit-item']`
                );
                expect(edit, "spell edit button exists on the character").to.exist;

                edit!.click();
                sheet = spellSheet(spell);
                await passesEventually(() => expect(sheet!.rendered, "registered spell sheet opens").to.equal(true));
                sheet.changeTab("properties", "primary");

                const comparison = sheet.element.querySelector<HTMLElement>(".properties-comparison")!;
                expect(
                    getComputedStyle(comparison).gridTemplateColumns.split(/\s+/),
                    "exactly three grid columns"
                ).to.have.length(3);
                const controls = [...comparison.querySelectorAll<HTMLElement>(".property-input")];
                expect(controls).to.have.length(14);
                for (let row = 0; row < 7; row++) {
                    const normal = controls[row * 2].getBoundingClientRect();
                    const enhanced = controls[row * 2 + 1].getBoundingClientRect();
                    expect(normal.width, `normal control in row ${row + 1} is visible`).to.be.greaterThan(0);
                    expect(enhanced.width, `enhanced control in row ${row + 1} is visible`).to.be.greaterThan(0);
                    expect(normal.right, `controls in row ${row + 1} do not overlap`).to.be.at.most(enhanced.left);
                    expect(
                        Math.abs(normal.top - enhanced.top),
                        `controls in row ${row + 1} share a row`
                    ).to.be.lessThan(8);
                }
            })
        );

        it(
            "creates a spell from the character and retains all seven normal and enhanced entries after reopening",
            withActor(async (actor) => {
                const existing = await createSpell(actor);
                const characterSheet = actor.sheet;
                if (!(characterSheet instanceof SplittermondCharacterSheet))
                    throw new Error("Wrong registered character sheet");
                actorSheet = characterSheet;
                await actorSheet.render(true);
                actorSheet.changeTab("spells", "primary");
                actorSheet.element
                    .querySelector<HTMLButtonElement>("[data-item-type='spell'] [data-action='add-item']")!
                    .click();
                await passesEventually(() => expect(actor.items.size).to.equal(2));
                const spell = actor.items.find((item) => item.id !== existing.id);
                if (!(spell instanceof SplittermondSpellItem)) throw new Error("New spell was not created");
                sheet = spellSheet(spell);
                await passesEventually(() => expect(sheet!.rendered).to.equal(true));
                sheet.changeTab("properties", "primary");
                const entries = [
                    {
                        normal: "damage.base.stringInput",
                        enhanced: "damage.enhanced.stringInput",
                        value: "1W6",
                        override: "2W6",
                    },
                    {
                        normal: "features.base.innateFeatures",
                        enhanced: "features.enhanced.innateFeatures",
                        value: "Scharf 2",
                        override: "Kritisch 3",
                    },
                    { normal: "damageType.base", enhanced: "damageType.enhanced", value: "wind", override: "fire" },
                    { normal: "costType.base", enhanced: "costType.enhanced", value: "V", override: "E" },
                    { normal: "range.base", enhanced: "range.enhanced", value: "10m", override: "20m" },
                    {
                        normal: "effectArea.base",
                        enhanced: "effectArea.enhanced",
                        value: "2 m Radius",
                        override: "4 m Radius",
                    },
                    {
                        normal: "effectDuration.base",
                        enhanced: "effectDuration.enhanced",
                        value: "5 min",
                        override: "10 min",
                    },
                ];

                for (const entry of entries) input(sheet, `system.${entry.normal}`).value = entry.value;
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();

                await passesEventually(() => {
                    for (const entry of entries)
                        expect(
                            foundryApi.utils.resolveProperty(spell, `system.${entry.normal}`),
                            entry.normal
                        ).to.equal(entry.value);
                    expect(spellVariantProperties.map((key) => spell.system[key].enhanced)).to.deep.equal(
                        Array(7).fill(null)
                    );
                    expect(input(sheet!, "system.damage.base.stringInput").getAttribute("value")).to.equal("1W6");
                });
                for (const entry of entries) input(sheet, `system.${entry.enhanced}`).value = entry.override;
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();
                await passesEventually(() => {
                    for (const entry of entries)
                        expect(
                            foundryApi.utils.resolveProperty(spell, `system.${entry.enhanced}`),
                            entry.enhanced
                        ).to.equal(entry.override);
                });
                await sheet.close();
                sheet = spellSheet(spell);
                await sheet.render(true);

                for (const entry of entries) {
                    expect(input(sheet, `system.${entry.normal}`).value, entry.normal).to.equal(entry.value);
                    expect(input(sheet, `system.${entry.enhanced}`).value, entry.enhanced).to.equal(entry.override);
                }
            })
        );

        it(
            "clears all text overrides on form submission and inherits later normal changes",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                await spell.update({
                    "system.features.base.internalFeatureList": [{ name: "Scharf", value: 2 }],
                    "system.effectArea.base": "2 m Radius",
                    "system.effectDuration.base": "5 min",
                    "system.damage.enhanced.stringInput": "2W6",
                    "system.features.enhanced.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.range.enhanced": "20m",
                    "system.effectArea.enhanced": "4 m Radius",
                    "system.effectDuration.enhanced": "10 min",
                });
                sheet = spellSheet(spell);
                await sheet.render(true);
                const fields = [
                    { key: "damage", field: "damage.enhanced.stringInput" },
                    { key: "features", field: "features.enhanced.innateFeatures" },
                    { key: "range", field: "range.enhanced" },
                    { key: "effectArea", field: "effectArea.enhanced" },
                    { key: "effectDuration", field: "effectDuration.enhanced" },
                ] as const;

                for (const property of fields) input(sheet, `system.${property.field}`).value = "";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();
                await passesEventually(() => {
                    for (const property of fields)
                        expect(spell.system[property.key].enhanced, property.key).to.equal(null);
                });

                await spell.update({
                    "system.damage.base.stringInput": "3W6",
                    "system.features.base.internalFeatureList": [{ name: "Scharf", value: 4 }],
                    "system.range.base": "30m",
                    "system.effectArea.base": "6 m Radius",
                    "system.effectDuration.base": "15 min",
                });

                const values = spell.getValues({ enhanced: true });
                expect(values.damage.displayValue).to.equal("3W6");
                expect(values.features.innateFeatures).to.equal("Scharf 4");
                expect(values).to.include({ range: "30m", effectArea: "6 m Radius", effectDuration: "15 min" });
                await passesEventually(() => {
                    for (const property of fields)
                        expect(input(sheet!, `system.${property.field}`).value, property.key).to.equal(
                            foundryApi.utils.resolveProperty(
                                spell,
                                `system.${property.field.replace(".enhanced", ".base")}`
                            )
                        );
                });
            })
        );

        it(
            "saves normal sheet edits without freezing inherited fields",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                sheet = spellSheet(spell);
                await sheet.render(true);

                enter(sheet, "system.damage.base.stringInput", "3W6");

                await passesEventually(() => expect(spell.system.damage.base.displayValue).to.equal("3W6"));
                expect(spell.system.damage.enhanced).to.equal(null);
                expect(spell.system.damageType.enhanced).to.equal(null);
                await passesEventually(() =>
                    expect(input(sheet!, "system.damage.enhanced.stringInput").value).to.equal("3W6")
                );
            })
        );

        it(
            "keeps overrides through matching normal edits and resets a matching enhanced edit",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                sheet = spellSheet(spell);
                await sheet.render(true);

                enter(sheet, "system.damage.enhanced.stringInput", "2W6");
                await passesEventually(() => expect(spell.system.damage.enhanced?.displayValue).to.equal("2W6"));
                await passesEventually(() =>
                    expect(input(sheet!, "system.damage.enhanced.stringInput").getAttribute("value")).to.equal("2W6")
                );

                enter(sheet, "system.damage.base.stringInput", "2W6");
                await passesEventually(() => {
                    expect(spell.system.damage.base.displayValue).to.equal("2W6");
                    expect(input(sheet!, "system.damage.base.stringInput").getAttribute("value")).to.equal("2W6");
                });
                expect(spell.system.damage.enhanced?.displayValue, "a normal edit preserves the override").to.equal(
                    "2W6"
                );
                enter(sheet, "system.damage.base.stringInput", "3W6");
                await passesEventually(() => {
                    expect(spell.system.damage.base.displayValue).to.equal("3W6");
                    expect(input(sheet!, "system.damage.base.stringInput").getAttribute("value")).to.equal("3W6");
                });
                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("2W6");

                enter(sheet, "system.damage.enhanced.stringInput", "3W6");
                await passesEventually(() => expect(spell.system.damage.enhanced).to.equal(null));
                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("3W6");
                await spell.update({ "system.damage.base.stringInput": "4W6" });
                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("4W6");
            })
        );

        it(
            "keeps no-type selections distinct from inheritance and resets both dropdowns",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                sheet = spellSheet(spell);
                await sheet.render(true);

                input(sheet, "system.damageType.enhanced").value = "none";
                input(sheet, "system.costType.enhanced").value = "none";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();

                await passesEventually(() => {
                    expect(spell.system.damageType.enhanced).to.equal("none");
                    expect(spell.system.costType.enhanced).to.equal("none");
                    expect(input(sheet!, "system.damageType.enhanced").value).to.equal("none");
                    expect(input(sheet!, "system.costType.enhanced").value).to.equal("none");
                });
                expect(spell.system.damageType.base).to.equal("wind");
                expect(spell.system.costType.base).to.equal("V");

                input(sheet, "system.damageType.enhanced").value = "";
                input(sheet, "system.costType.enhanced").value = "V";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();
                await passesEventually(() => {
                    expect(spell.system.damageType.enhanced).to.equal(null);
                    expect(spell.system.costType.enhanced).to.equal(null);
                });
                await spell.update({ "system.damageType.base": "fire", "system.costType.base": "E" });

                expect(spell.getValues({ enhanced: true })).to.include({ damageType: "fire", costType: "E" });
                await passesEventually(() => {
                    expect(input(sheet!, "system.damageType.enhanced").value).to.equal("");
                    expect(input(sheet!, "system.costType.enhanced").value).to.equal("");
                });
            })
        );

        it(
            "saves an inherited-field override on form submission before a change event",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                sheet = spellSheet(spell);
                await sheet.render(true);
                input(sheet, "system.damage.enhanced.stringInput").value = "1W6+1";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");

                sheet.element.requestSubmit();

                await passesEventually(() => expect(spell.system.damage.enhanced?.displayValue).to.equal("1W6+1"));
                expect(spell.system.features.enhanced).to.equal(null);
                expect(spell.system.damageType.enhanced).to.equal(null);
            })
        );
    });

    describe("Enhanced spell chat actions", () => {
        const sandbox = sinon.createSandbox();
        let messageSpy: sinon.SinonSpy<[object], Promise<FoundryChatMessage>>;
        beforeEach(() => {
            messageSpy = sandbox.spy(foundryApi, "createChatMessage");
        });
        afterEach(async () => {
            const created = await Promise.allSettled(messageSpy.returnValues);
            sandbox.restore();
            await ChatMessage.deleteDocuments(
                created.flatMap((result) => (result.status === "fulfilled" ? [result.value.id] : []))
            );
        });

        it(
            "keeps sheet overrides for area and duration independent of normal edits and uses them in chat",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                await spell.update({ "system.effectArea.base": "2 m Radius", "system.effectDuration.base": "5 min" });
                sheet = spellSheet(spell);
                await sheet.render(true);
                input(sheet, "system.effectArea.enhanced").value = "4 m Radius";
                input(sheet, "system.effectDuration.enhanced").value = "10 min";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");

                sheet.element.requestSubmit();
                await passesEventually(() => {
                    expect(spell.system.effectArea.enhanced).to.equal("4 m Radius");
                    expect(spell.system.effectDuration.enhanced).to.equal("10 min");
                });
                await spell.update({ "system.effectArea.base": "3 m Radius", "system.effectDuration.base": "6 min" });
                const message = await postSpell(spell);

                expect(spellMessage(message).getData().spellValues).to.include({
                    enhanced: false,
                    effectArea: "3 m Radius",
                    effectDuration: "6 min",
                });
                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, message);

                expect(spellMessage(message).getData().spellValues).to.include({
                    enhanced: true,
                    effectArea: "4 m Radius",
                    effectDuration: "10 min",
                });
                expect(foundryApi.messages.get(message).content).to.contain("4 m Radius").and.to.contain("10 min");
            })
        );

        it(
            "selects and restores all seven spell properties independently on each chat card",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                await spell.update({
                    "system.damage.base.stringInput": "1W6",
                    "system.features.base.internalFeatureList": [{ name: "Scharf", value: 2 }],
                    "system.damageType.base": "wind",
                    "system.costType.base": "V",
                    "system.range.base": "10m",
                    "system.effectArea.base": "2 m Radius",
                    "system.effectDuration.base": "5 min",
                    "system.damage.enhanced.stringInput": "2W6",
                    "system.features.enhanced.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.damageType.enhanced": "fire",
                    "system.costType.enhanced": "K",
                    "system.range.enhanced": "20m",
                    "system.effectArea.enhanced": "4 m Radius",
                    "system.effectDuration.enhanced": "10 min",
                });
                const first = await postSpell(spell);
                const second = await postSpell(spell);

                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, first);

                const enhanced = spellMessage(first);
                expect(enhanced.damageHandler.totalDamage.principalComponent.damageRoll.getDamageFormula()).to.equal(
                    "2W6"
                );
                expect(enhanced.damageHandler.totalDamage.principalComponent.damageRoll.getFeatureString()).to.equal(
                    "Kritisch 3"
                );
                expect(enhanced.getData().spellValues).to.include({
                    enhanced: true,
                    features: "Kritisch 3",
                    damageType: "splittermond.damageTypes.long.fire",
                    costType: "splittermond.channeledDamage",
                    range: "20m",
                    effectArea: "4 m Radius",
                    effectDuration: "10 min",
                });
                const normal = spellMessage(second);
                const normalValues = normal.getData().spellValues;
                expect(normal.damageHandler.totalDamage.principalComponent.damageRoll.getDamageFormula()).to.equal(
                    "1W6"
                );
                expect(normal.damageHandler.totalDamage.principalComponent.damageRoll.getFeatureString()).to.equal(
                    "Scharf 2"
                );
                expect(normalValues).to.include({
                    enhanced: false,
                    features: "Scharf 2",
                    damageType: "splittermond.damageTypes.long.wind",
                    costType: "splittermond.normalDamage",
                    range: "10m",
                    effectArea: "2 m Radius",
                    effectDuration: "5 min",
                });
                expect(spell.system.damage.base.displayValue).to.equal("1W6");

                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, second);
                expect(
                    spellMessage(second).getData().spellValues,
                    "second card is enhanced before deselection"
                ).to.deep.equal(enhanced.getData().spellValues);
                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, second);

                const restored = spellMessage(second);
                expect(
                    restored.getData().spellValues,
                    "deselection restores all normal displayed properties"
                ).to.deep.equal(normalValues);
                expect(restored.damageHandler.totalDamage.principalComponent.damageRoll.getDamageFormula()).to.equal(
                    "1W6"
                );
                expect(restored.damageHandler.totalDamage.principalComponent.damageRoll.getFeatureString()).to.equal(
                    "Scharf 2"
                );

                await handleChatAction({ action: "applyDamage" }, first);
                await handleChatAction({ action: "applyDamage" }, second);

                const damageCategories = (await Promise.all(messageSpy.returnValues)).flatMap((message) =>
                    message instanceof SplittermondChatMessage && message.system instanceof DamageMessage
                        ? [
                              {
                                  damageType: message.system.damageEvent.implements[0].damageType,
                                  costType: message.system.damageEvent.costBase.costType,
                              },
                          ]
                        : []
                );
                expect(
                    damageCategories,
                    "damage messages use the enhanced and normal categories respectively"
                ).to.deep.equal([
                    { damageType: "fire", costType: "K" },
                    { damageType: "wind", costType: "V" },
                ]);
                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, first);
                expect(
                    spellMessage(first).focusCostHandler.spellEnhancement.checked,
                    "used damage locks the chosen variant"
                ).to.equal(true);
            })
        );

        it(
            "returns to normal values when enhancement is deselected before use",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                await spell.update({ "system.damage.enhanced.stringInput": "1W6+1" });
                const message = await postSpell(spell);
                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, message);
                expect(
                    spellMessage(message)
                        .damageHandler.totalDamage.principalComponent.damageRoll.getDamageFormula()
                        .replace(/ /g, "")
                ).to.equal("1W6+1");

                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, message);

                expect(
                    spellMessage(message).damageHandler.totalDamage.principalComponent.damageRoll.getDamageFormula()
                ).to.equal("1W6");
                expect(spellMessage(message).getData().spellValues.enhanced).to.equal(false);
            })
        );
    });
}

async function createSpell(actor: SplittermondActor, enhanced?: object): Promise<SplittermondSpellItem> {
    const [spell] = await actor.createEmbeddedDocuments("Item", [
        {
            name: "Scharfer Wind",
            type: "spell",
            system: {
                skill: "windmagic",
                costs: "4V1",
                enhancementCosts: "1EG/+1V1",
                damage: "1W6",
                damageType: "wind",
                costType: "V",
                range: "10m",
                ...(enhanced ? { enhanced } : {}),
            },
        },
    ]);
    if (!(spell instanceof SplittermondSpellItem)) throw new Error("Spell document was not initialized");
    return spell;
}

function spellSheet(spell: SplittermondSpellItem): SplittermondSpellSheet {
    const sheet = spell.sheet;
    if (!(sheet instanceof SplittermondSpellSheet))
        throw new Error("Foundry did not select the registered spell sheet");
    return sheet;
}

function input(sheet: SplittermondSpellSheet, name: string): HTMLInputElement | HTMLSelectElement {
    const element = sheet.element.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
    if (!element) throw new Error(`Missing spell input ${name}`);
    return element;
}

function enter(sheet: SplittermondSpellSheet, name: string, value: string) {
    const element = input(sheet, name);
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
}

async function postSpell(spell: SplittermondSpellItem): Promise<string> {
    const message = SplittermondChatCard.create(
        spell.actor,
        SpellRollMessage.initialize(spell, {
            roll: { total: 35, dice: [{ total: 18 }], tooltip: "" },
            skill: {
                id: spell.skill.id,
                points: 6,
                attributes: {
                    [spell.skill.attribute1.id]: spell.skill.attribute1.value,
                    [spell.skill.attribute2.id]: spell.skill.attribute2.value,
                },
            },
            modifierElements: [],
            hideDifficulty: false,
            rollType: "standard",
            succeeded: true,
            degreeOfSuccess: { fromRoll: 5, modification: 0, limitedTo: 999 },
            difficulty: 20,
            defenseType: null,
            isFumble: false,
            isCrit: false,
            degreeOfSuccessMessage: "",
            maneuvers: [],
        }),
        { blind: false, rolls: [], whisper: [], type: "spellRollMessage", style: 0 }
    );
    await message.sendToChat();
    if (!message.messageId) throw new Error("Spell chat message was not persisted");
    return message.messageId;
}

function spellMessage(id: string): SpellRollMessage {
    const message = foundryApi.messages.get(id);
    if (!(message instanceof SplittermondChatMessage) || !(message.system instanceof SpellRollMessage))
        throw new Error("Missing spell chat message");
    return message.system;
}
