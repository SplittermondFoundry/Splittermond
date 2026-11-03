import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";
import type SplittermondActor from "module/actor/actor";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondSpellItem from "module/item/spell";
import SplittermondSpellSheet from "module/item/sheets/spell-sheet";
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
                expect(Object.values(spell.system.enhanced)).to.deep.equal(Array(7).fill(null));

                await spell.update({
                    "system.damage.stringInput": "3W6",
                    "system.range": "20m",
                    "system.effectArea": "2 m Radius",
                    "system.effectDuration": "5 min",
                });

                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("3W6");
                expect(spell.getValues({ enhanced: true })).to.include({
                    range: "20m",
                    effectArea: "2 m Radius",
                    effectDuration: "5 min",
                });
                if (!(spell.system instanceof SpellDataModel)) throw new Error("Missing spell data model");
                const restored = new SpellDataModel(spell.system.toObject());
                expect(Object.values(restored.enhanced)).to.deep.equal(Array(7).fill(null));
            })
        );

        it(
            "keeps mixed enhanced overrides while other properties inherit later normal updates",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                await spell.update({
                    "system.features.internalFeatureList": [{ name: "Scharf", value: 2 }],
                    "system.effectArea": "2 m Radius",
                    "system.effectDuration": "5 min",
                    "system.enhanced.damage.stringInput": "2W6",
                    "system.enhanced.range.value": "20m",
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
                    "system.damage.stringInput": "3W6",
                    "system.features.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.damageType": "fire",
                    "system.costType": "E",
                    "system.range": "30m",
                    "system.effectArea": "4 m Radius",
                    "system.effectDuration": "10 min",
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
                expect(
                    spell.system.enhanced,
                    "inherited properties remain unset rather than becoming copies"
                ).to.include({
                    features: null,
                    damageType: null,
                    costType: null,
                    effectArea: null,
                    effectDuration: null,
                });
            })
        );

        it(
            "round-trips nested overrides and preserves them during unrelated partial updates",
            withActor(async (actor) => {
                const spell = await createSpell(actor);

                await spell.update({
                    "system.enhanced.damage.stringInput": "2W6",
                    "system.enhanced.features.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.enhanced.damageType.value": null,
                    "system.enhanced.costType.value": "K",
                    "system.enhanced.range.value": "",
                });
                await spell.update({ "system.description": "Unrelated update", "system.damage.stringInput": "4W6" });

                expect(spell.system.enhanced.features?.document, "nested features retain their owning item").to.equal(
                    spell
                );
                if (!(spell.system instanceof SpellDataModel)) throw new Error("Missing spell data model");
                const restored = new SpellDataModel(spell.system.toObject());
                expect(restored.enhanced.damage).to.be.instanceOf(DamageModel);
                expect(restored.enhanced.damage?.displayValue).to.equal("2W6");
                expect(restored.enhanced.features).to.be.instanceOf(ItemFeaturesModel);
                expect(restored.enhanced.features?.featureValue("Kritisch")).to.equal(3);
                expect(restored.enhanced.damageType).to.deep.equal({ value: null });
                expect(restored.enhanced.costType).to.deep.equal({ value: "K" });
                expect(restored.enhanced.range).to.deep.equal({ value: "" });
                expect(restored.enhanced.effectArea).to.equal(null);
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

                await spell.update({ "system.effectArea": "2 m Radius" });

                expect(spell.system.enhanced.range).to.deep.equal({ value: "20m" });
                expect(spell.system.enhanced.effectArea).to.equal(null);
                expect(spell.getValues({ enhanced: true })).to.include({
                    range: "20m",
                    effectArea: "2 m Radius",
                    effectDuration: "10 min",
                });
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
                    { normal: "damage.stringInput", enhanced: "damage.stringInput", value: "1W6", override: "2W6" },
                    {
                        normal: "features.innateFeatures",
                        enhanced: "features.innateFeatures",
                        value: "Scharf 2",
                        override: "Kritisch 3",
                    },
                    { normal: "damageType", enhanced: "damageType.value", value: "wind", override: "fire" },
                    { normal: "costType", enhanced: "costType.value", value: "V", override: "E" },
                    { normal: "range", enhanced: "range.value", value: "10m", override: "20m" },
                    { normal: "effectArea", enhanced: "effectArea.value", value: "2 m Radius", override: "4 m Radius" },
                    { normal: "effectDuration", enhanced: "effectDuration.value", value: "5 min", override: "10 min" },
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
                    expect(Object.values(spell.system.enhanced)).to.deep.equal(Array(7).fill(null));
                    expect(input(sheet!, "system.damage.stringInput").getAttribute("value")).to.equal("1W6");
                });
                for (const entry of entries) input(sheet, `system.enhanced.${entry.enhanced}`).value = entry.override;
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();
                await passesEventually(() => {
                    for (const entry of entries)
                        expect(
                            foundryApi.utils.resolveProperty(spell, `system.enhanced.${entry.enhanced}`),
                            entry.enhanced
                        ).to.equal(entry.override);
                });
                await sheet.close();
                sheet = spellSheet(spell);
                await sheet.render(true);

                for (const entry of entries) {
                    expect(input(sheet, `system.${entry.normal}`).value, entry.normal).to.equal(entry.value);
                    expect(input(sheet, `system.enhanced.${entry.enhanced}`).value, entry.enhanced).to.equal(
                        entry.override
                    );
                }
            })
        );

        it(
            "clears all text overrides on form submission and inherits later normal changes",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                await spell.update({
                    "system.features.internalFeatureList": [{ name: "Scharf", value: 2 }],
                    "system.effectArea": "2 m Radius",
                    "system.effectDuration": "5 min",
                    "system.enhanced.damage.stringInput": "2W6",
                    "system.enhanced.features.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.enhanced.range.value": "20m",
                    "system.enhanced.effectArea.value": "4 m Radius",
                    "system.enhanced.effectDuration.value": "10 min",
                });
                sheet = spellSheet(spell);
                await sheet.render(true);
                const fields = [
                    { key: "damage", field: "damage.stringInput" },
                    { key: "features", field: "features.innateFeatures" },
                    { key: "range", field: "range.value" },
                    { key: "effectArea", field: "effectArea.value" },
                    { key: "effectDuration", field: "effectDuration.value" },
                ] as const;

                for (const property of fields) input(sheet, `system.enhanced.${property.field}`).value = "";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();
                await passesEventually(() => {
                    for (const property of fields)
                        expect(spell.system.enhanced[property.key], property.key).to.equal(null);
                });

                await spell.update({
                    "system.damage.stringInput": "3W6",
                    "system.features.internalFeatureList": [{ name: "Scharf", value: 4 }],
                    "system.range": "30m",
                    "system.effectArea": "6 m Radius",
                    "system.effectDuration": "15 min",
                });

                const values = spell.getValues({ enhanced: true });
                expect(values.damage.displayValue).to.equal("3W6");
                expect(values.features.innateFeatures).to.equal("Scharf 4");
                expect(values).to.include({ range: "30m", effectArea: "6 m Radius", effectDuration: "15 min" });
                await passesEventually(() => {
                    for (const property of fields)
                        expect(input(sheet!, `system.enhanced.${property.field}`).value, property.key).to.equal(
                            foundryApi.utils.resolveProperty(spell, `system.${property.field.replace(/\.value$/, "")}`)
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

                enter(sheet, "system.damage.stringInput", "3W6");

                await passesEventually(() => expect(spell.system.damage.displayValue).to.equal("3W6"));
                expect(spell.system.enhanced.damage).to.equal(null);
                expect(spell.system.enhanced.damageType).to.equal(null);
                await passesEventually(() =>
                    expect(input(sheet!, "system.enhanced.damage.stringInput").value).to.equal("3W6")
                );
            })
        );

        it(
            "keeps overrides through matching normal edits and resets a matching enhanced edit",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                sheet = spellSheet(spell);
                await sheet.render(true);

                enter(sheet, "system.enhanced.damage.stringInput", "2W6");
                await passesEventually(() => expect(spell.system.enhanced.damage?.displayValue).to.equal("2W6"));
                await passesEventually(() =>
                    expect(input(sheet!, "system.enhanced.damage.stringInput").getAttribute("value")).to.equal("2W6")
                );

                enter(sheet, "system.damage.stringInput", "2W6");
                await passesEventually(() => {
                    expect(spell.system.damage.displayValue).to.equal("2W6");
                    expect(input(sheet!, "system.damage.stringInput").getAttribute("value")).to.equal("2W6");
                });
                expect(spell.system.enhanced.damage?.displayValue, "a normal edit preserves the override").to.equal(
                    "2W6"
                );
                enter(sheet, "system.damage.stringInput", "3W6");
                await passesEventually(() => {
                    expect(spell.system.damage.displayValue).to.equal("3W6");
                    expect(input(sheet!, "system.damage.stringInput").getAttribute("value")).to.equal("3W6");
                });
                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("2W6");

                enter(sheet, "system.enhanced.damage.stringInput", "3W6");
                await passesEventually(() => expect(spell.system.enhanced.damage).to.equal(null));
                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("3W6");
                await spell.update({ "system.damage.stringInput": "4W6" });
                expect(spell.getValues({ enhanced: true }).damage.displayValue).to.equal("4W6");
            })
        );

        it(
            "keeps no-type selections distinct from inheritance and resets both dropdowns",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                sheet = spellSheet(spell);
                await sheet.render(true);

                input(sheet, "system.enhanced.damageType.value").value = "null";
                input(sheet, "system.enhanced.costType.value").value = "null";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();

                await passesEventually(() => {
                    expect(spell.system.enhanced.damageType).to.deep.equal({ value: null });
                    expect(spell.system.enhanced.costType).to.deep.equal({ value: null });
                    expect(input(sheet!, "system.enhanced.damageType.value").value).to.equal("null");
                    expect(input(sheet!, "system.enhanced.costType.value").value).to.equal("null");
                });
                expect(spell.system.damageType).to.equal("wind");
                expect(spell.system.costType).to.equal("V");

                input(sheet, "system.enhanced.damageType.value").value = "";
                input(sheet, "system.enhanced.costType.value").value = "V";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");
                sheet.element.requestSubmit();
                await passesEventually(() => {
                    expect(spell.system.enhanced.damageType).to.equal(null);
                    expect(spell.system.enhanced.costType).to.equal(null);
                });
                await spell.update({ "system.damageType": "fire", "system.costType": "E" });

                expect(spell.getValues({ enhanced: true })).to.include({ damageType: "fire", costType: "E" });
                await passesEventually(() => {
                    expect(input(sheet!, "system.enhanced.damageType.value").value).to.equal("");
                    expect(input(sheet!, "system.enhanced.costType.value").value).to.equal("");
                });
            })
        );

        it(
            "saves an inherited-field override on form submission before a change event",
            withActor(async (actor) => {
                const spell = await createSpell(actor);
                sheet = spellSheet(spell);
                await sheet.render(true);
                input(sheet, "system.enhanced.damage.stringInput").value = "1W6+1";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");

                sheet.element.requestSubmit();

                await passesEventually(() => expect(spell.system.enhanced.damage?.displayValue).to.equal("1W6+1"));
                expect(spell.system.enhanced.features).to.equal(null);
                expect(spell.system.enhanced.damageType).to.equal(null);
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
                await spell.update({ "system.effectArea": "2 m Radius", "system.effectDuration": "5 min" });
                sheet = spellSheet(spell);
                await sheet.render(true);
                input(sheet, "system.enhanced.effectArea.value").value = "4 m Radius";
                input(sheet, "system.enhanced.effectDuration.value").value = "10 min";
                if (!(sheet.element instanceof HTMLFormElement)) throw new Error("Spell sheet is not a form");

                sheet.element.requestSubmit();
                await passesEventually(() =>
                    expect(spell.system.enhanced).to.deep.include({
                        effectArea: { value: "4 m Radius" },
                        effectDuration: { value: "10 min" },
                    })
                );
                await spell.update({ "system.effectArea": "3 m Radius", "system.effectDuration": "6 min" });
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
                    "system.damage.stringInput": "1W6",
                    "system.features.internalFeatureList": [{ name: "Scharf", value: 2 }],
                    "system.damageType": "wind",
                    "system.costType": "V",
                    "system.range": "10m",
                    "system.effectArea": "2 m Radius",
                    "system.effectDuration": "5 min",
                    "system.enhanced.damage.stringInput": "2W6",
                    "system.enhanced.features.internalFeatureList": [{ name: "Kritisch", value: 3 }],
                    "system.enhanced.damageType.value": "fire",
                    "system.enhanced.costType.value": "K",
                    "system.enhanced.range.value": "20m",
                    "system.enhanced.effectArea.value": "4 m Radius",
                    "system.enhanced.effectDuration.value": "10 min",
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
                expect(spell.system.damage.displayValue).to.equal("1W6");

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
                await spell.update({ "system.enhanced.damage.stringInput": "1W6+1" });
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
