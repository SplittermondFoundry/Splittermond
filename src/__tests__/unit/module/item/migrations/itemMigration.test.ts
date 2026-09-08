import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox, type SinonStub } from "sinon";
import { runItemMigration, migrationDoneFlag } from "module/item/migrations/itemMigration";
import { foundryApi } from "module/api/foundryApi";

interface MigratableItem {
    documentName: string;
    update: SinonStub;
}

interface FakePack {
    metadata: { packageType?: string; system?: string };
    documentName: string;
    locked: boolean;
    title: string;
    getDocuments: SinonStub;
    getIndex: SinonStub;
}

function makeItem(sourceSystem: Record<string, unknown> = { field: "value" }): {
    item: MigratableItem;
    source: { system: Record<string, unknown> };
} {
    return {
        item: { documentName: "Item", update: sinon.stub().resolves() },
        source: { system: sourceSystem },
    };
}

function makePack(overrides: Partial<FakePack> = {}): FakePack {
    return {
        metadata: { packageType: "module", system: "splittermond" },
        documentName: "Item",
        locked: false,
        title: "Third Party Pack",
        getDocuments: sinon.stub().resolves([]),
        getIndex: sinon.stub().resolves({ size: 0 }),
        ...overrides,
    };
}

function gmUser(id = "gm1") {
    return { id, isGM: true, active: true };
}

function stubGetDocumentSource(sandbox: SinonSandbox, items: { source: { system: Record<string, unknown> } }[]) {
    const stub = sandbox.stub(foundryApi, "getDocumentSource");
    for (let i = 0; i < items.length; i++) {
        stub.onCall(i).returns(items[i].source);
    }
}

