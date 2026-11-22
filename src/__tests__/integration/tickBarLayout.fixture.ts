import type TickBarHud from "module/apps/tick-bar-hud/tick-bar-hud";
import { foundryApi } from "module/api/foundryApi";
import type { FoundryScene } from "module/api/foundryTypes";
import SplittermondCombat from "module/combat/combat";
import { withActor, withScene } from "./fixtures";
import { VisibleLayout } from "./tickBarLayout.visibility";

declare const game: { splittermond: { tickBarHud: TickBarHud } };
declare const canvas: { ready: boolean; loading: boolean; scene: FoundryScene | null };
declare const ui: {
    nav: {
        expanded: boolean;
        toggleExpanded(): void;
    };
};

interface LayoutFixture {
    scene: FoundryScene;
    hud: TickBarHud;
    expandNavigation(): void;
    collapseNavigation(): void;
    expectLayout(expectation: () => void): Promise<void>;
}

export function withTickBarLayout(test: (fixture: LayoutFixture) => Promise<void>) {
    return async function (this: Mocha.Context) {
        using layout = new VisibleLayout(this.runnable(), document);
        await layout.nextVisibleFrame();
        // Use the existing scene-lifecycle budget, separately from the 500 ms layout assertions.
        const waitForCanvas = (scene?: FoundryScene) =>
            layout.expect(() => {
                if (canvas.loading || (scene && (!canvas.ready || canvas.scene?.id !== scene.id))) {
                    throw new Error(`Canvas is not ready for ${scene?.name ?? "a scene change"}`);
                }
            }, 10000);
        const viewScene = async (scene: FoundryScene) => {
            // Foundry can ignore a view request while the previous canvas is still loading.
            await waitForCanvas();
            await scene.view();
            await waitForCanvas(scene);
        };
        await withScene(async (scene) => {
            await withActor(async (actor) => {
                const previousView = foundryApi.currentScene;
                const previousActiveScene = foundryApi.scenes.find((entry) => entry.active);
                const previousCombat = foundryApi.combat;
                const expanded = ui.nav.expanded;
                const hud = game.splittermond.tickBarHud;
                const combat = (await SplittermondCombat.create({})) as SplittermondCombat;
                try {
                    await viewScene(scene);
                    await scene.activate();
                    await waitForCanvas(scene);
                    setNavigationExpanded(false);
                    await combat.update({ active: true });
                    await combat.createEmbeddedDocuments("Combatant", [{ actorId: actor.id, initiative: 10 }]);
                    await combat.startCombat();
                    await hud.render(true);
                    await test({
                        scene,
                        hud,
                        expandNavigation: () => setNavigationExpanded(true),
                        collapseNavigation: () => setNavigationExpanded(false),
                        expectLayout: (expectation) => layout.expect(expectation),
                    });
                } finally {
                    await combat.delete();
                    if (previousCombat && !previousCombat.isActive) await previousCombat.update({ active: true });
                    if (previousActiveScene) {
                        await viewScene(previousActiveScene);
                        await previousActiveScene.activate();
                    } else await scene.update({ active: false });
                    // Restore the viewed scene separately; it need not be the active scene.
                    if (previousView) await viewScene(previousView);
                    else await scene.unview();
                    if (expanded) setNavigationExpanded(true);
                    else setNavigationExpanded(false);
                    await hud.render(true);
                }
            })();
        })();
    };
}

function setNavigationExpanded(expanded: boolean) {
    if (ui.nav.expanded !== expanded) ui.nav.toggleExpanded();
}
