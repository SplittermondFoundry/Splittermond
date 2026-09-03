import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { migrateItem } from "module/item/migrations/itemMigration";
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

async function createItemPack(label: string): Promise<CompendiumLike> {
    return (await foundry.documents.collections.CompendiumCollection.createCompendium({
        type: "Item",
        label,
    })) as CompendiumLike;
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
}
