import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox, type SinonStub } from "sinon";
import { MigrationBuilder, Migrator } from "module/migrations/Migrator";
import { foundryApi } from "module/api/foundryApi";
import { settings } from "module/settings";

interface FakePack {
    metadata: { packageType?: string };
    documentName: string;
    locked: boolean;
    title: string;
    getDocuments: SinonStub;
    getIndex: SinonStub;
}

function makePack(overrides: Partial<FakePack> = {}): FakePack {
    return {
        metadata: { packageType: "module" },
        documentName: "Actor",
        locked: false,
        title: "Pack",
        getDocuments: sinon.stub().resolves([]),
        getIndex: sinon.stub().resolves({ size: 0 }),
        ...overrides,
    };
}

describe("MigrationBuilder", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("fails to build when the migration is not fully configured", () => {
        expect(() => new MigrationBuilder("incompleteMigration").build()).to.throw();
    });

    it("migrationDoneFlag falls back to false while no setting is registered", () => {
        const builder = new MigrationBuilder("unregisteredMigration");
        expect(builder.migrationDoneFlag.get()).to.be.false;
    });

    it("registers the migration-done setting on build and wires the flag to it once resolved", async () => {
        const registeredSetting = { get: () => true, set: sandbox.stub() };
        const registerBoolean = sandbox.stub(settings, "registerBoolean").resolves(registeredSetting);
        const builder = new MigrationBuilder<FoundryDocument>("flaggedMigration")
            .withWorldCollection(() => [])
            .withDocumentClass("Actor")
            .withMigrationProcess(async () => false)
            .withI18nPrefix("splittermond.migration.flaggedMigration");

        expect(builder.migrationDoneFlag.get(), "flag stays false until build resolves the setting").to.be.false;

        const migrator = builder.build();

        expect(registerBoolean.calledOnceWith("flaggedMigration", { default: false, config: false, scope: "world" })).to
            .be.true;
        expect(migrator).to.be.instanceOf(Migrator);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(builder.migrationDoneFlag.get(), "flag delegates to the registered setting").to.be.true;
    });

    it("logs an error instead of silently dropping the flag when the setting never registers", async () => {
        const consoleError = sandbox.stub(console, "error");
        sandbox.stub(settings, "registerBoolean").rejects(new Error("registration failed"));
        const builder = new MigrationBuilder<FoundryDocument>("unresolvableMigration");

        await builder.migrationDoneFlag.ready();

        builder.migrationDoneFlag.set(true);

        expect(builder.migrationDoneFlag.isFunctional(), "flag stays non-functional after a failed registration").to.be
            .false;
        const messages = consoleError.getCalls().map((c) => String(c.args[0]));
        expect(messages).to.have.lengthOf(2);
        expect(messages[1]).to.contain("cannot persist the migration-done flag");
    });
});

