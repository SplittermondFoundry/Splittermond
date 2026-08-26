import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { runItemMigration, MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY } from "module/item/migrations/itemMigration";
import { foundryApi } from "module/api/foundryApi";

declare const foundry: any;
declare const Item: { deleteDocuments(ids: string[]): Promise<unknown> };

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

export function itemMigrationTest(context: QuenchBatchContext) {
    const { describe, it, expect, afterEach, beforeEach } = context;

    describe("runItemMigration compendium round-trip", () => {
        let testCompendium: CompendiumLike;

        beforeEach(async () => {
            testCompendium = (await foundry.documents.collections.CompendiumCollection.createCompendium({
                type: "Item",
                label: "Item Migration Test Pack",
            })) as CompendiumLike;
            const worldItem = (await foundryApi.createItem(legacyWeaponData())) as unknown as { id: string };
            await testCompendium.importDocument(worldItem);
            await Item.deleteDocuments([worldItem.id]);
        });

        afterEach(async () => {
            if (testCompendium) {
                await testCompendium.deleteCompendium();
            }
            await foundryApi.settings.set(MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY, false);
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
            expect(skippedResult, "identical source produces an empty diff and is not persisted").to.be.undefined;

            const writtenResult = await docs[0].update({ system: source.system }, { diff: false });
            expect(writtenResult, "diff:false bypasses the empty-diff skip").to.not.be.undefined;
        });

        it("pins pack.locked and pack.title accessors on a real compendium", () => {
            expect(testCompendium.locked).to.be.a("boolean");
            expect(testCompendium.title).to.be.a("string").and.to.equal("Item Migration Test Pack");
        });

        it("migrates a compendium item and persists the migrated shape (round-trip)", async () => {
            await foundryApi.settings.set(MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY, false);
            await runItemMigration({ force: true });

            const docs = await testCompendium.getDocuments();
            expect(docs).to.have.lengthOf(1);
            expect(isMigratedDamage(docs[0].system.damage), "damage is in migrated object shape after run").to.be.true;
        });

        it("is idempotent: a second forced run leaves the persisted shape unchanged", async () => {
            await foundryApi.settings.set(MIGRATION_FLAG_SCOPE, MIGRATION_FLAG_KEY, false);
            await runItemMigration({ force: true });
            const firstDocs = await testCompendium.getDocuments();
            const firstSnapshot = JSON.stringify(firstDocs[0].system);

            await runItemMigration({ force: true });
            const secondDocs = await testCompendium.getDocuments();
            const secondSnapshot = JSON.stringify(secondDocs[0].system);

            expect(secondSnapshot, "second run does not alter the persisted system data").to.equal(firstSnapshot);
        });
    });
}
