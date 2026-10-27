import { afterEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import { createHtml } from "../../../../handlebarHarness";
import { simplePropertyResolver } from "../../../../util";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import type { PropertyGroup } from "module/item/sheets/propertyTypes";
import { foundryApi } from "module/api/foundryApi";
import { SplittermondBaseItemSheet } from "module/data/SplittermondApplication";

class PropertiesSheet extends SplittermondItemSheet {
    async renderProperties() {
        return new JSDOM(
            createHtml("templates/sheets/item/properties.hbs", {
                tabs: { properties: { id: "properties", cssClass: "active" } },
                itemProperties: await this._getItemProperties(),
            })
        ).window.document;
    }
}

describe("Item property layouts", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    function sheetFor(groups: PropertyGroup[]) {
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        sandbox.stub(foundryApi.utils, "deepClone").callsFake((value) => structuredClone(value));
        return new PropertiesSheet(
            { document: { type: "equipment", system: { name: "Normal", other: "Verstärkt", choice: null } } },
            simplePropertyResolver,
            { localize: (key: string) => key },
            { itemSheetProperties: { equipment: groups }, displayOptions: { itemSheet: { default: {} } } },
            async (text: string) => `<p>${text}</p>`
        );
    }

    it("keeps ordinary properties editable in a single value column", async () => {
        const sheet = sheetFor([{ properties: [{ field: "system.name", template: "input", label: "Name" }] }]);

        const html = await sheet.renderProperties();

        expect(html.querySelector<HTMLInputElement>("input")?.value).to.equal("Normal");
        expect(html.querySelectorAll(".properties-comparison")).to.have.length(0);
        expect(html.querySelector("section")?.dataset.tab).to.equal("properties");
    });

    it("renders both configured values with distinct accessible column labels", async () => {
        const sheet = sheetFor([
            {
                columnLabels: { normal: "Normal", comparison: "Verstärkt" },
                properties: [
                    {
                        field: "system.name",
                        template: "input",
                        label: "Wert",
                        comparison: { field: "system.other", template: "input", label: "Wert" },
                    },
                ],
            },
        ]);

        const html = await sheet.renderProperties();
        const inputs = [...html.querySelectorAll("input")];

        expect(inputs.map((input) => input.value)).to.deep.equal(["Normal", "Verstärkt"]);
        expect(inputs.map((input) => input.getAttribute("aria-label"))).to.deep.equal([
            "Wert – Normal",
            "Wert – Verstärkt",
        ]);
    });

    it("preserves an explicit null selection in the comparison column when submitting", () => {
        const sheet = sheetFor([
            {
                columnLabels: { normal: "Normal", comparison: "Verstärkt" },
                properties: [
                    {
                        field: "system.name",
                        template: "input",
                        label: "Wert",
                        comparison: {
                            field: "system.choice",
                            template: "select",
                            label: "Wert",
                            choices: { null: "Keiner" },
                        },
                    },
                ],
            },
        ]);
        sandbox.define(SplittermondBaseItemSheet.prototype, "_prepareSubmitData", () => ({}));
        const formData = { object: { "system.choice": "null" as string | null } };

        const { window } = new JSDOM("<form></form>");
        sheet._prepareSubmitData(new window.SubmitEvent("submit"), window.document.querySelector("form")!, formData);

        expect(formData.object["system.choice"]).to.equal(null);
    });
});
