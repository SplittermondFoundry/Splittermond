import "../../../foundryMocks";
import { expect } from "chai";
import sinon from "sinon";
import SplittermondActor from "module/actor/actor";
import SplittermondItem from "module/item/item";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import { SplittermondBaseActorSheet } from "module/data/SplittermondApplication";
import { foundryApi } from "module/api/foundryApi";
import type { ItemType } from "module/config/itemTypes";

describe("Character sheet moonsign drops", () => {
    const sandbox = sinon.createSandbox();
    const event = new Event("drop") as DragEvent;
    let actor: sinon.SinonStubbedInstance<SplittermondActor>;
    let sheet: SplittermondCharacterSheet;
    let items: SplittermondItem[];
    let drop: sinon.SinonStub<
        Parameters<SplittermondBaseActorSheet["_onDropItem"]>,
        ReturnType<SplittermondBaseActorSheet["_onDropItem"]>
    >;

    function item(id: string, type: ItemType = "moonsign", owner?: SplittermondActor) {
        const document = sandbox.createStubInstance(SplittermondItem);
        document.type = type;
        Object.defineProperties(document, { id: { value: id }, actor: { value: owner } });
        return document;
    }

    beforeEach(() => {
        sandbox.stub(foundryApi.utils, "mergeObject").callsFake((a, b) => ({ ...a, ...b }));
        sandbox.stub(foundryApi, "localize").callsFake((key) => key);
        sandbox.stub(foundryApi, "informUser");
        actor = sandbox.createStubInstance(SplittermondActor);
        items = [item("old"), item("equipment", "equipment")];
        Object.defineProperties(actor, { type: { value: "character" }, items: { get: () => items } });
        sheet = new SplittermondCharacterSheet({ document: actor });
        actor.deleteEmbeddedDocuments = sandbox
            .stub<
                Parameters<SplittermondActor["deleteEmbeddedDocuments"]>,
                ReturnType<SplittermondActor["deleteEmbeddedDocuments"]>
            >()
            .resolves([]);
        drop = sandbox.stub(SplittermondBaseActorSheet.prototype, "_onDropItem");
    });
    afterEach(() => sandbox.restore());

    it("removes only older moonsigns after the new item has been created", async () => {
        const source = item("source");
        const created = item("created", "moonsign", actor);
        items.push(item("second-old"));
        drop.callsFake(async () => {
            expect(actor.deleteEmbeddedDocuments.called, "Existing moonsigns survive until creation succeeds").to.be
                .false;
            items.push(created);
            return created;
        });

        expect(await sheet._onDropItem(event, source)).to.equal(created);

        expect(actor.deleteEmbeddedDocuments.args).to.deep.equal([["Item", ["old", "second-old"]]]);
    });

    it("does not delete anything when adding the first moonsign", async () => {
        const created = item("created", "moonsign", actor);
        items = [created];
        drop.resolves(created);

        expect(await sheet._onDropItem(event, item("source"))).to.equal(created);

        expect(actor.deleteEmbeddedDocuments.called).to.be.false;
    });

    for (const result of [null, undefined]) {
        it(`preserves the existing moonsign when creation returns ${result}`, async () => {
            drop.resolves(result);

            expect(await sheet._onDropItem(event, item("source"))).to.equal(result);

            expect(drop.calledOnce).to.be.true;
            expect(actor.deleteEmbeddedDocuments.called).to.be.false;
        });
    }

    it("preserves the existing moonsign when creation throws", async () => {
        const failure = new Error("Creation failed");
        drop.rejects(failure);

        const result = await sheet._onDropItem(event, item("source")).catch((error: unknown) => error);

        expect(result).to.equal(failure);
        expect(actor.deleteEmbeddedDocuments.called).to.be.false;
    });

    it("does not replace moonsigns when sorting an item already on this actor", async () => {
        const existing = item("old", "moonsign", actor);
        items = [existing, item("second-old")];
        drop.resolves(existing);

        expect(await sheet._onDropItem(event, existing)).to.equal(existing);

        expect(drop.calledOnce).to.be.true;
        expect(actor.deleteEmbeddedDocuments.called).to.be.false;
    });

    it("leaves moonsigns alone when another item type is dropped", async () => {
        const created = item("created", "equipment", actor);
        drop.resolves(created);

        expect(await sheet._onDropItem(event, item("source", "equipment"))).to.equal(created);

        expect(actor.deleteEmbeddedDocuments.called).to.be.false;
    });
});
