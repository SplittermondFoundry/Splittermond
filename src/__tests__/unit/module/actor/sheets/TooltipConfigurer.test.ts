import "../../../foundryMocks";
import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import Handlebars from "handlebars";
import { JSDOM } from "jsdom";
import { createHtml } from "__tests__/handlebarHarness";
import { passesEventually } from "__tests__/util";
import { foundryApi } from "module/api/foundryApi";
import SplittermondActor from "module/actor/actor";
import SplittermondActorSheet from "module/actor/sheets/actor-sheet";
import { TooltipConfigurer } from "module/actor/sheets/TooltipConfigurer";
import SplittermondItem from "module/item/item";
import { NpcFeatureDataModel } from "module/item/dataModel/NpcFeatureDataModel";
import { StrengthDataModel } from "module/item/dataModel/StrengthDataModel";
import { WeaknessDataModel } from "module/item/dataModel/WeaknessDataModel";
import { MasteryDataModel } from "module/item/dataModel/MasteryDataModel";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";

describe("Actor item description tooltips", () => {
    const sandbox = sinon.createSandbox();
    let dom: JSDOM;
    let element: HTMLElement;
    let items: Map<string, SplittermondItem>;
    let enrich: sinon.SinonStub<
        Parameters<typeof foundryApi.utils.enrichHtml>,
        ReturnType<typeof foundryApi.utils.enrichHtml>
    >;
    let renderer: sinon.SinonStub<Parameters<typeof foundryApi.renderer>, ReturnType<typeof foundryApi.renderer>>;
    const cases = [
        ["npcfeature", () => sandbox.createStubInstance(NpcFeatureDataModel), ".taglist-item-name"],
        ["strength", () => sandbox.createStubInstance(StrengthDataModel), ".name"],
        ["weakness", () => sandbox.createStubInstance(WeaknessDataModel), ".name"],
        ["mastery", () => sandbox.createStubInstance(MasteryDataModel), ".taglist-item-name"],
    ] as const;

    beforeEach(() => {
        sandbox.stub(foundryApi.utils, "mergeObject").callsFake((a, b) => ({ ...a, ...b }));
        items = new Map();
        const itemsByType = Object.fromEntries(
            cases.map(([type, createSystem]) => {
                const item = sandbox.createStubInstance(SplittermondItem);
                item.type = type;
                item.system = createSystem();
                item.system.description = `<strong>${type} description</strong>`;
                items.set(type, item);
                return [type, [{ _id: type, name: type, system: item.system }]];
            })
        );
        const spell = sandbox.createStubInstance(SplittermondItem);
        const spellSystem = sandbox.createStubInstance(SpellDataModel);
        Object.assign(spellSystem, {
            description: "<em>Spell description</em>",
            enhancementCosts: "2V1",
            enhancementDescription: "Enhanced spell",
        });
        spell.system = spellSystem;
        items.set("spell", spell);
        // The header's unrelated stats section is outside this description-tooltip contract.
        sandbox.define(Handlebars.partials, "systems/splittermond/templates/sheets/actor/parts/stats-section.hbs", "");
        dom = new JSDOM(
            createHtml("templates/sheets/actor/npc-header.hbs", { itemsByType }) +
                createHtml("templates/sheets/actor/character-general-tab.hbs", { itemsByType }) +
                `<div class="list masteries"><ul>${createHtml("templates/sheets/actor/parts/mastery-by-skill.hbs", {
                    skill: { label: "masteries", masteries: itemsByType.mastery },
                    editable: true,
                })}</ul></div>` +
                createHtml("templates/sheets/actor/spells-tab.hbs", {
                    spellsBySkill: [{ label: "spells", spells: [{ id: "spell", name: "Spell" }] }],
                })
        );
        element = dom.window.document.body;
        if ("window" in globalThis) sandbox.stub(globalThis, "window").value(dom.window);
        else sandbox.define(globalThis, "window", dom.window);
        sandbox.define(dom.window.HTMLElement.prototype, "animate", sandbox.stub());
        enrich = sandbox.stub(foundryApi.utils, "enrichHtml").callsFake(async (html) => html);
        renderer = sandbox
            .stub<Parameters<typeof foundryApi.renderer>, ReturnType<typeof foundryApi.renderer>>()
            .callsFake(async (path, context) => createHtml(path.replace("systems/splittermond/", ""), context));
        sandbox.stub(foundryApi, "renderer").get(() => renderer);
        const actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor, "items", { value: items });
        const sheet = new SplittermondActorSheet({ document: actor });
        Object.defineProperty(sheet, "element", { value: element });
        new TooltipConfigurer(sheet).configureTooltips();
    });

    afterEach(() => {
        sandbox.restore();
        dom?.window.close();
    });

    for (const [type, , selector] of cases) {
        it(`shows the ${type} description on name hover and removes it on leave`, async () => {
            const name = element.querySelector(`[data-item-id="${type}"] ${selector}`)!;

            name.dispatchEvent(new dom.window.MouseEvent("mouseenter"));

            await passesEventually(() => {
                expect(element.querySelectorAll(".actor-tooltip")).to.have.length(1);
                expect(element.querySelector(".actor-tooltip strong")?.textContent).to.equal(`${type} description`);
            });
            expect(enrich.firstCall.args[0]).to.equal(items.get(type)!.system.description);

            name.dispatchEvent(new dom.window.MouseEvent("mouseleave"));
            expect(element.querySelector(".actor-tooltip")).to.be.null;
        });
    }

    for (const description of ["", null]) {
        it(`does not show a tooltip for a ${description === null ? "null" : "blank"} description`, () => {
            items.get("strength")!.system.description = description;

            element
                .querySelector('[data-item-id="strength"] .name')!
                .dispatchEvent(new dom.window.MouseEvent("mouseenter"));

            expect(enrich.called).to.be.false;
            expect(element.querySelector(".actor-tooltip")).to.be.null;
        });
    }

    it("ignores a row whose item no longer exists", () => {
        items.delete("strength");

        element
            .querySelector('[data-item-id="strength"] .name')!
            .dispatchEvent(new dom.window.MouseEvent("mouseenter"));

        expect(enrich.called).to.be.false;
        expect(element.querySelector(".actor-tooltip")).to.be.null;
    });

    it("does not display a late description after the pointer leaves", async () => {
        const pending = sinon.promise<string>();
        enrich.onFirstCall().returns(pending);
        const name = element.querySelector('[data-item-id="strength"] .name')!;

        name.dispatchEvent(new dom.window.MouseEvent("mouseenter"));
        name.dispatchEvent(new dom.window.MouseEvent("mouseleave"));
        pending.resolve("<strong>Late description</strong>");
        // Drain the event handler's promise continuations, including template rendering.
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(element.querySelector(".actor-tooltip")).to.be.null;
    });

    it("keeps the current tooltip when an earlier description arrives late", async () => {
        const pending = sinon.promise<string>();
        enrich.onFirstCall().returns(pending);
        const strength = element.querySelector('[data-item-id="strength"] .name')!;
        const weakness = element.querySelector('[data-item-id="weakness"] .name')!;

        strength.dispatchEvent(new dom.window.MouseEvent("mouseenter"));
        strength.dispatchEvent(new dom.window.MouseEvent("mouseleave"));
        weakness.dispatchEvent(new dom.window.MouseEvent("mouseenter"));
        await passesEventually(() => {
            expect(element.querySelector(".actor-tooltip strong")?.textContent).to.equal("weakness description");
        });
        pending.resolve("<strong>Old strength description</strong>");
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(element.querySelectorAll(".actor-tooltip")).to.have.length(1);
        expect(element.querySelector(".actor-tooltip strong")?.textContent).to.equal("weakness description");
    });

    it("does not insert a tooltip when rendering finishes after mouseleave", async () => {
        const pending = sinon.promise<string>();
        renderer.onFirstCall().returns(pending);
        const name = element.querySelector('[data-item-id="strength"] .name')!;
        name.dispatchEvent(new dom.window.MouseEvent("mouseenter"));
        await passesEventually(() => expect(renderer.calledOnce).to.be.true);

        name.dispatchEvent(new dom.window.MouseEvent("mouseleave"));
        pending.resolve(createHtml("templates/sheets/actor/tooltip.hbs", renderer.firstCall.args[1]));
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(element.querySelector(".actor-tooltip")).to.be.null;
    });

    it("does not insert a pending tooltip for a removed sheet element", async () => {
        const pending = sinon.promise<string>();
        renderer.onFirstCall().returns(pending);
        const name = element.querySelector('[data-item-id="strength"] .name')!;
        name.dispatchEvent(new dom.window.MouseEvent("mouseenter"));
        await passesEventually(() => expect(renderer.calledOnce).to.be.true);

        name.remove();
        pending.resolve(createHtml("templates/sheets/actor/tooltip.hbs", renderer.firstCall.args[1]));
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(element.querySelector(".actor-tooltip")).to.be.null;
    });

    it("preserves the spell description and enhancement in the shared renderer", async () => {
        const row = element.querySelector('[data-item-id="spell"]')!;

        row.dispatchEvent(new dom.window.MouseEvent("mouseenter"));

        await passesEventually(() => {
            const tooltip = element.querySelector(".actor-tooltip")!;
            expect(tooltip?.querySelector("em")?.textContent).to.equal("Spell description");
            expect(tooltip.textContent).to.contain("2V1").and.to.contain("Enhanced spell");
        });
    });

    it("discards a late spell description after mouseleave", async () => {
        const pending = sinon.promise<string>();
        enrich.onFirstCall().returns(pending);
        const row = element.querySelector('[data-item-id="spell"]')!;

        row.dispatchEvent(new dom.window.MouseEvent("mouseenter"));
        row.dispatchEvent(new dom.window.MouseEvent("mouseleave"));
        pending.resolve("<em>Late spell description</em>");
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(element.querySelector(".actor-tooltip")).to.be.null;
    });

    it("does not open description tooltips over item action buttons", () => {
        element
            .querySelectorAll("[data-item-id] button")
            .forEach((button) => button.dispatchEvent(new dom.window.MouseEvent("mouseenter")));

        expect(enrich.called).to.be.false;
        expect(element.querySelector(".actor-tooltip")).to.be.null;
    });
});
