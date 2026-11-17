import type TickBarHud from "module/apps/tick-bar-hud/tick-bar-hud";
import { foundryApi } from "module/api/foundryApi";
import type { FoundryScene } from "module/api/foundryTypes";
import SplittermondCombat from "module/combat/combat";
import { withActor, withScene } from "./fixtures";

declare const game: { splittermond: { tickBarHud: TickBarHud } };
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
}

export function withTickBarLayout(test: (fixture: LayoutFixture) => Promise<void>) {
    return withScene(async (scene) => {
        await withActor(async (actor) => {
            const previousView = foundryApi.currentScene;
            const previousActiveScene = foundryApi.scenes.find((entry) => entry.active);
            const previousCombat = foundryApi.combat;
            const expanded = ui.nav.expanded;
            const hud = game.splittermond.tickBarHud;
            const combat = (await SplittermondCombat.create({})) as SplittermondCombat;
            try {
                await scene.view();
                await scene.activate();
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
                });
            } finally {
                await combat.delete();
                if (previousCombat && !previousCombat.isActive) await previousCombat.update({ active: true });
                if (previousActiveScene) {
                    await previousActiveScene.view();
                    await previousActiveScene.activate();
                } else await scene.update({ active: false });
                // Restore the viewed scene separately; it need not be the active scene.
                if (previousView) await previousView.view();
                else await scene.unview();
                if (expanded) setNavigationExpanded(true);
                else setNavigationExpanded(false);
                await hud.render(true);
            }
        })();
    });
}

function setNavigationExpanded(expanded: boolean) {
    if (ui.nav.expanded !== expanded) ui.nav.toggleExpanded();
}
