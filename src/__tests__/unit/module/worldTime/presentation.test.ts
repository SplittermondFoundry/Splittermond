import { expect } from "chai";
import sinon from "sinon";
import { afterEach, beforeEach, describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { foundryApi } from "module/api/foundryApi";
import { formatWorldTime, timeFieldContexts, timeStepContext } from "module/worldTime/presentation";
import { quickTimeSteps, timeSteps } from "module/worldTime/time";
import { createHtml } from "__tests__/handlebarHarness";
import de from "../../../../../public/lang/de.json";

describe("World time presentation", () => {
    beforeEach(() => {
        sinon.stub(foundryApi, "localize").callsFake((key) => {
            const name = key.replace("splittermond.worldTime.", "") as keyof typeof de.splittermond.worldTime;
            return de.splittermond.worldTime[name];
        });
        sinon.stub(foundryApi, "format").callsFake((key, args = {}) => {
            const name = key.replace("splittermond.worldTime.", "") as keyof typeof de.splittermond.worldTime;
            return Object.entries(args).reduce(
                (text, [key, value]) => text.replace(`{${key}}`, value),
                de.splittermond.worldTime[name]
            );
        });
    });
    afterEach(() => sinon.restore());

    it("omits year zero and includes completed years", () => {
        expect(formatWorldTime(2 * 86400 + 3 * 3600 + 15 * 60)).to.equal("Tag 2, 03:15 Uhr");
        expect(formatWorldTime(369 * 86400 + 14 * 3600 + 50 * 60)).to.equal("Jahr 1, Tag 4, 14:50 Uhr");
    });

    it("shows the four quick steps and keeps all of them in the menu", () => {
        const context = {
            isGM: true,
            hidden: false,
            label: "Tag 0, 00:00 Uhr",
            steps: quickTimeSteps.map(timeStepContext),
        };
        const hud = new JSDOM(createHtml("templates/apps/world-time-hud.hbs", context)).window.document;
        const menu = new JSDOM(
            createHtml("templates/apps/world-time-menu.hbs", { steps: timeSteps.map(timeStepContext) })
        ).window.document;

        expect(
            Array.from(hud.querySelectorAll<HTMLElement>('[data-action="advance"]'), (button) =>
                Number(button.dataset.seconds)
            )
        ).to.deep.equal([60, 300, 1800, 21600]);
        expect(
            Array.from(hud.querySelectorAll<HTMLElement>('[data-action="advance"]'), (button) => button.textContent)
        ).to.deep.equal(["+1 min", "+5 min", "+30 min", "+6 h"]);
        for (const seconds of quickTimeSteps) {
            expect(menu.querySelector(`[data-seconds="${seconds}"]`)).not.to.equal(null);
            expect(menu.querySelector(`[data-seconds="-${seconds}"]`)).not.to.equal(null);
        }
        expect(menu.querySelector<HTMLDetailsElement>(".world-time-extra-steps")!.open).to.equal(false);
    });

    it("renders labelled date fields with whole-unit and half-second controls", () => {
        const fields = timeFieldContexts(369 * 86400 + 14 * 3600 + 50 * 60 + 0.5);
        const document = new JSDOM(createHtml("templates/apps/world-time-menu.hbs", { fields })).window.document;
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(".world-time-fields input"));

        expect(inputs.map((input) => input.name)).to.deep.equal(["year", "day", "hour", "minute", "second"]);
        expect(inputs.map((input) => input.valueAsNumber)).to.deep.equal([1, 4, 14, 50, 0.5]);
        expect(inputs.map((input) => Number(input.dataset.seconds))).to.deep.equal([31536000, 86400, 3600, 60, 0.5]);
        expect(inputs.map((input) => Number(input.step))).to.deep.equal([1, 1, 1, 1, 0.5]);
        for (const input of inputs) {
            const label = document.querySelector(`label[for="${input.id}"]`)!.textContent;
            expect(label).not.to.equal("");
            const buttons = Array.from(input.parentElement!.querySelectorAll<HTMLButtonElement>("button"));
            expect(buttons.map((button) => Number(button.dataset.seconds))).to.deep.equal([
                Number(input.dataset.seconds),
                -Number(input.dataset.seconds),
            ]);
            expect(buttons.map((button) => button.getAttribute("aria-label"))).to.deep.equal([
                `${label} erhöhen`,
                `${label} verringern`,
            ]);
        }
    });

    it("leaves only the GM menu button when hidden", () => {
        const html = createHtml("templates/apps/world-time-hud.hbs", { isGM: true, hidden: true });
        const document = new JSDOM(html).window.document;

        expect(document.querySelectorAll("button").length).to.equal(1);
        expect(document.querySelector('[data-action="menu"]')).not.to.equal(null);
        expect(document.querySelector(".world-time-label")).to.equal(null);
    });

    it("offers players no time controls", () => {
        const html = createHtml("templates/apps/world-time-hud.hbs", { isGM: false, label: "Tag 0, 00:00 Uhr" });
        const document = new JSDOM(html).window.document;

        expect(document.querySelectorAll("button").length).to.equal(0);
        expect(document.querySelector(".world-time-label")?.textContent).to.equal("Tag 0, 00:00 Uhr");
    });
});
