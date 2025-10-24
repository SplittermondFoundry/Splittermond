import { identity } from "../../../foundryMocks.js"; //also declares core foundry objects globally
import { afterEach, beforeEach } from "mocha";
import { expect } from "chai";
import { createHtml } from "../../../../handlebarHarness.ts";
import { produceJQuery } from "../../../../jQueryHarness.js";
import SplittermondSpellSheet from "module/item/sheets/spell-sheet.ts";
import SplittermondSpellItem from "../../../../../module/item/spell.js";
import { getSpellAvailabilityParser } from "module/item/availabilityParser.js";
import { promiseIdentity, simplePropertyResolver } from "../../../../util.ts";
import { SplittermondBaseItemSheet } from "module/data/SplittermondApplication.js";
import { foundryApi } from "module/api/foundryApi.js";
import sinon from "sinon";

describe("Spell Properties display", () => {
    const sandbox = sinon.createSandbox();
    const testParser = getSpellAvailabilityParser({ localize: (str) => str }, ["illusionmagic", "deathmagic"]);
    SplittermondBaseItemSheet.prototype._prepareContext = function () {
        return Promise.resolve({ data: this.item });
    };
    SplittermondBaseItemSheet.prototype._onRender = () => {};
    beforeEach(() => {
        sandbox.stub(foundryApi.utils, "deepClone").callsFake((obj) => JSON.parse(JSON.stringify(obj)));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("displays the availableIn property of the spell item", async () => {
        const availableInDisplayConfig = {
            field: "system.availableIn",
            placeholderText: "splittermond.availableInPlaceholder",
            label: "splittermond.availableIn",
            template: "input",
        };
        const spellItem = new SplittermondSpellItem({}, { splittermond: { ready: true } }, testParser);
        spellItem.system = { availableIn: "deathmagic 1" };
        spellItem.type = "spell";

        const renderedInput = await renderRelevantInput(availableInDisplayConfig, spellItem);
        expect(renderedInput.val()).to.equal(spellItem.system.availableIn);
    });

    it("displays a placeholder if no availableIn property is set", async () => {
        const availableInDisplayConfig = {
            field: "system.availableIn",
            placeholderText: "splittermond.availableInPlaceholder",
            label: "splittermond.availableIn",
            template: "input",
        };
        const spellItem = new SplittermondSpellItem({}, { splittermond: { ready: true } }, testParser);
        spellItem.system = { availableIn: "" };
        spellItem.type = "spell";

        const renderedInput = await renderRelevantInput(availableInDisplayConfig, spellItem);

        expect(renderedInput.prop("placeholder")).to.equal(availableInDisplayConfig.placeholderText);
        expect(renderedInput.val()).to.equal(spellItem.system.availableIn);
    });

    it("renders the availableIn label as placeholder if no placeholderText is set", async () => {
        const availableInDisplayConfig = {
            field: "system.availableIn",
            label: "splittermond.availableIn",
            template: "input",
        };
        const spellItem = new SplittermondSpellItem({}, { splittermond: { ready: true } }, testParser);
        spellItem.system = { availableIn: "" };
        spellItem.type = "spell";

        const renderedInput = await renderRelevantInput(availableInDisplayConfig, spellItem);

        expect(renderedInput.prop("placeholder")).to.equal(availableInDisplayConfig.label);
        expect(renderedInput.val()).to.equal(spellItem.system.availableIn);
    });

    async function renderRelevantInput(displayProperty, spellItem) {
        const config = { itemSheetProperties: {}, displayOptions: { itemSheet: {} } };
        config.displayOptions.itemSheet["default"] = { width: 1, height: 1 };
        config.itemSheetProperties.spell = [
            {
                groupName: "splittermond.generalProperties",
                properties: [displayProperty],
            },
        ];
        const objectUnderTest = new SplittermondSpellSheet(
            { document: spellItem },
            simplePropertyResolver,
            { localize: identity },
            config,
            promiseIdentity
        );
        return objectUnderTest
            ._prepareContext()
            .then((data) => produceJQuery(createHtml("./templates/sheets/item/properties.hbs", data)))
            .then((domUnderTest) => domUnderTest(`.properties-editor input[name='${displayProperty.field}']`));
    }
});