describe("runItemMigration", () => {
    let sandbox: SinonSandbox;
    let flagGet: SinonStub;
    let flagSet: SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        flagGet = sandbox.stub(migrationDoneFlag, "get").returns(false);
        flagSet = sandbox.stub(migrationDoneFlag, "set");
        sandbox.stub(foundryApi, "currentUser").value(gmUser());
        sandbox.stub(foundryApi, "users").value([gmUser()]);
        sandbox.stub(foundryApi, "informUser");
        sandbox.stub(foundryApi.documents, "traverseEmbeddedDocuments").returns([]);
        sandbox.stub(foundryApi, "scenes").value([]);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("is a no-op when this user is not the first active GM", async () => {
        sandbox.stub(foundryApi, "currentUser").value({ id: "gm2", isGM: true, active: true });
        sandbox.stub(foundryApi, "users").value([
            { id: "gm1", isGM: true, active: true },
            { id: "gm2", isGM: true, active: true },
        ]);
        const { item } = makeItem();
        sandbox.stub(foundryApi, "collections").value({
            items: [item],
            actors: [],
            packs: [],
        });

        const result = await runItemMigration();

        expect(item.update.called).to.be.false;
        expect(flagSet.called).to.be.false;
        expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] });
    });

    it("is a no-op when the migration-done setting is already true", async () => {
        flagGet.returns(true);
        const { item } = makeItem();
        sandbox.stub(foundryApi, "collections").value({
            items: [item],
            actors: [],
            packs: [],
        });

        const result = await runItemMigration();

        expect(item.update.called).to.be.false;
        expect(flagSet.called).to.be.false;
        expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] });
    });

    it("migrates world items, calls update with source system, and sets the done flag", async () => {
        const a = makeItem({ field: "a" });
        const b = makeItem({ field: "b" });
        stubGetDocumentSource(sandbox, [a, b]);
        sandbox.stub(foundryApi, "collections").value({
            items: [a.item, b.item],
            actors: [],
            packs: [],
        });

        const result = await runItemMigration();

        expect(a.item.update.calledOnceWith({ system: a.source.system }, { diff: false })).to.be.true;
        expect(b.item.update.calledOnceWith({ system: b.source.system }, { diff: false })).to.be.true;
        expect(flagSet.calledOnceWith(true)).to.be.true;
        expect(result.worldDocumentsMigrated).to.equal(2);
        expect(result.packsMigrated).to.equal(0);
        expect(result.skippedPacks).to.deep.equal([]);
    });

    it("silently drops system compendia (metadata.packageType === system)", async () => {
        const systemPack = makePack({
            metadata: { packageType: "system", system: "splittermond" },
            title: "System Pack",
        });
        sandbox.stub(foundryApi, "collections").value({
            items: [],
            actors: [],
            packs: [systemPack],
        });

        const result = await runItemMigration();

        expect(systemPack.getDocuments.called).to.be.false;
        expect(result.packsMigrated).to.equal(0);
        expect(result.skippedPacks).to.deep.equal([]);
    });

    it("skips and reports locked third-party Item packs", async () => {
        const lockedPack = makePack({
            locked: true,
            title: "Locked Pack",
        });
        sandbox.stub(foundryApi, "collections").value({
            items: [],
            actors: [],
            packs: [lockedPack],
        });

        const result = await runItemMigration();

        expect(lockedPack.getDocuments.called).to.be.false;
        expect(result.packsMigrated).to.equal(0);
        expect(result.skippedPacks).to.deep.equal(["Locked Pack"]);
    });

    it("migrates unlocked third-party Item packs", async () => {
        const packItemA = makeItem({ field: "pa" });
        const packItemB = makeItem({ field: "pb" });
        const unlockedPack = makePack({
            locked: false,
            title: "Unlocked Pack",
            getDocuments: sinon.stub().resolves([packItemA.item, packItemB.item]),
            getIndex: sinon.stub().resolves({ size: 2 }),
        });
        stubGetDocumentSource(sandbox, [packItemA, packItemB]);
        sandbox.stub(foundryApi, "collections").value({
            items: [],
            actors: [],
            packs: [unlockedPack],
        });

        const result = await runItemMigration();

        expect(unlockedPack.getDocuments.calledOnce).to.be.true;
        expect(packItemA.item.update.calledOnceWith({ system: packItemA.source.system }, { diff: false })).to.be.true;
        expect(packItemB.item.update.calledOnceWith({ system: packItemB.source.system }, { diff: false })).to.be.true;
        expect(result.packsMigrated).to.equal(1);
        expect(result.skippedPacks).to.deep.equal([]);
    });

    it("loads non-Item compendia but does not migrate their documents", async () => {
        const macroDoc = { documentName: "Macro", update: sinon.stub().resolves() };
        const macroPack = makePack({
            documentName: "Macro",
            title: "Macro Pack",
            getDocuments: sinon.stub().resolves([macroDoc]),
            getIndex: sinon.stub().resolves({ size: 1 }),
        });
        sandbox.stub(foundryApi, "collections").value({
            items: [],
            actors: [],
            packs: [macroPack],
        });

        const result = await runItemMigration();

        expect(macroPack.getIndex.called, "non-Item packs are loaded for embedded-document traversal").to.be.true;
        expect(macroPack.getDocuments.called, "non-Item packs are loaded for embedded-document traversal").to.be.true;
        expect(macroDoc.update.called, "documents of another class are never migrated").to.be.false;
        expect(result.packsMigrated).to.equal(0);
        expect(result.skippedPacks).to.deep.equal([]);
    });

    it("never loads compendia unrelated to the splittermond system (e.g. a sound library)", async () => {
        const unrelatedPack = makePack({
            metadata: { packageType: "module" },
            title: "Sound Library Pack",
        });
        sandbox.stub(foundryApi, "collections").value({
            items: [],
            actors: [],
            packs: [unrelatedPack],
        });

        const result = await runItemMigration();

        expect(unrelatedPack.getIndex.called, "unrelated packs are never counted").to.be.false;
        expect(unrelatedPack.getDocuments.called, "unrelated packs are never loaded").to.be.false;
        expect(result.packsMigrated).to.equal(0);
        expect(result.skippedPacks).to.deep.equal([]);
    });

    it("continues migrating remaining items when one item update rejects", async () => {
        const failing = makeItem({ field: "f" });
        failing.item.update.rejects(new Error("boom"));
        const ok = makeItem({ field: "ok" });
        stubGetDocumentSource(sandbox, [failing, ok]);
        sandbox.stub(foundryApi, "collections").value({
            items: [failing.item, ok.item],
            actors: [],
            packs: [],
        });

        const result = await runItemMigration();

        expect(failing.item.update.calledOnce).to.be.true;
        expect(ok.item.update.calledOnce).to.be.true;
        expect(flagSet.calledOnceWith(true)).to.be.true;
        expect(result.worldDocumentsMigrated).to.equal(1);
    });

    it("force option bypasses the idempotency guard", async () => {
        flagGet.returns(true);
        const a = makeItem({ field: "a" });
        stubGetDocumentSource(sandbox, [a]);
        sandbox.stub(foundryApi, "collections").value({
            items: [a.item],
            actors: [],
            packs: [],
        });

        const result = await runItemMigration({ force: true });

        expect(a.item.update.calledOnce).to.be.true;
        expect(result.worldDocumentsMigrated).to.equal(1);
    });
});
