import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor, withScene } from "../fixtures";
import { foundryApi } from "module/api/foundryApi";

declare const foundry: any;

interface CompendiumLike {
    documentName: string;
    title: string;
    locked: boolean;
    getDocuments(): Promise<FoundryDocument[]>;
    importDocument(document: object): Promise<unknown>;
    deleteCompendium(): Promise<void>;
}

interface NamedDocument {
    name: string;
}

async function createPack(label: string): Promise<CompendiumLike> {
    return (await foundry.documents.collections.CompendiumCollection.createCompendium({
        type: "Actor",
        label,
    })) as CompendiumLike;
}

export function documentsApiTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("foundryApi.documents.traverseEmbeddedDocuments", function () {
        this.timeout(10000);

        it(
            "yields [dottedPath, document] tuples recursively and never the parent",
            withActor(async (actor) => {
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    { type: "weapon", name: "Traverse Test Weapon" },
                ]);
                await item.createEmbeddedDocuments("ActiveEffect", [
                    { name: "Traverse Test Effect", type: "modifier", system: { modifiers: [], costModifiers: [] } },
                ]);

                const entries = [...foundryApi.documents.traverseEmbeddedDocuments(actor)];

                const itemEntries = entries.filter(([path]) => path === "items");
                expect(itemEntries, "embedded item is yielded at path 'items'").to.have.lengthOf(1);
                expect((itemEntries[0][1] as unknown as NamedDocument).name).to.equal("Traverse Test Weapon");

                const effectEntries = entries.filter(([path]) => path === "items.effects");
                expect(effectEntries, "item effect is yielded at path 'items.effects'").to.have.lengthOf(1);

                const parentYielded = entries.some(([, document]) => document === actor);
                expect(parentYielded, "the traversed parent itself is never yielded").to.be.false;
            })
        );

        it("traverses embedded items of actors imported into a compendium", async () => {
            const pack = await createPack("Documents API Test Actor Pack");
            try {
                const actor = await foundryApi.createActor({
                    type: "character",
                    name: "Traverse Test Compendium Actor",
                    items: [{ type: "weapon", name: "Traverse Test Compendium Weapon" }],
                });
                await pack.importDocument(actor);
                await Actor.deleteDocuments([actor.id]);

                const docs = await pack.getDocuments();
                expect(docs).to.have.lengthOf(1);

                const entries = [...foundryApi.documents.traverseEmbeddedDocuments(docs[0])];
                const embeddedItems = entries.filter(([path]) => path === "items");
                expect(embeddedItems, "compendium actor yields its embedded item").to.have.lengthOf(1);
                expect((embeddedItems[0][1] as unknown as NamedDocument).name).to.equal(
                    "Traverse Test Compendium Weapon"
                );
            } finally {
                await pack.deleteCompendium();
            }
        });

        it(
            "yields token, actor delta, and delta items for unlinked tokens; nothing delta for linked tokens",
            withScene(
                withActor(async (actor, scene) => {
                    const tokens = await scene.createEmbeddedDocuments("Token", [
                        { type: "base", actorLink: false, actorId: actor.id, x: 0, y: 0 },
                        { type: "base", actorLink: true, actorId: actor.id, x: 100, y: 100 },
                    ]);
                    const [unlinkedToken, linkedToken] = tokens;
                    await unlinkedToken.actor.createEmbeddedDocuments("Item", [
                        { type: "weapon", name: "Traverse Test Delta Weapon" },
                    ]);

                    const entries = [...foundryApi.documents.traverseEmbeddedDocuments(scene)];

                    expect(
                        entries.filter(([path]) => path === "tokens"),
                        "both token documents are yielded"
                    ).to.have.lengthOf(2);
                    const deltaEntries = entries.filter(([path]) => path === "tokens.delta");
                    expect(deltaEntries, "only the unlinked token has an actor delta").to.have.lengthOf(1);
                    expect((deltaEntries[0][1] as unknown as { parent: { id: string } }).parent.id).to.equal(
                        unlinkedToken.id
                    );

                    const deltaItemEntries = entries.filter(([path]) => path === "tokens.delta.items");
                    expect(deltaItemEntries, "the unlinked token's delta item is yielded").to.have.lengthOf(1);
                    expect((deltaItemEntries[0][1] as unknown as NamedDocument).name).to.equal(
                        "Traverse Test Delta Weapon"
                    );

                    const linkedDeltaEntries = entries.filter(
                        ([, document]) => (document as unknown as { id: string }).id === linkedToken.id
                    );
                    expect(
                        linkedDeltaEntries.filter(([path]) => path.startsWith("tokens.delta")),
                        "the linked token's delta is null and yields nothing"
                    ).to.have.lengthOf(0);
                })
            )
        );
    });
}
