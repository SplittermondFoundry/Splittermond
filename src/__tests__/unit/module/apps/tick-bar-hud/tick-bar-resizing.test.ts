import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import TickBarHud from "../../../../../module/apps/tick-bar-hud/tick-bar-hud";
import { createHtml } from "__tests__/handlebarHarness";
import { JSDOM } from "jsdom";
import { foundryUISelectors, initMaxWidthTransitionForTickBarHud } from "module/apps/tick-bar-hud/tickBarResizing";
import { addNewCombatant, createCombat } from "./tickBarHudTestHelpers";
import { foundryApi } from "module/api/foundryApi";

import { expectEventually } from "../../../testUtils";

async function setupTickBarHud() {
    const underTest = new TickBarHud();
    // @ts-expect-error options are readonly
    underTest.options = TickBarHud.DEFAULT_OPTIONS;

    const context = await underTest._prepareContext({ parts: [] });
    // Mirror Foundry's production structure: the sidebar and control panel are
    // document-level siblings of the tick bar HUD application.
    const html = `
      <div id="ui-left-column-1" style="width: 200px; height: 100vh; position: absolute; left: 0; top: 0;"></div>
      <div id="ui-left-column-2">
        <nav id="scene-navigation">
          <menu id="scene-navigation-viewed" class="scene-navigation-menu"><li>Scene</li></menu>
          <menu id="scene-navigation-levels" class="scene-navigation-menu"><li>Ground</li></menu>
        </nav>
      </div>
      <div id="tick-bar-hud-application">
        ${createHtml("./templates/apps/tick-bar-hud.hbs", context)}
      </div>
      <div id="sidebar" style="width: 200px; height: 100vh; position: absolute; left: 0; top: 0;">
        <menu>
        <li>
            <button data-action="tab"></button>
            </li>
        <li>
            <button class="collapse" data-action="toggleState">Toggle</button>
            </li>
        </menu>
        <div id="sidebar-content"></div>
      </div>
      `;
    const dom = new JSDOM(html);
    // @ts-expect-error element is readonly
    underTest.element = dom.window.document.querySelector("#tick-bar-hud-application") as HTMLElement;

    Object.defineProperty(global, "window", { value: dom.window, writable: true });
    global.MutationObserver = dom.window.MutationObserver;
    const resizeObservers: { callback: ResizeObserverCallback; observer: ResizeObserver }[] = [];
    global.ResizeObserver = class implements ResizeObserver {
        constructor(callback: ResizeObserverCallback) {
            resizeObservers.push({ callback, observer: this });
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    };

    afterEach(() => {
        dom.window.close();
        Object.defineProperty(global, "window", { value: undefined, writable: true });
        //@ts-ignore
        global.requestAnimationFrame = undefined;
        //@ts-ignore
        global.MutationObserver = undefined;
        Reflect.deleteProperty(global, "ResizeObserver");
    });

    return { underTest, dom, resizeObservers };
}

describe("tick-bar-resizing", () => {
    let sandbox: sinon.SinonSandbox;
    let requestAnimationFrameStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        const combat = createCombat(sandbox, { isActive: true, started: true });
        addNewCombatant(sandbox, combat, { initiative: 10, visible: true, name: "Fighter" });

        sandbox.stub(foundryApi, "combats").get(() => [combat]);
        sandbox.stub(foundryApi, "currentScene").get(() => ({ id: "sceneId" }));
        requestAnimationFrameStub = sandbox.stub();

        global.requestAnimationFrame = requestAnimationFrameStub;
    });
    afterEach(() => sandbox.restore());

    describe("initMaxWidthTransitionForTickBarHud", () => {
        it("should add window resize event listener", async () => {
            // Setup: Create mock TickBarHud and spy on window.addEventListener
            const { underTest, dom } = await setupTickBarHud();
            const addEventListenerSpy = sandbox.spy(dom.window, "addEventListener");

            // Action: Call initMaxWidthTransitionForTickBarHud
            initMaxWidthTransitionForTickBarHud(underTest);

            // Result: Window resize listener should be added. Other listeners may be added by jsdom's
            // selector engine on first .matches() usage, so we assert on the resize call specifically.
            const resizeCalls = addEventListenerSpy.getCalls().filter((call) => call.args[0] === "resize");
            expect(resizeCalls.length).to.be.at.least(1);
            expect(typeof resizeCalls[0].args[1]).to.equal("function");
        });

        it("should initialize sidebar toggle listener", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebarToggle = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.sidebarExpansionToggle
            ) as HTMLElement;

            const addEventListenerSpy = sandbox.spy(sidebarToggle, "addEventListener");

            initMaxWidthTransitionForTickBarHud(underTest);

            expect(addEventListenerSpy.firstCall?.firstArg).to.equal("click");
            expect(typeof addEventListenerSpy.firstCall?.lastArg).to.equal("function");
        });

        it("should initialize mutation observer for sidebar changes", async () => {
            const { underTest, dom } = await setupTickBarHud();
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;

            const observeStub = sandbox.stub(dom.window.MutationObserver.prototype, "observe");

            initMaxWidthTransitionForTickBarHud(underTest);

            expect(observeStub.firstCall?.firstArg).to.equal(sidebar);
            expect(observeStub.firstCall?.lastArg).to.deep.equal({
                attributes: true,
                attributeFilter: ["class", "style"],
            });
        });

        it("should reposition after timeout", async () => {
            const { underTest, dom } = await setupTickBarHud();
            const leftColumn = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.controlPanel
            ) as HTMLElement;
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            const tickBarElement = underTest.element.querySelector(".tick-bar-hud") as HTMLElement;
            sandbox.stub(leftColumn, "getBoundingClientRect").returns({ right: 250 } as DOMRect);
            const sidebarRectStub = sandbox.stub(sidebar, "getBoundingClientRect").returns({ left: 400 } as DOMRect);
            const setTimeoutStub = sandbox.stub(dom.window, "setTimeout");

            initMaxWidthTransitionForTickBarHud(underTest);
            requestAnimationFrameStub.firstCall.firstArg();
            expect(tickBarElement.style.maxWidth).to.equal("120px");

            sidebarRectStub.returns({ left: 800 } as DOMRect);
            expect(setTimeoutStub.callCount).to.equal(2);
            setTimeoutStub.secondCall.firstArg();
            requestAnimationFrameStub.lastCall.firstArg();

            expect(tickBarElement.style.maxWidth).to.equal("520px");
        });
    });

    describe("positionTickBarHudBetweenElements", () => {
        async function setupNavigationOverlap() {
            const fixture = await setupTickBarHud();
            const { underTest, dom } = fixture;
            const doc = dom.window.document;
            const bar = underTest.element.querySelector<HTMLElement>(".tick-bar-hud")!;
            bar.style.left = "110px";
            const levels = doc.querySelector<HTMLElement>("#scene-navigation-levels")!;
            sandbox
                .stub(doc.querySelector("#ui-left-column-1")!, "getBoundingClientRect")
                .returns(new dom.window.DOMRect(16, 16, 72, 968));
            sandbox
                .stub(doc.querySelector("#sidebar")!, "getBoundingClientRect")
                .returns(new dom.window.DOMRect(800, 0, 200, 1000));
            sandbox.stub(bar, "getBoundingClientRect").returns(new dom.window.DOMRect(110, 60, 670, 84));
            sandbox
                .stub(doc.querySelector("#scene-navigation")!, "getBoundingClientRect")
                .returns(new dom.window.DOMRect(104, 16, 200, 968));
            sandbox
                .stub(doc.querySelector("#scene-navigation-viewed")!, "getBoundingClientRect")
                .returns(new dom.window.DOMRect(104, 16, 170, 32));
            const levelsRect = sandbox
                .stub(levels, "getBoundingClientRect")
                .returns(new dom.window.DOMRect(104, 56, 170, 80));
            return { ...fixture, bar, levels, levelsRect };
        }

        it("places the bar beside overlapping levels and keeps its right edge before the sidebar", async () => {
            const { underTest, bar } = await setupNavigationOverlap();

            initMaxWidthTransitionForTickBarHud(underTest);
            requestAnimationFrameStub.firstCall.firstArg();

            expect(parseFloat(bar.style.left), "bar starts after the levels' right edge").to.be.greaterThan(274);
            expect(
                parseFloat(bar.style.left) + parseFloat(bar.style.maxWidth),
                "bar ends before the sidebar"
            ).to.be.lessThan(800);
        });

        for (const visibility of ["hidden", "collapse"] as const) {
            it(`ignores ${visibility} navigation even when it occupies layout space`, async () => {
                const { underTest, bar, levels } = await setupNavigationOverlap();
                levels.style.visibility = visibility;

                initMaxWidthTransitionForTickBarHud(underTest);
                requestAnimationFrameStub.firstCall.firstArg();

                expect(bar.style.left).to.equal("110px");
            });
        }

        it("keeps the default position when navigation is above the bar or empty", async () => {
            const { underTest, bar, levels } = await setupNavigationOverlap();
            levels.replaceChildren();

            initMaxWidthTransitionForTickBarHud(underTest);
            requestAnimationFrameStub.firstCall.firstArg();

            expect(bar.style.left).to.equal("110px");
        });

        it("uses the normal position when the scene navigation is missing", async () => {
            const { underTest, dom, bar } = await setupNavigationOverlap();
            dom.window.document.querySelector("#scene-navigation")!.remove();

            initMaxWidthTransitionForTickBarHud(underTest);
            requestAnimationFrameStub.firstCall.firstArg();

            expect(bar.style.left).to.equal("110px");
        });

        it("does not assign a negative width when navigation reaches the sidebar", async () => {
            const { underTest, dom, bar, levelsRect } = await setupNavigationOverlap();
            levelsRect.returns(new dom.window.DOMRect(104, 56, 700, 80));

            initMaxWidthTransitionForTickBarHud(underTest);
            requestAnimationFrameStub.firstCall.firstArg();

            expect(bar.style.maxWidth).to.equal("0px");
        });

        it("reclaims space after the level menu is removed by a navigation render", async () => {
            const { underTest, bar, levels } = await setupNavigationOverlap();
            initMaxWidthTransitionForTickBarHud(underTest);
            requestAnimationFrameStub.firstCall.firstArg();
            expect(parseFloat(bar.style.left)).to.be.greaterThan(274);
            requestAnimationFrameStub.resetHistory();

            levels.remove();
            await expectEventually(() => requestAnimationFrameStub.called);
            requestAnimationFrameStub.lastCall.firstArg();

            expect(bar.style.left).to.equal("110px");
        });

        it("repositions when a navigation menu changes size", async () => {
            const { underTest, dom, bar, levelsRect, resizeObservers } = await setupNavigationOverlap();
            initMaxWidthTransitionForTickBarHud(underTest);
            requestAnimationFrameStub.firstCall.firstArg();

            levelsRect.returns(new dom.window.DOMRect(104, 56, 270, 80));
            for (const { callback, observer } of resizeObservers) callback([], observer);
            requestAnimationFrameStub.lastCall.firstArg();

            expect(parseFloat(bar.style.left)).to.be.greaterThan(374);
            expect(parseFloat(bar.style.left) + parseFloat(bar.style.maxWidth)).to.be.lessThan(800);
        });

        it("stops observing navigation when the HUD closes", async () => {
            const { underTest, dom, levels, resizeObservers } = await setupNavigationOverlap();
            const listeners = sandbox.spy(underTest, "addEventListener");
            initMaxWidthTransitionForTickBarHud(underTest);
            const disconnect = sandbox.spy(resizeObservers[0].observer, "disconnect");

            listeners.withArgs("close").firstCall.args[1](new dom.window.Event("close"));
            requestAnimationFrameStub.resetHistory();
            levels.remove();
            await new Promise<void>((resolve) => dom.window.queueMicrotask(resolve));

            expect(requestAnimationFrameStub.called, "closed HUD ignores subsequent navigation changes").to.be.false;
            expect(disconnect.calledOnce, "menu size observations are disconnected").to.be.true;
        });

        it("should calculate correct max width when all elements present", async () => {
            const { underTest } = await setupTickBarHud();
            const leftColumn = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.controlPanel
            ) as HTMLElement;
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            const tickBarElement = underTest.element.querySelector(".tick-bar-hud") as HTMLElement;

            sandbox.stub(leftColumn, "getBoundingClientRect").returns({ right: 250 } as DOMRect);
            sandbox.stub(sidebar, "getBoundingClientRect").returns({ left: 800 } as DOMRect);

            initMaxWidthTransitionForTickBarHud(underTest);

            await expectEventually(() => requestAnimationFrameStub.called);

            const callback = requestAnimationFrameStub.firstCall.firstArg;
            callback();

            expect(tickBarElement.style.maxWidth).to.equal("520px");
        });

        it("should handle missing sidebar element gracefully", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            sidebar.remove();

            expect(() => initMaxWidthTransitionForTickBarHud(underTest)).not.to.throw();
        });

        it("should handle missing tick bar element gracefully", async () => {
            const { underTest } = await setupTickBarHud();
            const tickBarElement = underTest.element.querySelector(".tick-bar-hud") as HTMLElement;
            tickBarElement.remove();

            const consoleWarnStub = sandbox.spy(console, "warn");

            initMaxWidthTransitionForTickBarHud(underTest);

            expect(consoleWarnStub.firstCall?.firstArg).to.include("Could not find necessary Foundry UI elements");
            expect(requestAnimationFrameStub.called).to.be.false;
        });

        it("should handle missing left column element gracefully", async () => {
            const { underTest } = await setupTickBarHud();
            const leftColumn = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.controlPanel
            ) as HTMLElement;
            leftColumn.remove();

            const consoleWarnStub = sandbox.spy(console, "warn");

            initMaxWidthTransitionForTickBarHud(underTest);

            expect(consoleWarnStub.firstCall?.firstArg).to.include("Could not find necessary Foundry UI elements");
            expect(requestAnimationFrameStub.called).to.be.false;
        });
    });

    describe("sidebar toggle listener", () => {
        it("should reposition tick bar after sidebar toggle with delay", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebarToggle = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.sidebarExpansionToggle
            ) as HTMLElement;
            const leftColumn = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.controlPanel
            ) as HTMLElement;
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            sandbox.stub(leftColumn, "getBoundingClientRect").returns({ right: 250 } as DOMRect);
            sandbox.stub(sidebar, "getBoundingClientRect").returns({ left: 800 } as DOMRect);

            initMaxWidthTransitionForTickBarHud(underTest);
            const setTimeoutStub = sandbox.stub(global, "setTimeout");

            requestAnimationFrameStub.resetHistory();

            sidebarToggle.click();

            //Positioning should be scheduled twice with increasing delays
            expect(setTimeoutStub.callCount).to.equal(2);
            expect(setTimeoutStub.firstCall.lastArg).to.be.lessThan(setTimeoutStub.secondCall.lastArg);

            // Execute the timeout callbacks to verify positioning is called
            setTimeoutStub.firstCall.firstArg();
            setTimeoutStub.secondCall.firstArg();

            expect(requestAnimationFrameStub.callCount).to.equal(2);
        });

        it("should reposition tick bar when sidebar gets expanded by button click", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebarToggle = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.sidebarButtons + "[data-action=tab]"
            ) as HTMLElement;
            const leftColumn = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.controlPanel
            ) as HTMLElement;
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            sandbox.stub(leftColumn, "getBoundingClientRect").returns({ right: 250 } as DOMRect);
            sandbox.stub(sidebar, "getBoundingClientRect").returns({ left: 800 } as DOMRect);

            initMaxWidthTransitionForTickBarHud(underTest);
            const setTimeoutStub = sandbox.stub(global, "setTimeout");

            requestAnimationFrameStub.resetHistory();

            sidebarToggle.click();

            //Positioning should be scheduled twice with increasing delays
            expect(setTimeoutStub.callCount).to.equal(2);
            expect(setTimeoutStub.firstCall.lastArg).to.be.lessThan(setTimeoutStub.secondCall.lastArg);

            // Execute the timeout callbacks to verify positioning is called
            setTimeoutStub.firstCall.firstArg();
            setTimeoutStub.secondCall.firstArg();

            expect(requestAnimationFrameStub.callCount).to.equal(2);
        });

        it("should not reposition tick bar when button clicked on expanded sidebar", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebarToggle = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.sidebarButtons + "[data-action=tab]"
            ) as HTMLElement;
            const leftColumn = underTest.element.ownerDocument.querySelector(
                foundryUISelectors.controlPanel
            ) as HTMLElement;
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            sidebar.querySelector(foundryUISelectors.sidebarContent)?.classList.add("expanded");
            sandbox.stub(leftColumn, "getBoundingClientRect").returns({ right: 250 } as DOMRect);
            sandbox.stub(sidebar, "getBoundingClientRect").returns({ left: 800 } as DOMRect);

            initMaxWidthTransitionForTickBarHud(underTest);
            const setTimeoutStub = sandbox.stub(global, "setTimeout");

            requestAnimationFrameStub.resetHistory();

            sidebarToggle.click();

            expect(setTimeoutStub.callCount).to.equal(0);
        });
    });

    describe("sidebar mutation observer", () => {
        it("should reposition on sidebar style changes", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            initMaxWidthTransitionForTickBarHud(underTest);

            sidebar.setAttribute("style", sidebar.getAttribute("style") + "; width: 300px;");

            await expectEventually(() => requestAnimationFrameStub.callCount === 2);
        });

        it("should reposition on sidebar class changes", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebar = underTest.element.ownerDocument.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            initMaxWidthTransitionForTickBarHud(underTest);

            sidebar.classList.add("some-class");

            await expectEventually(() => requestAnimationFrameStub.callCount === 2);
        });

        it("should not reposition when changes come from tick bar element", async () => {
            const { underTest } = await setupTickBarHud();
            const tickBarElement = underTest.element.querySelector(".tick-bar-hud") as HTMLElement;
            initMaxWidthTransitionForTickBarHud(underTest);

            requestAnimationFrameStub.resetHistory();

            tickBarElement.setAttribute("style", tickBarElement.getAttribute("style") + "; max-width: 500px;");

            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(requestAnimationFrameStub.called).to.be.false;
        });
    });
});
