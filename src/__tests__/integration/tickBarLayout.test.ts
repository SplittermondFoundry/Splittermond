import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryUISelectors } from "module/apps/tick-bar-hud/tickBarResizing";
import { withTickBarLayout } from "./tickBarLayout.fixture";

export function tickBarLayoutTests({ describe, it, expect }: QuenchBatchContext) {
    function expectSpaceBesideNavigation(bar: HTMLElement, menu: Element) {
        const barRect = bar.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const sidebarRect = bar.ownerDocument.querySelector(foundryUISelectors.sidebar)!.getBoundingClientRect();
        expect(barRect.height, "the combat's tick bar is visible").to.be.greaterThan(0);
        expect(menuRect.bottom, "the menu extends into the tick bar's height").to.be.greaterThan(barRect.top);
        expect(barRect.left, "tick bar starts after the visible navigation menu").to.be.greaterThan(menuRect.right);
        expect(barRect.right, "tick bar ends before the sidebar").to.be.lessThan(sidebarRect.left);
    }

    describe("Tick bar navigation layout", function () {
        // Real scene drawing and restoration took 2.6 s on a cold local run.
        // Include that lifecycle work and the throttled-browser verification.
        this.timeout(10000);
        it(
            "makes room for scene levels after navigation and HUD renders",
            withTickBarLayout(async ({ scene, hud, expectLayout }) => {
                const [upperFloor] = await scene.createEmbeddedDocuments("Level", [{ name: "Upper Floor" }]);

                await expectLayout(() => {
                    const levels = hud.element.ownerDocument.querySelector("#scene-navigation-levels");
                    expect(levels, "Foundry renders the level selector").to.exist;
                    expect(
                        levels!.querySelector(`[data-scene-id="${scene.id}"][data-level-id="${upperFloor.id}"]`),
                        "navigation has rendered the new level of the viewed test scene"
                    ).to.exist;
                    expectSpaceBesideNavigation(hud.element.querySelector<HTMLElement>(".tick-bar-hud")!, levels!);
                });

                await hud.render(true);

                await expectLayout(() =>
                    expectSpaceBesideNavigation(
                        hud.element.querySelector<HTMLElement>(".tick-bar-hud")!,
                        hud.element.ownerDocument.querySelector("#scene-navigation-levels")!
                    )
                );
            })
        );

        it(
            "reserves navigation space on expansion and reclaims it on collapse",
            withTickBarLayout(async ({ hud, expandNavigation, collapseNavigation, expectLayout }) => {
                const bar = hud.element.querySelector<HTMLElement>(".tick-bar-hud")!;
                await expectLayout(() =>
                    expect(bar.getBoundingClientRect().left, "single scene leaves room below its name").to.equal(110)
                );
                await expandNavigation();

                await expectLayout(() =>
                    expectSpaceBesideNavigation(
                        bar,
                        hud.element.ownerDocument.querySelector("#scene-navigation-inactive")!
                    )
                );

                await collapseNavigation();

                await expectLayout(() =>
                    expect(bar.getBoundingClientRect().left, "collapsed scenes release their space").to.equal(110)
                );
            })
        );
    });
}