describe("Migrator", () => {
    let sandbox: SinonSandbox;
    let traverseStub: SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "currentUser").value({ id: "gm1", isGM: true, active: true });
        sandbox.stub(foundryApi, "users").value([{ id: "gm1", isGM: true, active: true }]);
        traverseStub = sandbox.stub(foundryApi.documents, "traverseEmbeddedDocuments").returns([]);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("sweeps the configured world collection and filters compendium documents per document class", async () => {
        const builder = new MigrationBuilder<FoundryDocument>("actorMigration")
            .withWorldCollection(() => foundryApi.collections.actors)
            .withDocumentClass("Actor")
            .withMigrationProcess(async (document) => {
                await document.update({});
                return true;
            })
            .withI18nPrefix("splittermond.migration.actorMigration");
        const migrator = builder.build();
        sandbox.stub(builder.migrationDoneFlag, "get").returns(false);
        const flagSet = sandbox.stub(builder.migrationDoneFlag, "set");

        const actorDoc = { documentName: "Actor", update: sinon.stub().resolves() };
        const packDoc = { documentName: "Actor", update: sinon.stub().resolves() };
        const itemDoc = { documentName: "Item", update: sinon.stub().resolves() };
        const actorPack = makePack({
            title: "Actor Pack",
            getDocuments: sinon.stub().resolves([packDoc]),
            getIndex: sinon.stub().resolves({ size: 1 }),
        });
        const itemPack = makePack({
            documentName: "Item",
            title: "Item Pack",
            getDocuments: sinon.stub().resolves([itemDoc]),
            getIndex: sinon.stub().resolves({ size: 1 }),
        });
        sandbox.stub(foundryApi, "collections").value({
            actors: [actorDoc],
            items: [],
            packs: [actorPack, itemPack],
        });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });
        const informUser = sandbox.stub(foundryApi, "informUser");

        const result = await migrator.run();

        expect(actorDoc.update.calledOnce).to.be.true;
        expect(packDoc.update.calledOnce).to.be.true;
        expect(itemDoc.update.called, "documents of another class are not migrated").to.be.false;
        expect(itemPack.getIndex.called, "packs of another document class are still loaded").to.be.true;
        expect(itemPack.getDocuments.called, "packs of another document class are still loaded").to.be.true;
        expect(result).to.deep.equal({ worldDocumentsMigrated: 1, packsMigrated: 1, skippedPacks: [] });
        expect(flagSet.calledOnceWith(true)).to.be.true;
        const calledKeys = informUser.getCalls().map((c) => c.firstArg);
        expect(calledKeys).to.deep.equal([
            "splittermond.migration.actorMigration.start",
            "splittermond.migration.actorMigration.progress",
            "splittermond.migration.actorMigration.progress",
            "splittermond.migration.actorMigration.progress",
            "splittermond.migration.actorMigration.done",
        ]);
    });

    it("migrates embedded documents matching the document class and skips non-matching ones", async () => {
        const actorDoc = { documentName: "Actor", update: sinon.stub().resolves() };
        const embeddedItem = { documentName: "Item", update: sinon.stub().resolves() };
        const embeddedEffect = { documentName: "ActiveEffect", update: sinon.stub().resolves() };
        traverseStub.returns([
            ["items", embeddedItem],
            ["items.effects", embeddedEffect],
        ]);
        const processCalls: Array<{ document: unknown; source: unknown }> = [];
        const builder = new MigrationBuilder<FoundryDocument>("embeddedMigration")
            .withWorldCollection(() => [actorDoc as unknown as FoundryDocument])
            .withDocumentClass("Item")
            .withMigrationProcess(async (document, source) => {
                processCalls.push({ document, source });
                return true;
            })
            .withI18nPrefix("splittermond.migration.embeddedMigration");
        const embeddedSource = { system: { field: "embedded" } };
        sandbox.stub(foundryApi, "collections").value({ actors: [], items: [], packs: [] });
        sandbox.stub(foundryApi, "getDocumentSource").withArgs(embeddedItem).returns(embeddedSource);
        sandbox.stub(foundryApi, "informUser");
        sandbox.stub(builder.migrationDoneFlag, "get").returns(false);
        const flagSet = sandbox.stub(builder.migrationDoneFlag, "set");
        const migrator = builder.build();

        const result = await migrator.run();

        expect(
            processCalls,
            "only the matching embedded document reaches the process, with its own source"
        ).to.deep.equal([{ document: embeddedItem, source: embeddedSource.system }]);
        expect(result.worldDocumentsMigrated, "embedded migrations count into worldDocumentsMigrated").to.equal(1);
        expect(flagSet.calledOnceWith(true)).to.be.true;
    });

    it("passes the top-level document and all embedded documents to the process when no document class is configured", async () => {
        const scopedDoc = { documentName: "Actor", update: sinon.stub().resolves() };
        const embeddedEffect = { documentName: "ActiveEffect", update: sinon.stub().resolves() };
        traverseStub.returns([["effects", embeddedEffect]]);
        const processCalls: Array<{ document: unknown; source: unknown }> = [];
        const scopedPack = makePack({
            title: "Scoped Pack",
            getDocuments: sinon.stub().resolves([scopedDoc]),
            getIndex: sinon.stub().resolves({ size: 1 }),
        });
        sandbox.stub(foundryApi, "collections").value({ actors: [], items: [], packs: [scopedPack] });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });
        sandbox.stub(foundryApi, "informUser");

        const builder = new MigrationBuilder<FoundryDocument>("unfilteredMigration")
            .withWorldCollection(() => [])
            .withCompendiumFilter((pack) => pack.title === "Scoped Pack")
            .withMigrationProcess(async (document, source) => {
                processCalls.push({ document, source });
                return true;
            })
            .withI18nPrefix("splittermond.migration.unfilteredMigration");
        sandbox.stub(builder.migrationDoneFlag, "get").returns(false);
        const migrator = builder.build();

        const result = await migrator.run();

        expect(processCalls).to.deep.equal([
            { document: scopedDoc, source: {} },
            { document: embeddedEffect, source: {} },
        ]);
        expect(result.packsMigrated).to.equal(1);
    });

    it("migrates only the packs matching a custom compendium filter", async () => {
        const scopedDoc = { update: sinon.stub().resolves() };
        const scopedPack = makePack({
            title: "Scoped Pack",
            getDocuments: sinon.stub().resolves([scopedDoc]),
            getIndex: sinon.stub().resolves({ size: 1 }),
        });
        const outsidePack = makePack({ title: "Outside Pack" });
        sandbox.stub(settings, "registerBoolean").resolves({ get: () => false, set: sinon.stub() });
        sandbox.stub(foundryApi, "collections").value({
            actors: [],
            items: [],
            packs: [scopedPack, outsidePack],
        });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });
        sandbox.stub(foundryApi, "informUser");

        const builder = new MigrationBuilder<FoundryDocument>("scopedMigration")
            .withWorldCollection(() => [])
            .withCompendiumFilter((pack) => pack.title === "Scoped Pack")
            .withMigrationProcess(async (document) => {
                await document.update({});
                return true;
            })
            .withI18nPrefix("splittermond.migration.scopedMigration");
        sandbox.stub(builder.migrationDoneFlag, "get").returns(false);
        const migrator = builder.build();
        const result = await migrator.run();

        expect(scopedDoc.update.calledOnce).to.be.true;
        expect(outsidePack.getIndex.called, "packs outside the filter are never counted").to.be.false;
        expect(outsidePack.getDocuments.called, "packs outside the filter are never loaded").to.be.false;
        expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 1, skippedPacks: [] });
    });

    it("refuses to run when the done-flag setting is not available", async () => {
        const consoleError = sandbox.stub(console, "error");
        sandbox.stub(settings, "registerBoolean").rejects(new Error("registration failed"));
        let processCalls = 0;
        const builder = new MigrationBuilder<FoundryDocument>("flaglessMigration")
            .withWorldCollection(() => [])
            .withDocumentClass("Actor")
            .withMigrationProcess(async () => {
                processCalls += 1;
                return true;
            })
            .withI18nPrefix("splittermond.migration.flaglessMigration");
        const migrator = builder.build();
        sandbox.stub(foundryApi, "collections").value({ actors: [], items: [], packs: [] });
        sandbox.stub(foundryApi, "informUser");

        const result = await migrator.run();

        expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] });
        expect(processCalls, "no document is migrated when the flag cannot be recorded").to.equal(0);
        expect(
            consoleError.getCalls().some((c) => String(c.args[0]).includes("migration-done setting is unavailable")),
            "the refusal is logged loudly"
        ).to.be.true;
    });

    it("skips a compendium whose index cannot be loaded instead of aborting the run", async () => {
        const consoleWarn = sandbox.stub(console, "warn");
        const healthyDoc = { documentName: "Actor", update: sinon.stub().resolves() };
        const brokenPack = makePack({
            title: "Broken Index Pack",
            getIndex: sinon.stub().rejects(new Error("index failed")),
        });
        const healthyPack = makePack({
            title: "Healthy Pack",
            documentName: "Actor",
            getDocuments: sinon.stub().resolves([healthyDoc]),
            getIndex: sinon.stub().resolves({ size: 1 }),
        });
        const builder = new MigrationBuilder<FoundryDocument>("brokenIndexMigration")
            .withWorldCollection(() => [])
            .withDocumentClass("Actor")
            .withMigrationProcess(async (document) => {
                await document.update({});
                return true;
            })
            .withI18nPrefix("splittermond.migration.brokenIndexMigration");
        const migrator = builder.build();
        sandbox.stub(builder.migrationDoneFlag, "get").returns(false);
        const flagSet = sandbox.stub(builder.migrationDoneFlag, "set");
        sandbox.stub(foundryApi, "collections").value({
            actors: [],
            items: [],
            packs: [brokenPack, healthyPack],
        });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });
        sandbox.stub(foundryApi, "informUser");

        const result = await migrator.run();

        expect(healthyDoc.update.calledOnce, "documents of the healthy pack are still migrated").to.be.true;
        expect(result).to.deep.equal({
            worldDocumentsMigrated: 0,
            packsMigrated: 1,
            skippedPacks: ["Broken Index Pack"],
        });
        expect(flagSet.calledOnceWith(true), "the done flag is still persisted").to.be.true;
        expect(consoleWarn.calledOnce).to.be.true;
    });

    it("skips a compendium whose documents cannot be loaded instead of aborting the run", async () => {
        const consoleWarn = sandbox.stub(console, "warn");
        const brokenPack = makePack({
            title: "Unreadable Pack",
            getDocuments: sinon.stub().rejects(new Error("load failed")),
        });
        const builder = new MigrationBuilder<FoundryDocument>("brokenPackMigration")
            .withWorldCollection(() => [])
            .withDocumentClass("Actor")
            .withMigrationProcess(async () => true)
            .withI18nPrefix("splittermond.migration.brokenPackMigration");
        const migrator = builder.build();
        sandbox.stub(builder.migrationDoneFlag, "get").returns(false);
        const flagSet = sandbox.stub(builder.migrationDoneFlag, "set");
        sandbox.stub(foundryApi, "collections").value({ actors: [], items: [], packs: [brokenPack] });
        sandbox.stub(foundryApi, "informUser");

        const result = await migrator.run();

        expect(result).to.deep.equal({
            worldDocumentsMigrated: 0,
            packsMigrated: 0,
            skippedPacks: ["Unreadable Pack"],
        });
        expect(flagSet.calledOnceWith(true), "the done flag is still persisted").to.be.true;
        expect(consoleWarn.calledOnce).to.be.true;
    });

    it("continues with the next world document when one document tree fails", async () => {
        const consoleWarn = sandbox.stub(console, "warn");
        const brokenDoc = { documentName: "Actor", update: sinon.stub().resolves() };
        const healthyDoc = { documentName: "Item", update: sinon.stub().resolves() };
        traverseStub.withArgs(brokenDoc as unknown as FoundryDocument).throws(new Error("traversal failed"));
        const builder = new MigrationBuilder<FoundryDocument>("brokenTreeMigration")
            .withWorldCollection(() => [brokenDoc, healthyDoc].map((d) => d as unknown as FoundryDocument))
            .withDocumentClass("Item")
            .withMigrationProcess(async (document) => {
                await document.update({});
                return true;
            })
            .withI18nPrefix("splittermond.migration.brokenTreeMigration");
        const migrator = builder.build();
        sandbox.stub(builder.migrationDoneFlag, "get").returns(false);
        const flagSet = sandbox.stub(builder.migrationDoneFlag, "set");
        sandbox.stub(foundryApi, "collections").value({ actors: [], items: [], packs: [] });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });
        sandbox.stub(foundryApi, "informUser");

        const result = await migrator.run();

        expect(healthyDoc.update.calledOnce, "the document after the broken tree is still migrated").to.be.true;
        expect(result.worldDocumentsMigrated).to.equal(1);
        expect(flagSet.calledOnceWith(true)).to.be.true;
        expect(consoleWarn.calledOnce).to.be.true;
    });
});
