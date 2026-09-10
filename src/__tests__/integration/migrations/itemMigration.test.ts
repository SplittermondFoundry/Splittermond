import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { migrateItem } from "module/item/migrations/itemMigration";
import { MigrationBuilder, type Migrator } from "module/migrations/Migrator";
import { foundryApi } from "module/api/foundryApi";
import { createScene } from "../fixtures";

declare const foundry: any;
declare const Item: { deleteDocuments(ids: string[]): Promise<unknown> };
declare const Scene: { deleteDocuments(ids: string[]): Promise<unknown> };

interface CompendiumItem {
    id: string;
    system: { damage?: unknown };
    update(data: object, operation?: { diff?: boolean }): Promise<unknown>;
}

function isMigratedDamage(damage: unknown): damage is { stringInput: string } {
    return (
        typeof damage === "object" &&
        damage !== null &&
        "stringInput" in damage &&
        typeof (damage as { stringInput: unknown }).stringInput === "string"
    );
}

interface CompendiumLike {
    documentName: string;
    metadata: { system?: string };
    locked: boolean;
    title: string;
    getDocuments(): Promise<CompendiumItem[]>;
    importDocument(item: object): Promise<unknown>;
    deleteCompendium(): Promise<void>;
}

function legacyWeaponData(): Record<string, unknown> {
    return {
        type: "weapon",
        name: "Migration Test Weapon",
        system: {
            damage: "1W6",
            range: 0,
            speed: 2,
            skill: "melee",
            skillMod: 0,
            attribute1: "strength",
            attribute2: "agility",
            equipped: false,
            modifier: "",
            features: { internalFeatureList: [] },
            minAttributes: "",
            prepared: false,
        },
    };
}

async function createItemPack(label: string): Promise<CompendiumLike> {
    return (await foundry.documents.collections.CompendiumCollection.createCompendium({
        type: "Item",
        label,
    })) as CompendiumLike;
}

interface EmbeddedCompendiumPack {
    locked: boolean;
    title: string;
    getDocuments(): Promise<FoundryDocument[]>;
    importDocument(document: object): Promise<unknown>;
    deleteCompendium(): Promise<void>;
}

async function createDocumentPack(type: "Actor" | "Scene", label: string): Promise<EmbeddedCompendiumPack> {
    return (await foundry.documents.collections.CompendiumCollection.createCompendium({
        type,
        label,
    })) as EmbeddedCompendiumPack;
}

function embeddedItemsMigrator(name: string, packTitle: string): Migrator<FoundryDocument> {
    return new MigrationBuilder<FoundryDocument>(name)
        .withWorldCollection(() => [])
        .withCompendiumFilter((pack) => pack.title === packTitle)
        .withDocumentClass("Item")
        .withMigrationProcess(migrateItem)
        .withI18nPrefix("splittermond.migration.itemMigration")
        .build();
}

async function importLegacyWeapon(pack: CompendiumLike): Promise<void> {
    const worldItem = (await foundryApi.createItem(legacyWeaponData())) as unknown as { id: string };
    await pack.importDocument(worldItem);
    await Item.deleteDocuments([worldItem.id]);
}

