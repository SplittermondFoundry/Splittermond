import { foundryApi } from "module/api/foundryApi";
import { splittermond } from "module/config";
import { MasteryDataModel } from "module/item/dataModel/MasteryDataModel";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import SplittermondSpellItem from "module/item/spell";
import { itemCreator } from "module/data/EntityCreator";
import ItemImporter from "module/util/item-importer";
import * as Machtexplosion from "../resources/importSamples/GRW/spells/Machtexplosion.resource";
import sinon from "sinon";
import type { QuenchBatchContext } from "@ethaks/fvtt-quench";

import { itemTypes } from "module/config/itemTypes";
import { withActor } from "./fixtures";
import type SplittermondItem from "module/item/item";
import SplittermondWeaponSheet from "module/item/sheets/weapon-sheet";
import { passesEventually } from "../util";
import type SplittermondWeaponItem from "module/item/weapon";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import SplittermondSpellSheet from "module/item/sheets/spell-sheet";
import type SplittermondEquipmentItem from "module/item/equipment";

declare const Item: any;
declare const game: any;

export function itemTest(this: any, context: QuenchBatchContext) {
    const { describe, it, expect, afterEach } = context;
    describe("foundry API compatibility", () => {
        it(
            "has an actor attached if on an actor",
            withActor(async (actor) => {
                await actor.createEmbeddedDocuments("Item", [
                    {
                        name: "Test Item",
                        type: "spell",
                        system: {},
                    },
                ]);
                const underTest = actor.items.find(() => true); //get first item

                expect(underTest!.actor, "Item defines actor").to.equal(actor);
            })
        );

        it("can create a new mastery item", async () => {
            let itemData = {
                type: "mastery",
                name: "Supermastery",
                folder: null,
                system: {
                    skill: "deathmagic",
                    availableIn: "deathmagic 1",
                    level: 1,
                    modifier: splittermond.modifier["arcanespeed"],
                    description: "abc",
                    isGrandmaster: false,
                    isManeuver: false,
                    source: "",
                },
            };
            const item = await foundryApi.createItem(itemData);

            expect(item.system).to.deep.equal(itemData.system);
            expect(item.system).to.be.instanceOf(MasteryDataModel);
            expect(item.name).to.equal(itemData.name);
            expect(item.type).to.equal(itemData.type);

            await Item.deleteDocuments([item.id]);
        });

        it("can create a new spell item", async () => {
            let itemData = {
                type: "spell",
                name: "Megaspell",
                folder: null,
                system: {
                    skill: "deathmagic",
                    availableIn: "deathmagic 1",
                    castDuration: { value: 5, unit: "min" },
                    costs: "5000V5000",
                    skillLevel: 6,
                    description: "abc",
                    damage: {
                        stringInput: "500d10+200",
                    },
                    damageType: "physical",
                    costType: "V",
                    effectArea: "50km²",
                    enhancementDescription: "Obliterates everything",
                    enhancementCosts: "1",
                    degreeOfSuccessOptions: {
                        castDuration: false,
                        consumedFocus: false,
                        exhaustedFocus: false,
                        channelizedFocus: false,
                        effectDuration: false,
                        damage: false,
                        range: false,
                        effectArea: false,
                    },
                    difficulty: "",
                    effectDuration: "",
                    spellType: "",
                    features: {
                        internalFeatureList: [],
                    },
                    range: "",
                    source: "",
                },
            };
            const item = await foundryApi.createItem(itemData);

            expect(item).to.be.instanceOf(SplittermondSpellItem);
            expect(item.name).to.equal(itemData.name);
            expect(item.type).to.equal(itemData.type);
            expect(item.system).to.be.instanceOf(SpellDataModel);
            expect(item.system.toObject()).to.deep.equal(itemData.system);

            await Item.deleteDocuments([item.id]);
        });
    });
    describe("import test", () => {
        const sandbox = sinon.createSandbox();
        afterEach(() => sandbox.restore());

        it("can import a spell", async () => {
            sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve(""));
            sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            const itemCreatorSpy = sandbox.spy(itemCreator, "createSpell");

            const probe = sandbox.createStubInstance(ClipboardEvent);
            sandbox.stub(probe, "clipboardData").get(() => ({ getData: () => Machtexplosion.input }));
            await ItemImporter.pasteEventhandler(probe);

            const item = await itemCreatorSpy.lastCall.returnValue;
            const expectedItemSystem = {
                ...Machtexplosion.expected.system,
                features: {
                    _document: null,
                    internalFeatureList: Machtexplosion.expected.system.features.internalFeatureList,
                    triedToFindDocument: false,
                },
            };
            expect(item.system).to.deep.equal(expectedItemSystem);
            expect("img" in item && item.img).to.equal("icons/svg/daze.svg");

            await Item.deleteDocuments([item.id]);
        });
    });

    describe("item type completeness", () => {
        itemTypes.forEach((itemType) => {
            it(`itemType is present in item data models config '${itemType}'`, () => {
                expect(CONFIG.Item.dataModels).to.have.property(itemType);
            });
        });

        Object.keys(CONFIG.Item.dataModels).forEach((itemType) => {
            it(`Item data models key exists in item Type '${itemType}'`, () => {
                expect(itemTypes).to.contain(itemType);
            });
        });
    });

    describe("item sheet save operation", () => {
        let items: SplittermondItem[] = [];

        async function createItem(type: string) {
            const item = (await foundryApi.createItem({ type, name: "Test Item", system: {} })) as SplittermondItem;
            items.push(item);
            return item;
        }
        afterEach(() => {
            Item.deleteDocuments(items.map((i) => i.id));
            items = [];
        });

        async function enterInSheet(sheet: SplittermondItemSheet, inputName: string, value: string) {
            await sheet.render(true);
            const featureInput = sheet.element.querySelector(`input[name='${inputName}']`) as HTMLInputElement | null;
            expect(featureInput, "Feature input found").to.not.be.null;
            featureInput!.value = value;
            featureInput!.dispatchEvent(new Event("input", { bubbles: true }));
            featureInput!.dispatchEvent(new Event("change", { bubbles: true }));
            sheet.close();
        }

        it("should save secondaryAttack features", async () => {
            const item = (await createItem("weapon")) as SplittermondWeaponItem;
            const sheet = new SplittermondWeaponSheet({ document: item });

            await enterInSheet(sheet, "system.secondaryAttack.features.innateFeatures", "Ablenkend");

            await passesEventually(
                () => expect(item.system.secondaryAttack!.features.innateFeatures).to.equal("Ablenkend"),
                1000,
                100
            );
        });

        it("should save weapon features", async () => {
            const item = (await createItem("weapon")) as SplittermondWeaponItem;
            const sheet = new SplittermondWeaponSheet({ document: item });

            await enterInSheet(sheet, "system.features.innateFeatures", "Ablenkend");

            await passesEventually(() => expect(item.system.features.innateFeatures).to.equal("Ablenkend"), 1000, 100);
        });

        it("should save cast duration", async () => {
            const item = (await createItem("spell")) as SplittermondSpellItem;
            const sheet = new SplittermondSpellSheet({ document: item });

            await enterInSheet(sheet, "system.castDuration.innateDuration", "20 T");

            await passesEventually(() => expect(item.system.castDuration.inTicks).to.equal(20), 1000, 100);
        });

        it("should save when numeric values are incremented", async () => {
            const item = (await createItem("equipment")) as SplittermondEquipmentItem;
            await item.update({ system: { quantity: 1 } });
            const sheet = new SplittermondItemSheet({ document: item });

            await sheet.render(true);
            const featureInput = sheet.element.querySelector(
                `input[name='system.quantity']`
            ) as HTMLInputElement | null;
            expect(featureInput, "Feature input found").to.not.be.null;

            featureInput?.parentElement
                ?.querySelector("button[data-action='inc-value']")
                ?.dispatchEvent(new PointerEvent("click", { bubbles: true }));
            sheet.close();

            expect(featureInput?.valueAsNumber, "Input was updated").to.equal(2);
            await passesEventually(() => expect(item.system.quantity).to.equal(2), 1000, 100);
        });

        it("should save when numeric values are incremented", async () => {
            const item = (await createItem("equipment")) as SplittermondEquipmentItem;
            await item.update({ system: { quantity: 2 } });
            const sheet = new SplittermondItemSheet({ document: item });

            await sheet.render(true);
            const featureInput = sheet.element.querySelector(
                `input[name='system.quantity']`
            ) as HTMLInputElement | null;
            expect(featureInput, "Feature input found").to.not.be.null;

            featureInput?.parentElement
                ?.querySelector("button[data-action='dec-value']")
                ?.dispatchEvent(new PointerEvent("click", { bubbles: true }));
            sheet.close();

            expect(featureInput?.valueAsNumber, "Input was updated").to.equal(1);
            await passesEventually(() => expect(item.system.quantity).to.equal(1), 1000, 100);
        });
    });
}
