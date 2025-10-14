import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import SplittermondCombat from "module/combat/combat";
import type SplittermondActor from "module/actor/actor";
import sinon, { type SinonSandbox } from "sinon";
import type { FoundryCombatant, FoundryScene } from "module/api/foundryTypes";
import { foundryApi } from "module/api/foundryApi";
import { createScene, withActor } from "./fixtures";
import { actorCreator } from "module/data/EntityCreator";
import { expect } from "chai";

declare const Scene: FoundryScene;
export function combatTest(context: QuenchBatchContext) {
    const { it, describe, before, after, beforeEach, afterEach } = context;
    let combats: SplittermondCombat[] = [];
    let actors: SplittermondActor[] = [];
    let tokens: TokenDocument[] = [];
    let sandbox: SinonSandbox;
    let scene: FoundryScene;
    let originalScene: FoundryScene | null;

    before(async () => {
        /*
         * For creating valid tokens we need a fully loaded and active scene. Unfortunately, scene loading happens
         * asynchronously and there is no "scene loaded" event we could hook into. So we just wait a second after
         * the scene was activated.
         */
        originalScene = foundryApi.currentScene;
        scene = await createScene();
        await scene.view();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await scene.activate();
    });
    after(async () => {
        await Scene.deleteDocuments([scene.id]);
        originalScene?.activate();
    });
    beforeEach(() => (sandbox = sinon.createSandbox()));

    afterEach(() => {
        Combat.deleteDocuments(combats.map((c) => c.id));
        Actor.deleteDocuments(actors.map((a) => a.id));
        tokens.forEach((t) => t.actor?.sheet.close());
        scene.deleteEmbeddedDocuments(
            "Token",
            tokens.map((t) => t.id)
        );
        sandbox.restore();
        combats = [];
        actors = [];
        tokens = [];
    });

    async function createActiveCombat() {
        const combat = (await Combat.create({})) as SplittermondCombat;
        combats.push(combat);
        await combat.update({ active: true });
        await combat.startCombat();
        return combat;
    }

    async function createCombatant(name: string, combat: SplittermondCombat) {
        const actor = await actorCreator.createCharacter({ type: "character", name, system: {} });
        const tokenDocument = (
            await scene.createEmbeddedDocuments("Token", [
                {
                    type: "base",
                    actorId: actor.id,
                    x: scene._viewPosition.x,
                    y: scene._viewPosition.y,
                },
            ])
        )[0] as TokenDocument;
        console.debug("Token created");
        actors.push(actor);
        tokens.push(tokenDocument);
        const combatants = await combat.createEmbeddedDocuments("Combatant", [
            {
                type: "base",
                actorId: actor.id,
                sceneId: scene.id,
                tokenId: tokenDocument.id,
                defeated: false,
                group: null,
            },
        ]);
        const combatant = combatants[0] as FoundryCombatant;
        return { combatant, actor, token: tokenDocument };
    }

    describe("Status effect update", () => {
        it("should add a start tick for combat effects", async () => {
            const combat = await createActiveCombat();
            const { combatant, actor } = await createCombatant("StatusEffectTester", combat);
            await combat.setInitiative(combatant.id, 15);

            const statusEffect = await actor.createEmbeddedDocuments("Item", [
                { name: "Brennend", system: { interval: 5 }, type: "statuseffect" },
            ]);

            expect(statusEffect[0].system.startTick, "Start tick was set").to.equal((combat.currentTick ?? 0) + 5);
        });

        it(
            "should not add a start tick for non-combat effects",
            withActor(async (nonCombatant) => {
                const combat = await createActiveCombat();
                const { combatant } = await createCombatant("StatusEffectTester", combat);
                await combat.setInitiative(combatant.id, 15);

                const statusEffect = await nonCombatant.createEmbeddedDocuments("Item", [
                    { name: "Brennend", system: { interval: 5 }, type: "statuseffect" },
                ]);

                expect(statusEffect[0].system.startTick, "Start tick was not set").to.equal(0);
            })
        );
    });
}
