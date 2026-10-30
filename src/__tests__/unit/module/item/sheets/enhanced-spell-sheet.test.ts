import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import SplittermondSpellSheet from "module/item/sheets/spell-sheet";
import SplittermondSpellItem from "module/item/spell";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import { DamageModel } from "module/item/dataModel/propertyModels/DamageModel";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { CastDurationModel } from "module/item/dataModel/propertyModels/CastDurationModel";
import { getSpellAvailabilityParser } from "module/item/availabilityParser";
import { splittermond } from "module/config";
import { foundryApi } from "module/api/foundryApi";
import { SplittermondBaseItemSheet } from "module/data/SplittermondApplication";
import { createHtml } from "../../../../handlebarHarness";

class SpellSheet extends SplittermondSpellSheet {
    properties() {
        return this._getItemProperties();
    }
}

describe("Enhanced spell property form", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        sandbox.stub(foundryApi.utils, "deepClone").callsFake((data) => structuredClone(data));
        sandbox.define(
            SplittermondBaseItemSheet.prototype,
            "_prepareSubmitData",
            (_event: SubmitEvent, _form: HTMLFormElement, data: { object: Record<string, unknown> }) => data.object
        );
    });
    afterEach(() => sandbox.restore());

    function setup() {
        const parser = getSpellAvailabilityParser({ localize: (key) => key }, ["windmagic"]);
        const spell = new SplittermondSpellItem({}, { splittermond: { ready: true } }, parser);
        spell.type = "spell";
        spell.system = sandbox.createStubInstance(SpellDataModel);
        Object.assign(spell.system, {
            skill: "windmagic",
            skillLevel: 0,
            availableIn: "windmagic 0",
            spellType: "Schaden",
            costs: "1",
            difficulty: "KW",
            enhancementCosts: "1EG/+1V1",
            enhancementDescription: "",
            castDuration: CastDurationModel.from("1T"),
            damage: DamageModel.from("1W6"),
            features: ItemFeaturesModel.from("Scharf 2"),
            damageType: "wind",
            costType: "V",
            range: "10m",
            effectArea: "2 m Radius",
            effectDuration: "5 min",
            enhanced: {
                damage: null,
                features: null,
                damageType: null,
                costType: null,
                range: null,
                effectArea: null,
                effectDuration: null,
            },
        });
        const resolveProperty = (source: object, path: string) =>
            path
                .split(".")
                .reduce<unknown>(
                    (value, key) => (value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined),
                    source
                );
        const sheet = new SpellSheet(
            { document: spell },
            resolveProperty,
            { localize: (key) => key },
            splittermond,
            async (text: string) => text,
            parser
        );
        return { spell, sheet };
    }

    it("keeps availability first and cast duration outside the seven comparison rows", async () => {
        const { sheet } = setup();

        const groups = await sheet.properties();

        expect(groups[0].properties.map((property) => property.field)).to.deep.equal([
            "availableIn",
            "system.skill",
            "system.skillLevel",
            "system.spellType",
            "system.costs",
            "system.enhancementCosts",
            "system.difficulty",
            "system.castDuration.innateDuration",
        ]);
        expect(groups[1].properties).to.have.length(7);
        expect(groups[1].properties.map((property) => property.comparison?.value)).to.deep.equal([
            "1W6",
            "Scharf 2",
            "",
            "",
            "10m",
            "2 m Radius",
            "5 min",
        ]);
    });

    it("renders explicit no-type choices independently of inherited damage", async () => {
        const { spell, sheet } = setup();
        spell.system.enhanced.damageType = { value: null };

        const groups = await sheet.properties();
        const property = groups[1].properties.find((property) => property.field === "system.damageType")!;

        expect(property.comparison?.value).to.equal("null");
        expect(property.comparison?.inherited).to.equal(false);
        expect(property.comparison?.choices).to.include({ "": "splittermond.spellValues.inherit" });
    });

    it("does not turn displayed inherited values into overrides when a normal field changes", async () => {
        const { sheet } = setup();
        const data = {
            "system.damage.stringInput": "3W6",
            "system.enhanced.damage.stringInput": "1W6",
            "system.enhanced.damageType.value": "wind",
        };

        const result = await submitChange(sheet, "system.damage.stringInput", data);

        expect(result).to.deep.equal({ "system.damage.stringInput": "3W6" });
    });

    it("submits only the edited inherited field as an override", async () => {
        const { sheet } = setup();
        const data = { "system.enhanced.damage.stringInput": "2W6", "system.enhanced.damageType.value": "wind" };

        const result = await submitChange(sheet, "system.enhanced.damage.stringInput", data);

        expect(result).to.deep.equal({ "system.enhanced.damage.stringInput": "2W6" });
    });

    it("parses enhanced features with the existing feature parser", async () => {
        const { sheet } = setup();

        const result = await submitChange(sheet, "system.enhanced.features.innateFeatures", {
            "system.enhanced.features.innateFeatures": "Kritisch 3",
        });

        expect(result).to.deep.equal({
            "system.enhanced.features.internalFeatureList": [{ name: "Kritisch", value: 3 }],
        });
    });

    for (const property of [
        { key: "damage", field: "damage.stringInput", value: "1W6" },
        { key: "features", field: "features.innateFeatures", value: "Scharf 2" },
        { key: "damageType", field: "damageType.value", value: "wind" },
        { key: "costType", field: "costType.value", value: "V" },
        { key: "range", field: "range.value", value: "10m" },
        { key: "effectArea", field: "effectArea.value", value: "2 m Radius" },
        { key: "effectDuration", field: "effectDuration.value", value: "5 min" },
    ]) {
        it(`restores inheritance when the enhanced ${property.key} is cleared`, async () => {
            const { sheet } = setup();
            const field = `system.enhanced.${property.field}`;

            const result = await submitChange(sheet, field, { [field]: "" });

            expect(result).to.deep.equal({ [`system.enhanced.${property.key}`]: null });
        });

        it(`restores inheritance when the enhanced ${property.key} matches normal`, async () => {
            const { sheet } = setup();
            const field = `system.enhanced.${property.field}`;

            const result = await submitChange(sheet, field, { [field]: property.value });

            expect(result).to.deep.equal({ [`system.enhanced.${property.key}`]: null });
        });
    }

    it("keeps zero damage as an explicit override", async () => {
        const { sheet } = setup();

        const result = await submitChange(sheet, "system.enhanced.damage.stringInput", {
            "system.enhanced.damage.stringInput": "0",
        });

        expect(result).to.deep.equal({ "system.enhanced.damage.stringInput": "0" });
    });

    it("does not reset an untouched override when a normal edit makes both values equal", async () => {
        const { spell, sheet } = setup();
        spell.system.enhanced.range = { value: "20m" };

        const result = await submitChange(sheet, "system.range", {
            "system.range": "20m",
            "system.enhanced.range.value": "20m",
        });

        expect(result).to.deep.equal({ "system.range": "20m", "system.enhanced.range.value": "20m" });
    });

    it("compares edited values with the normal value submitted in the same form", async () => {
        const { spell, sheet } = setup();
        spell.system.enhanced.range = { value: "30m" };
        const html = createHtml("templates/sheets/item/properties.hbs", { itemProperties: await sheet.properties() });
        const { window } = new JSDOM(`<form>${html}</form>`);
        const form = window.document.querySelector("form")!;
        form.querySelector<HTMLInputElement>("[name='system.range']")!.value = "20m";
        form.querySelector<HTMLInputElement>("[name='system.enhanced.range.value']")!.value = "20m";

        const result = sheet._prepareSubmitData(new window.SubmitEvent("submit"), form, {
            object: { "system.range": "20m", "system.enhanced.range.value": "20m" },
        });

        expect(result).to.deep.equal({ "system.range": "20m", "system.enhanced.range": null });
    });

    it("keeps an edited enhanced value when Enter submits before the change event", async () => {
        const { sheet } = setup();
        const html = createHtml("templates/sheets/item/properties.hbs", { itemProperties: await sheet.properties() });
        const { window } = new JSDOM(`<form>${html}</form>`);
        const form = window.document.querySelector("form")!;
        form.querySelector<HTMLInputElement>("[name='system.enhanced.damage.stringInput']")!.value = "2W6";

        const result = sheet._prepareSubmitData(new window.SubmitEvent("submit"), form, {
            object: {
                "system.enhanced.damage.stringInput": "2W6",
                "system.enhanced.damageType.value": "wind",
            },
        });

        expect(result).to.deep.equal({ "system.enhanced.damage.stringInput": "2W6" });
    });

    async function submitChange(sheet: SpellSheet, field: string, data: Record<string, unknown>) {
        const html = createHtml("templates/sheets/item/properties.hbs", { itemProperties: await sheet.properties() });
        const { window } = new JSDOM(`<form>${html}</form>`);
        const form = window.document.querySelector("form")!;
        const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${field}']`)!;
        input.value = String(data[field] ?? "");
        let result: object = {};
        form.addEventListener("change", (event) => {
            result = sheet._prepareSubmitData(event as SubmitEvent, form, { object: data });
        });
        input.dispatchEvent(new window.Event("change", { bubbles: true }));
        return result;
    }
});
