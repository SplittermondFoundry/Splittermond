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
});

describe("Migrator", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "currentUser").value({ id: "gm1", isGM: true, active: true });
        sandbox.stub(foundryApi, "users").value([{ id: "gm1", isGM: true, active: true }]);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("sweeps the configured world collection and only packs of the configured document class", async () => {
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

        const actorDoc = { update: sinon.stub().resolves() };
        const packDoc = { update: sinon.stub().resolves() };
        const actorPack = {
            metadata: { system: "other-system" },
            documentName: "Actor",
            locked: false,
            title: "Actor Pack",
            getDocuments: sinon.stub().resolves([packDoc]),
            getIndex: sinon.stub().resolves({ size: 1 }),
        };
        const itemPack = {
            metadata: { system: "other-system" },
            documentName: "Item",
            locked: false,
            title: "Item Pack",
            getDocuments: sinon.stub().resolves([]),
            getIndex: sinon.stub().resolves({ size: 0 }),
        };
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
        expect(itemPack.getDocuments.called).to.be.false;
        expect(itemPack.getIndex.called).to.be.false;
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
});