export function itemMigrationTest(context: QuenchBatchContext) {
    const { describe, it, expect, afterEach, beforeEach } = context;

    describe("migrateItem processor over a compendium item", function () {
        this.timeout(10000);
        let testCompendium: CompendiumLike;

        beforeEach(async () => {
            testCompendium = await createItemPack("Item Migration Test Pack");
            await importLegacyWeapon(testCompendium);
        });

        afterEach(async () => {
            if (testCompendium) {
                await testCompendium.deleteCompendium();
            }
        });

        it("pins getDocumentSource returns the stored source system for a compendium item", async () => {
            const docs = await testCompendium.getDocuments();
            expect(docs).to.have.lengthOf(1);
            const source = foundryApi.getDocumentSource(docs[0] as unknown as FoundryDocument);
            expect(source.system).to.be.an("object");
        });

        it("pins that updating with the pristine source alone is skipped, while diff:false writes", async () => {
            const docs = await testCompendium.getDocuments();
            expect(docs).to.have.lengthOf(1);
            const source = foundryApi.getDocumentSource(docs[0] as unknown as FoundryDocument);

            const skippedResult = await docs[0].update({ system: source.system });
            void expect(skippedResult, "identical source produces an empty diff and is not persisted").to.be.undefined;

            const writtenResult = await docs[0].update({ system: source.system }, { diff: false });
            void expect(writtenResult, "diff:false bypasses the empty-diff skip").to.not.be.undefined;
        });

        it("pins pack.locked and pack.title accessors on a real compendium", () => {
            expect(testCompendium.locked).to.be.a("boolean");
            expect(testCompendium.title).to.be.a("string").and.to.equal("Item Migration Test Pack");
        });

        it("pins that a world compendium declares the world's game system in metadata.system", () => {
            expect(testCompendium.metadata.system).to.equal("splittermond");
        });

        it("persists the migrated system shape when the processor runs against a compendium item", async () => {
            const docs = await testCompendium.getDocuments();
            expect(docs).to.have.lengthOf(1);
            const doc = docs[0] as unknown as FoundryDocument;
            const sourceSystem = foundryApi.getDocumentSource(doc).system;

            const migrated = await migrateItem(doc, sourceSystem);

            expect(migrated, "processor reports a migrated document").to.be.true;
            const reloaded = (await testCompendium.getDocuments())[0];
            void expect(isMigratedDamage(reloaded.system.damage), "damage is in migrated object shape after run").to.be
                .true;
        });

        it("is idempotent: re-running the processor leaves the persisted shape unchanged", async () => {
            const docs = await testCompendium.getDocuments();
            const doc = docs[0] as unknown as FoundryDocument;
            await migrateItem(doc, foundryApi.getDocumentSource(doc).system);
            const firstSnapshot = JSON.stringify((await testCompendium.getDocuments())[0].system);

            const reloaded = (await testCompendium.getDocuments())[0] as unknown as FoundryDocument;
            await migrateItem(reloaded, foundryApi.getDocumentSource(reloaded).system);
            const secondSnapshot = JSON.stringify((await testCompendium.getDocuments())[0].system);

            expect(secondSnapshot, "second run does not alter the persisted system data").to.equal(firstSnapshot);
        });
    });

    describe("Migrator over embedded compendium documents", function () {
        this.timeout(20000);

        it("migrates items embedded on compendium actors", async () => {
            const pack = await createDocumentPack("Actor", "Embedded Actor Migration Test Pack");
            try {
                const worldActor = await foundryApi.createActor({
                    type: "character",
                    name: "Embedded Actor Migration Actor",
                    items: [legacyWeaponData()],
                });
                try {
                    await pack.importDocument(worldActor);
                } finally {
                    await Actor.deleteDocuments([worldActor.id]);
                }

                const result = await embeddedItemsMigrator("quenchEmbeddedActorMigration", pack.title).run({
                    force: true,
                });

                expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 1, skippedPacks: [] });

                const [packActor] = await pack.getDocuments();
                const embeddedItems = [...foundryApi.documents.traverseEmbeddedDocuments(packActor)].filter(
                    ([path]) => path === "items"
                );
                expect(embeddedItems, "the compendium actor still owns its embedded item").to.have.lengthOf(1);
                const embeddedItem = embeddedItems[0][1] as unknown as CompendiumItem;
                expect(isMigratedDamage(embeddedItem.system.damage), "embedded item damage is in migrated shape").to.be
                    .true;
            } finally {
                await pack.deleteCompendium();
            }
        });

        it("migrates items embedded in unlinked token actors of compendium scenes", async () => {
            const pack = await createDocumentPack("Scene", "Embedded Scene Migration Test Pack");
            const scene = await createScene();
            const actor = await foundryApi.createActor({
                type: "character",
                name: "Embedded Scene Migration Actor",
            });
            let sceneDeleted = false;
            try {
                const [token] = await scene.createEmbeddedDocuments("Token", [
                    { type: "base", actorLink: false, actorId: actor.id, x: 0, y: 0 },
                ]);
                await (token as unknown as TokenDocument).actor.createEmbeddedDocuments("Item", [legacyWeaponData()]);
                await pack.importDocument(scene);
                await Scene.deleteDocuments([scene.id]);
                sceneDeleted = true;

                const result = await embeddedItemsMigrator("quenchEmbeddedSceneMigration", pack.title).run({
                    force: true,
                });

                expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 1, skippedPacks: [] });

                const [packScene] = await pack.getDocuments();
                const deltaItems = [...foundryApi.documents.traverseEmbeddedDocuments(packScene)].filter(
                    ([path]) => path === "tokens.delta.items"
                );
                expect(deltaItems, "the compendium scene's unlinked token yields its delta item").to.have.lengthOf(1);
                const deltaItem = deltaItems[0][1] as unknown as CompendiumItem;
                expect(isMigratedDamage(deltaItem.system.damage), "delta item damage is in migrated shape").to.be.true;
            } finally {
                if (!sceneDeleted) {
                    await Scene.deleteDocuments([scene.id]);
                }
                await Actor.deleteDocuments([actor.id]);
                await pack.deleteCompendium();
            }
        });
    });
}
