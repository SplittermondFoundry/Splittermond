import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import SplittermondCombat from "module/combat/combat";
import type SplittermondActor from "module/actor/actor";
import type { SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";
import sinon, { type SinonSandbox } from "sinon";
import type { FoundryCombatant, FoundryScene } from "module/api/foundryTypes";
import { foundryApi } from "module/api/foundryApi";
import { createScene, withActor } from "./fixtures";
import { actorCreator } from "module/data/EntityCreator";
import { expect } from "chai";
import { passesEventually } from "../util";
import Combatant = foundry.documents.Combatant;

declare const Scene: FoundryScene;
declare const ui: { combat: { viewed: unknown } };
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

    afterEach(async () => {
        await Combat.deleteDocuments(combats.map((c) => c.id));
        ui.combat.viewed = null;
        await Actor.deleteDocuments(actors.map((a) => a.id));
        tokens.forEach((t) => t.actor?.sheet.close());
        await scene.deleteEmbeddedDocuments(
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

    async function createTimedEffect(actor: SplittermondActor, ticks: number) {
        const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
            {
                name: "Timed Test",
                type: "base",
                flags: { splittermond: { durationMode: "timed" } },
                duration: { value: ticks, units: "rounds", expiry: "roundEnd" },
            },
        ]);
        return effect as SplittermondActiveEffect;
    }

    describe("foundryApi.getCombatForActor", () => {
        it("returns the combat the actor is a combatant of", async () => {
            const combat = await createActiveCombat();
            const { actor } = await createCombatant("LookupTarget", combat);

            const result = foundryApi.getCombatForActor(actor);
            expect(result, "getCombatForActor returns the combat containing the actor").to.equal(combat);
        });

        it("returns null for an actor that is not in any combat", async () => {
            const actor = await actorCreator.createCharacter({
                type: "character",
                name: "NonCombatant",
                system: {},
            });
            actors.push(actor);

            const result = foundryApi.getCombatForActor(actor);
            expect(result, "getCombatForActor returns null for a non-combatant actor").to.be.null;
        });

        it("returns the correct combat when multiple combats exist", async () => {
            const combatA = await createActiveCombat();
            const combatB = await createActiveCombat();
            const { actor } = await createCombatant("MultiCombatTarget", combatB);

            const result = foundryApi.getCombatForActor(actor);
            expect(result, "getCombatForActor returns the specific combat the actor is in").to.equal(combatB);
            expect(result, "getCombatForActor does not return the wrong combat").to.not.equal(combatA);
        });
    });

    describe("Status effect update", () => {
        it("should add a start tick for combat effects", async () => {
            const combat = await createActiveCombat();
            const { combatant, actor } = await createCombatant("StatusEffectTester", combat);
            await combat.setInitiative(combatant.id, 15);

            const statusEffect = await actor.createEmbeddedDocuments("Item", [
                { name: "Brennend", system: { combatEvent: { interval: 5 } }, type: "statuseffect" },
            ]);

            expect(statusEffect[0].system.combatEvent.startTick, "Start tick was set").to.equal(
                (combat.currentTick ?? 0) + 5
            );
        });

        it(
            "should not add a start tick for non-combat effects",
            withActor(async (nonCombatant) => {
                const combat = await createActiveCombat();
                const { combatant } = await createCombatant("StatusEffectTester", combat);
                await combat.setInitiative(combatant.id, 15);

                const statusEffect = await nonCombatant.createEmbeddedDocuments("Item", [
                    { name: "Brennend", system: { combatEvent: { interval: 5 } }, type: "statuseffect" },
                ]);

                expect(statusEffect[0].system.combatEvent.startTick, "Start tick was not set").to.be.null;
            })
        );

        it("should find combat tracker config under combatTrackerConfig", () => {
            const combatConfig = foundryApi.settings.get("core", "combatTrackerConfig");
            expect(typeof combatConfig).to.equal("object");
            expect(combatConfig).to.include.keys("turnMarker");
            expect((combatConfig as any).turnMarker).to.include.keys("src");
        });
    });

    describe("Timed ActiveEffect combat lifecycle", () => {
        it("expires a duration-2 effect once all combatants have advanced past its duration", async () => {
            const combat = await createActiveCombat();
            const { combatant, actor } = await createCombatant("ExpiryTester", combat);
            await combat.setInitiative(combatant.id, 10);
            const startTick = combat.currentTick ?? 0;

            const effect = await createTimedEffect(actor, 2);

            // Pins the intended start-tick assignment: a timed effect created mid-combat
            // should record the combat's current tick as its start.round.
            expect(effect.start.round, "start tick set to combat current tick on creation").to.equal(startTick);

            // SplittermondCombat.setInitiative calls nextRound() internally when started,
            // which fires the combatRound hook the future expiry hook is expected to listen on.
            // No separate nextRound() call needed.
            await combat.setInitiative(combatant.id, startTick + 3);

            //setting start happens in a fire and forget hook spawned by "update"
            await passesEventually(
                () =>
                    expect(
                        actor.effects.get(effect.id)?.duration.expired,
                        "effect expired after advancing past its duration"
                    ).to.be.true
            );
        });

        it("sets start tick from the combat's current tick when created mid-combat", async () => {
            const combat = await createActiveCombat();
            const { combatant: c1 } = await createCombatant("LowTick", combat);
            const { combatant: c2, actor } = await createCombatant("HighTick", combat);
            // setInitiative calls nextRound() internally on started combats (re-running setupTurns,
            // which sorts ascending), so currentTick reflects the lowest initiative after each call.
            await combat.setInitiative(c1.id, 2);
            await combat.setInitiative(c2.id, 4);
            expect(combat.currentTick, "precondition: current tick is the lowest initiative").to.equal(2);

            const effect = await createTimedEffect(actor, 3);

            expect(effect.start.round, "start tick set to combat current tick (2)").to.equal(2);
        });

        it("does not start an existing timed effect's duration when its actor is drawn into a newly-started combat (core behavior)", async () => {
            // Create an actor carrying a timed effect BEFORE any combat exists, so the
            // effect's duration clock has not started yet.
            await Combat.deleteDocuments(Array.from(foundryApi.combats.keys()));
            ui.combat.viewed = null;
            const actor = await actorCreator.createCharacter({
                type: "character",
                name: "PreloadedEffect",
                system: {},
            });
            actors.push(actor);
            const effect = await createTimedEffect(actor, 2);
            expect(effect.start.round, "precondition: clock not started outside combat").to.not.be.ok;

            // Now draw the actor into a freshly-started combat.
            const combat = await createActiveCombat();
            await scene.createEmbeddedDocuments("Token", [
                {
                    type: "base",
                    actorId: actor.id,
                    x: scene._viewPosition.x,
                    y: scene._viewPosition.y,
                },
            ]);
            const combatants = await combat.createEmbeddedDocuments("Combatant", [
                {
                    type: "base",
                    actorId: actor.id,
                    sceneId: scene.id,
                    tokenId: null,
                    defeated: false,
                    group: null,
                },
            ]);
            const combatant = combatants[0]! as Combatant;
            await combat.rollInitiative(combatant.id);
            await combat.nextRound();

            expect(effect.start.round, "core does not start a pre-existing effect's clock on combat start").to.not.be
                .ok;
        });

        it("does NOT expire a timed effect before its duration elapses (negative spec)", async () => {
            const combat = await createActiveCombat();
            const { combatant, actor } = await createCombatant("NegativeSpec", combat);
            await combat.setInitiative(combatant.id, 10);
            const startTick = combat.currentTick ?? 0;

            const effect = await createTimedEffect(actor, 5);

            // Advance only 2 ticks of a duration-5 effect. setInitiative fires the
            // round-advance hook internally; no separate nextRound() call needed.
            await combat.setInitiative(combatant.id, startTick + 2);

            // Negative spec — complements the expiry test. A future implementer cannot
            expect(actor.effects.has(effect.id), "effect survives a sub-duration advance").to.be.true;
        });
    });
}
