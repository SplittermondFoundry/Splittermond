import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withScene } from "../fixtures";
import { foundryApi } from "module/api/foundryApi";
import { BaseActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { SplittermondBaseActorSheet, SplittermondBaseItemSheet } from "module/data/SplittermondApplication";

declare const foundry: any;
declare const canvas: any;
declare const DocumentSheetConfig: {
    getSheetClassesForSubType(documentName: string, subType: string): { sheetClasses: Record<string, string> };
};
const mergeObject = foundry.utils.mergeObject;

export function apiUtilsTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("mergeObject", () => {
        it("should not insert new keys when insertKeys is false", () => {
            const result = mergeObject({ k1: "v1" }, { k2: "v2" }, { insertKeys: false });
            expect(result).to.deep.equal({ k1: "v1" });
        });

        it("should insert new keys when insertKeys is true", () => {
            const result = mergeObject({ k1: "v1" }, { k2: "v2" }, { insertKeys: true });
            expect(result).to.deep.equal({ k1: "v1", k2: "v2" });
        });

        it("should not insert new values when insertValues is false", () => {
            const result = mergeObject({ k1: { i1: "v1" } }, { k1: { i2: "v2" } }, { insertValues: false });
            expect(result).to.deep.equal({ k1: { i1: "v1" } });
        });

        it("should insert new values when insertValues is true", () => {
            const result = mergeObject({ k1: { i1: "v1" } }, { k1: { i2: "v2" } }, { insertValues: true });
            expect(result).to.deep.equal({ k1: { i1: "v1", i2: "v2" } });
        });

        it("should overwrite existing values when overwrite is true", () => {
            const result = mergeObject({ k1: "v1" }, { k1: "v2" }, { overwrite: true });
            expect(result).to.deep.equal({ k1: "v2" });
        });

        it("should not overwrite existing values when overwrite is false", () => {
            const result = mergeObject({ k1: "v1" }, { k1: "v2" }, { overwrite: false });
            expect(result).to.deep.equal({ k1: "v1" });
        });

        it("should not merge recursively when recursive is false", () => {
            const result = mergeObject({ k1: { i1: "v1" } }, { k1: { i2: "v2" } }, { recursive: false });
            expect(result).to.deep.equal({ k1: { i2: "v2" } });
        });

        it("should merge recursively when recursive is true", () => {
            const result = mergeObject({ k1: { i1: "v1" } }, { k1: { i2: "v2" } }, { recursive: true });
            expect(result).to.deep.equal({ k1: { i1: "v1", i2: "v2" } });
        });

        it("should perform deletions when applyOperators is true", () => {
            const result = mergeObject(
                { k1: "v1", k2: "v2" },
                { k1: new foundry.data.operators.ForcedDeletion() },
                { applyOperators: true }
            );
            expect(result).to.deep.equal({ k2: "v2" });
        });

        it("should not perform deletions when applyOperators is false", () => {
            const del = new foundry.data.operators.ForcedDeletion();
            const result = mergeObject({ k1: "v1", k2: "v2" }, { k1: del }, { applyOperators: false });
            expect(result).to.deep.equal({ k1: del, k2: "v2" });
        });

        it("should enforce types when enforceTypes is true", () => {
            expect(() => mergeObject({ k1: 1 }, { k1: "v2" }, { enforceTypes: true })).to.throw();
        });

        it("should not enforce types when enforceTypes is false", () => {
            const result = mergeObject({ k1: 1 }, { k1: "v2" }, { enforceTypes: false });
            expect(result).to.deep.equal({ k1: "v2" });
        });

        it("should apply updates in-place when inplace is true", () => {
            const original = { k1: "v1" };
            const result = mergeObject(original, { k2: "v2" }, { inplace: true });
            expect(result).to.equal(original);
            expect(result).to.deep.equal({ k1: "v1", k2: "v2" });
        });

        it("should not apply updates in-place when inplace is false", () => {
            const original = { k1: "v1" };
            const result = mergeObject(original, { k2: "v2" }, { inplace: false });
            expect(result).to.not.equal(original);
            expect(result).to.deep.equal({ k1: "v1", k2: "v2" });
        });
    });

    describe("fromUUID", () => {
        let items: Item[] = [];

        afterEach(async () => {
            await Item.deleteDocuments(items.map((item) => item.id));
            items = [];
        });

        async function createItem(data: object) {
            const item = (await Item.create(data)) as Item;
            items.push(item);
            return item;
        }

        it("fromUUID returns document", async () => {
            const item = await createItem({
                name: "Test Item",
                type: "mastery",
                system: {
                    availableIn: "endurance, strength",
                },
            });

            const uuid = item.uuid;

            const foundItem = await foundry.utils.fromUuid(uuid);

            expect(foundItem).to.be.instanceOf(Item);
            expect(foundItem.name).to.equal(item.name);
        });

        it("from UUIDSync returns document", async () => {
            const item = await createItem({
                name: "Test Item",
                type: "mastery",
                system: {
                    availableIn: "endurance, strength",
                },
            });

            const uuid = item.uuid;

            const foundItem = foundry.utils.fromUuidSync(uuid);

            expect(foundItem).to.be.instanceOf(Item);
            expect(foundItem.name).to.equal(item.name);
        });
    });

    it("deepClone clones deeply", () => {
        const probe = {
            topLevel: { secondLevel: "value2", deleteMe: "" },
            next: "value",
        };
        const clone = foundry.utils.deepClone(probe);
        delete clone.topLevel.deleteMe;
        expect(probe.topLevel).to.have.property("deleteMe");
    });

    it(
        "should have a canvas with an anmiate pan function",
        withScene(async () => {
            expect(canvas).to.have.property("animatePan").that.is.a("function");
            expect(await canvas.animatePan()).to.be.a("boolean");
        })
    );

    it("should have a text enricher", async () => {
        const text = await foundryApi.utils.enrichHtml("Some <strong>bold</strong> text");
        expect(text).to.contain("<strong>bold</strong>");
    });

    it("should have a property resolver", () => {
        const value = foundryApi.utils.resolveProperty({ a: { b: "value" } }, "a.b");
        expect(value).to.equal("value");
    });

    it("should build form data", () => {
        const form = document.createElement("form");
        const input = document.createElement("input");
        input.name = "testKey";
        input.value = "testValue";
        form.appendChild(input);

        const formData = foundryApi.utils.buildFormData(form);

        expect(typeof formData).to.equal("object");
        expect(formData.object).to.have.property("testKey", "testValue");
    });

    describe("Sheet Registration", () => {
        // Bundled class names can collide with the system's registered sheets.
        const scope = "splittermond-quench";
        class TestItemSheet extends SplittermondBaseItemSheet {}
        class TestActorSheet extends SplittermondBaseActorSheet {}
        class TestActiveEffectSheet extends BaseActiveEffectConfig {}

        it("registers and unregisters an item sheet", () => {
            foundryApi.sheets.items.register(scope, TestItemSheet, {
                types: ["projectile"],
                makeDefault: false,
            });

            try {
                expect(
                    DocumentSheetConfig.getSheetClassesForSubType("Item", "projectile").sheetClasses
                ).to.have.property(scope + "." + TestItemSheet.name);
            } finally {
                foundryApi.sheets.items.unregister(scope, TestItemSheet);
            }

            expect(
                DocumentSheetConfig.getSheetClassesForSubType("Item", "projectile").sheetClasses
            ).not.to.have.property(scope + "." + TestItemSheet.name);
        });

        it("registers and unregisters an actor sheet", () => {
            foundryApi.sheets.actors.register(scope, TestActorSheet, {
                types: ["npc"],
                makeDefault: false,
            });

            try {
                expect(DocumentSheetConfig.getSheetClassesForSubType("Actor", "npc").sheetClasses).to.have.property(
                    scope + "." + TestActorSheet.name
                );
            } finally {
                foundryApi.sheets.actors.unregister(scope, TestActorSheet);
            }
            expect(DocumentSheetConfig.getSheetClassesForSubType("Actor", "npc").sheetClasses).not.to.have.property(
                scope + "." + TestActorSheet.name
            );
        });

        it("registers and unregisters an active effect sheet", () => {
            foundryApi.sheets.activeEffects.register(scope, TestActiveEffectSheet, {
                types: ["base"],
                makeDefault: false,
            });

            try {
                expect(
                    DocumentSheetConfig.getSheetClassesForSubType("ActiveEffect", "base").sheetClasses
                ).to.have.property(scope + "." + TestActiveEffectSheet.name);
            } finally {
                foundryApi.sheets.activeEffects.unregister(scope, TestActiveEffectSheet);
            }
            expect(
                DocumentSheetConfig.getSheetClassesForSubType("ActiveEffect", "base").sheetClasses
            ).not.to.have.property(scope + "." + TestActiveEffectSheet.name);
        });
    });
}
