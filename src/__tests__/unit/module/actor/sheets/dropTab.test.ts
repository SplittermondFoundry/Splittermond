import "../../../foundryMocks";
import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondNPCSheet from "module/actor/sheets/npc-sheet";
import SplittermondActor from "module/actor/actor";
import SplittermondItem from "module/item/item";
import { SplittermondBaseActorSheet } from "module/data/SplittermondApplication";
import { FoundryDialog } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import { MasteryDataModel } from "module/item/dataModel/MasteryDataModel";
import { SplittermondActiveEffect } from "module/activeEffect";
import { itemTypes, type ItemType } from "module/config/itemTypes";

describe("Actor sheet tabs after item drops", () => {
    const sandbox = sinon.createSandbox();
    const event = new Event("drop") as DragEvent;
    const destinations: Record<ItemType, { character: string | null; npc: string | null }> = {
        weapon: { character: "inventory", npc: "inventory" },
        projectile: { character: null, npc: null },
        equipment: { character: "inventory", npc: "inventory" },
        shield: { character: "inventory", npc: "inventory" },
        armor: { character: "inventory", npc: "inventory" },
        spell: { character: "spells", npc: "spells" },
        strength: { character: "general", npc: null },
        weakness: { character: "general", npc: null },
        mastery: { character: "skills", npc: "general" },
        species: { character: null, npc: null },
        culture: { character: null, npc: null },
        ancestry: { character: null, npc: null },
        education: { character: null, npc: null },
        resource: { character: "general", npc: null },
        npcfeature: { character: null, npc: "header" },
        moonsign: { character: null, npc: null },
        language: { character: "general", npc: null },
        culturelore: { character: "general", npc: null },
        statuseffect: { character: "status", npc: "status" },
        spelleffect: { character: "status", npc: "status" },
        npcattack: { character: null, npc: "general" },
    };

    beforeEach(() => {
        sandbox.stub(foundryApi.utils, "mergeObject").callsFake((a, b) => ({ ...a, ...b }));
        sandbox.stub(foundryApi, "localize").callsFake((key) => key);
        sandbox.stub(foundryApi, "informUser");
    });
    afterEach(() => sandbox.restore());

    function droppedItem(type: ItemType, configured = true) {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.type = type;
        if (type === "spell") {
            const system = sandbox.createStubInstance(SpellDataModel);
            Object.assign(system, { skill: configured ? "deathmagic" : "arcanelore", availableIn: "" });
            item.system = system;
        } else if (type === "mastery") {
            const system = sandbox.createStubInstance(MasteryDataModel);
            Object.assign(system, { skill: configured ? "deathmagic" : null, availableIn: "" });
            item.system = system;
        }
        item.update.resolves(item);
        return item;
    }

    (
        [
            ["character", SplittermondCharacterSheet],
            ["npc", SplittermondNPCSheet],
        ] as const
    ).forEach(([actorType, Sheet]) => {
        describe(actorType, () => {
            let sheet: InstanceType<typeof Sheet>;
            let changeTab: sinon.SinonStub;
            let drop: sinon.SinonStub;
            let events: EventTarget;
            let remove: sinon.SinonStub<
                Parameters<SplittermondActor["deleteEmbeddedDocuments"]>,
                ReturnType<SplittermondActor["deleteEmbeddedDocuments"]>
            >;

            beforeEach(() => {
                const actor = sandbox.createStubInstance(SplittermondActor);
                Object.defineProperty(actor, "type", { value: actorType });
                remove = sandbox
                    .stub<
                        Parameters<SplittermondActor["deleteEmbeddedDocuments"]>,
                        ReturnType<SplittermondActor["deleteEmbeddedDocuments"]>
                    >()
                    .resolves([]);
                actor.deleteEmbeddedDocuments = remove;
                sheet = new Sheet({ document: actor });
                Object.defineProperty(sheet, "rendered", { value: true, configurable: true });
                Object.defineProperty(sheet, "element", { value: new JSDOM().window.document.body });
                changeTab = sandbox.stub(sheet, "changeTab");
                drop = sandbox.stub(SplittermondBaseActorSheet.prototype, "_onDropItem");
                events = new EventTarget();
                sandbox.stub(sheet, "addEventListener").callsFake(events.addEventListener.bind(events));
                sandbox.stub(sheet, "removeEventListener").callsFake(events.removeEventListener.bind(events));
            });

            for (const type of itemTypes) {
                const tab = destinations[type][actorType];
                const changesTab = tab !== null && tab !== "header";
                const label =
                    tab === "header"
                        ? `keeps the tab for always-visible ${type}`
                        : tab
                          ? `opens ${tab} after accepting ${type}`
                          : `keeps the tab when rejecting ${type}`;
                it(label, async () => {
                    const item = droppedItem(type);
                    drop.resolves(item);

                    await sheet._onDropItem(event, item);

                    expect(changeTab.callCount).to.equal(changesTab ? 1 : 0);
                    if (changesTab) expect(changeTab.firstCall.args.slice(0, 2)).to.deep.equal([tab, "primary"]);
                    expect(drop.calledOnce).to.equal(tab !== null);
                });
            }

            for (const result of [null, undefined]) {
                it(`keeps the tab when Foundry returns ${result}`, async () => {
                    drop.resolves(result);
                    await sheet._onDropItem(event, droppedItem("equipment"));
                    expect(changeTab.called).to.be.false;
                });
            }

            for (const type of ["spell", "mastery"] as const) {
                it(`keeps the tab when ${type} configuration is cancelled`, async () => {
                    const item = droppedItem(type, false);
                    drop.resolves(item);
                    sandbox.stub(FoundryDialog, "prompt").resolves(null);

                    await sheet._onDropItem(event, item);

                    expect(remove.calledOnce).to.be.true;
                    expect(changeTab.called).to.be.false;
                });

                it(`waits for ${type} configuration to persist before changing tabs`, async () => {
                    const item = droppedItem(type);
                    drop.resolves(item);
                    item.update.callsFake(async () => {
                        await Promise.resolve();
                        expect(changeTab.called).to.be.false;
                        return item;
                    });

                    await sheet._onDropItem(event, item);

                    expect(item.update.calledOnce).to.be.true;
                    expect(changeTab.calledOnce).to.be.true;
                });
            }

            it("does not navigate a closed sheet", async () => {
                Object.defineProperty(sheet, "rendered", { value: false });
                sheet.element.remove();
                drop.resolves(droppedItem("equipment"));
                await sheet._onDropItem(event, droppedItem("equipment"));
                expect(changeTab.called).to.be.false;
            });

            it("does not request an extra render after an item drop", async () => {
                const render = sandbox.stub(sheet, "render").resolves();
                drop.resolves(droppedItem("equipment"));

                await sheet._onDropItem(event, droppedItem("equipment"));

                expect(render.called, "Document changes already request the sheet render").to.be.false;
            });

            it("finishes the mastery drop while the sheet is being rendered", async () => {
                const item = droppedItem("mastery");
                drop.resolves(item);
                item.update.callsFake(async () => {
                    Object.defineProperty(sheet, "rendered", { value: false, configurable: true });
                    return item;
                });
                await sheet._onDropItem(event, item);

                expect(changeTab.called).to.be.false;
                Object.defineProperty(sheet, "rendered", { value: true });
                events.dispatchEvent(new Event("render"));
                expect(changeTab.calledOnce).to.be.true;
                expect(changeTab.firstCall.args.slice(0, 2)).to.deep.equal([
                    destinations.mastery[actorType],
                    "primary",
                ]);
            });

            for (const type of ["mastery", "weapon", "npcattack", "npcfeature"] as const) {
                const tab = destinations[type][actorType];
                if (!tab) continue;
                it(`reveals and briefly highlights the new ${type} row in its destination`, async () => {
                    const source = droppedItem(type);
                    const created = droppedItem(type);
                    Object.defineProperty(source, "id", { value: "source" });
                    Object.defineProperty(created, "id", { value: "created" });
                    drop.resolves(created);
                    const scope = tab === "header" ? "header" : `section data-tab="${tab}"`;
                    const tag = tab === "header" ? "header" : "section";
                    const row =
                        type === "npcattack"
                            ? '<li class="list-item"><div data-item-id="created"></div></li>'
                            : '<li class="taglist-item item" data-item-id="created"></li>';
                    sheet.element.innerHTML = `<header class="window-header"><h1>Actor sheet</h1></header>
                        <div class="window-content">
                            <section data-tab="fight"><li data-item-id="created"></li></section>
                            <${scope}><ul><li data-item-id="source"></li>${row}</ul></${tag}>
                        </div>`;
                    const destination = sheet.element.querySelector(
                        `.window-content > ${tag}${tab === "header" ? "" : `[data-tab="${tab}"]`}`
                    )!;
                    const target = destination.querySelector<HTMLElement>(".list-item, .taglist-item")!;
                    const scroll = sandbox.stub();
                    const animate = sandbox.stub();
                    sandbox.define(target, "scrollIntoView", scroll);
                    sandbox.define(target, "animate", animate);

                    await sheet._onDropItem(event, source);

                    expect(scroll.calledOnce).to.be.true;
                    expect(animate.calledOnce).to.be.true;
                    if (tab !== "header") sinon.assert.callOrder(changeTab, scroll, animate);
                    const options = animate.firstCall.args[1] as KeyframeAnimationOptions;
                    expect(options.duration).to.be.within(1000, 2500);
                    expect(options.fill).to.not.equal("forwards");
                });
            }

            for (const documentType of ["Item", "ActiveEffect"] as const) {
                it(`uses the document render to activate the ${documentType} destination`, async () => {
                    Object.defineProperty(sheet, "rendered", { value: false, configurable: true });
                    const render = sandbox.stub(sheet, "render").resolves();
                    const item = droppedItem("spell");
                    drop.resolves(item);
                    const effect = sandbox.createStubInstance(SplittermondActiveEffect);
                    effect.type = "modifier";
                    sandbox.define(
                        SplittermondBaseActorSheet.prototype,
                        "_onDropActiveEffect",
                        sandbox.stub().resolves(effect)
                    );

                    await (documentType === "Item"
                        ? sheet._onDropItem(event, item)
                        : sheet._onDropActiveEffect(event, effect));
                    expect(changeTab.called, "Do not activate a tab in HTML about to be replaced").to.be.false;
                    expect(render.called).to.be.false;
                    Object.defineProperty(sheet, "rendered", { value: true });
                    events.dispatchEvent(new Event("render"));
                    expect(changeTab.calledOnce).to.be.true;
                    expect(changeTab.firstCall.args.slice(0, 2)).to.deep.equal([
                        documentType === "Item" ? "spells" : "status",
                        "primary",
                    ]);
                });
            }

            for (const type of ["modifier", "autoGenerated"] as const) {
                for (const succeeds of [true, false]) {
                    it(`${succeeds ? "opens status" : "keeps the tab"} after a ${type} effect drop ${succeeds ? "succeeds" : "fails"}`, async () => {
                        const effect = sandbox.createStubInstance(SplittermondActiveEffect);
                        effect.type = type;
                        effect.toObject = sandbox.stub<[source?: boolean], { type: string }>().returns({ type });
                        const created = sandbox.createStubInstance(SplittermondActiveEffect);
                        Object.defineProperty(created, "uuid", { value: "Actor.target.ActiveEffect.created" });
                        sheet.element.innerHTML =
                            '<section data-tab="status"><li class="list-item effect" data-effect-uuid="Actor.target.ActiveEffect.created"></li></section>';
                        const row = sheet.element.querySelector("li")!;
                        const animate = sandbox.stub();
                        sandbox.define(row, "scrollIntoView", sandbox.stub());
                        sandbox.define(row, "animate", animate);
                        const result = succeeds ? created : null;
                        sandbox.define(
                            SplittermondBaseActorSheet.prototype,
                            "_onDropActiveEffect",
                            sandbox.stub().resolves(result)
                        );
                        sheet.actor.createEmbeddedDocuments = sandbox.stub().resolves(succeeds ? [created] : []);

                        expect(await sheet._onDropActiveEffect(event, effect)).to.equal(result);
                        expect(changeTab.callCount).to.equal(succeeds ? 1 : 0);
                        expect(animate.callCount).to.equal(succeeds ? 1 : 0);
                        if (succeeds) expect(changeTab.firstCall.args.slice(0, 2)).to.deep.equal(["status", "primary"]);
                    });
                }
            }
        });
    });
});
