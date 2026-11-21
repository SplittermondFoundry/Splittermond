import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import type { FoundryApplication } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";
import type { FoundryCombat, FoundryScene } from "module/api/foundryTypes";
import type SplittermondActor from "module/actor/actor";
import { withActor, withScene } from "./fixtures";
import { passesEventually } from "../util";

declare const canvas: { ready: boolean };
declare const ui: {
    combat: Pick<InstanceType<typeof FoundryApplication>, "render" | "element"> & { viewed: FoundryCombat | null };
};

export function combatSceneBindingTests(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    function withCombatScene<P extends unknown[]>(
        test: (scene: FoundryScene, combats: FoundryCombat[], ...args: P) => Promise<void>
    ) {
        return withScene(async (scene, ...args: P) => {
            const originalScene = foundryApi.currentScene;
            const originalCombat = ui.combat.viewed;
            const combats: FoundryCombat[] = [];
            const hook = foundryApi.hooks.on("createCombat", (combat: FoundryCombat) => combats.push(combat));
            try {
                await passesEventually(() => expect(canvas.ready).to.be.true, 5000);
                await scene.view();
                await test(scene, combats, ...args);
            } finally {
                foundryApi.hooks.off("createCombat", hook);
                // Remove combats before withScene deletes the scene they reference.
                if (ui.combat.viewed && combats.includes(ui.combat.viewed)) ui.combat.viewed = null;
                await Combat.deleteDocuments(combats.map((combat) => combat.id));
                await originalScene?.view();
                ui.combat.viewed = originalCombat;
            }
        });
    }

    describe("Combat scene binding", function () {
        // Each scenario draws and restores a real canvas; the observed transition can exceed two seconds.
        this.timeout(10000);

        it(
            "links a combat created through the tracker to the viewed scene instead of the active scene",
            withCombatScene(async (scene, combats) => {
                expect(scene.active).to.be.false;
                expect(foundryApi.currentScene).to.equal(scene);
                await ui.combat.render({ force: true });
                const button = ui.combat.element.querySelector<HTMLElement>('[data-action="createCombat"]');
                expect(button, "the tracker offers its normal create action").not.to.be.null;

                button!.click();
                await passesEventually(() => expect(combats).to.have.length(1));

                expect(combats[0].scene).to.equal(scene);
                expect(scene.active, "creating a combat must not activate the scene for players").to.be.false;
            })
        );

        it(
            "defaults a combat created without scene data to the viewed scene",
            withCombatScene(async (scene) => {
                const combat = (await Combat.create({ active: true })) as FoundryCombat;

                expect(combat.scene).to.equal(scene);
            })
        );

        it(
            "preserves an explicitly supplied scene instead of replacing it with the viewed scene",
            withCombatScene(async (scene) => {
                const otherScene = foundryApi.scenes.find((candidate) => candidate.id !== scene.id)!;

                const combat = (await Combat.create({ scene: otherScene.id })) as FoundryCombat;

                expect(combat.scene).to.equal(otherScene);
            })
        );

        it(
            "preserves an explicitly unbound combat at creation",
            withCombatScene(async () => {
                const combat = (await Combat.create({ scene: null })) as FoundryCombat;

                expect(combat.scene).to.be.null;
            })
        );

        it(
            "keeps the creation scene when combat starts after navigating to another scene",
            withActor(
                withCombatScene(async (scene, _combats, actor: SplittermondActor) => {
                    const combat = (await Combat.create({
                        combatants: [{ actorId: actor.id, initiative: 10 }],
                    })) as FoundryCombat;
                    expect(combat.scene).to.equal(scene);
                    const otherScene = foundryApi.scenes.find((candidate) => candidate.id !== scene.id)!;
                    await otherScene.view();

                    await combat.startCombat();

                    expect(combat.scene).to.equal(scene);
                })
            )
        );

        it(
            "keeps a deliberately unlinked combat unbound when combat starts",
            withActor(
                withCombatScene(async (scene, _combats, actor: SplittermondActor) => {
                    const combat = (await Combat.create({
                        scene: scene.id,
                        combatants: [{ actorId: actor.id, initiative: 10 }],
                    })) as FoundryCombat;
                    await combat.update({ scene: null });

                    await combat.startCombat();

                    expect(combat.scene).to.be.null;
                })
            )
        );
    });
}
