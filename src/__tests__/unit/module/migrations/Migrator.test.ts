import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox } from "sinon";
import { MigrationBuilder } from "module/migrations/Migrator";
import { foundryApi } from "module/api/foundryApi";

describe("MigrationBuilder", () => {
    it("fails to build when the migration is not fully configured", () => {
        expect(() => new MigrationBuilder("incompleteMigration").build()).to.throw();
    });

    it("migrationDoneFlag falls back to false before the setting registration resolves", () => {
        const builder = new MigrationBuilder("unregisteredMigration");
        expect(builder.migrationDoneFlag.get()).to.be.false;
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
        };
        const itemPack = {
            metadata: { system: "other-system" },
            documentName: "Item",
            locked: false,
            title: "Item Pack",
            getDocuments: sinon.stub().resolves([]),
        };
        sandbox.stub(foundryApi, "collections").value({
            actors: [actorDoc],
            items: [],
            packs: [actorPack, itemPack],
        });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });

        const result = await migrator.run();

        expect(actorDoc.update.calledOnce).to.be.true;
        expect(packDoc.update.calledOnce).to.be.true;
        expect(itemPack.getDocuments.called).to.be.false;
        expect(result).to.deep.equal({ worldDocumentsMigrated: 1, packsMigrated: 1, skippedPacks: [] });
        expect(flagSet.calledOnceWith(true)).to.be.true;
    });
});
