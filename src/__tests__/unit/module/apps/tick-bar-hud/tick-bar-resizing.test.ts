import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import TickBarHud from "../../../../../module/apps/tick-bar-hud/tick-bar-hud";
import { createHtml } from "../../../../handlebarHarness";
import { JSDOM } from "jsdom";
import {
    foundryUISelectors,
    initMaxWidthTransitionForTickBarHud,
} from "../../../../../module/apps/tick-bar-hud/tickBarResizing";
import { addNewCombatant, createCombat } from "./tickBarHudTestHelpers";
import { foundryApi } from "../../../../../module/api/foundryApi";

import { expectEventually } from "../../../testUtils";

async function setupTickBarHud() {
    const underTest = new TickBarHud();
    // @ts-expect-error options are readonly
    underTest.options = TickBarHud.DEFAULT_OPTIONS;

    const context = await underTest._prepareContext({ parts: [] });
    const html = `
      <div id="ui-left-column-1" style="width: 200px; height: 100vh; position: absolute; left: 0; top: 0;"></div>
      ${createHtml("./templates/apps/tick-bar-hud.hbs", context)}
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
    underTest.element = dom.window.document.body;

    Object.defineProperty(global, "window", { value: dom.window, writable: true });
    global.MutationObserver = dom.window.MutationObserver;

    afterEach(() => {
        Object.defineProperty(global, "window", { value: undefined, writable: true });
        //@ts-ignore
        global.requestAnimationFrame = undefined;
        //@ts-ignore
        global.MutationObserver = undefined;
    });

    return { underTest, dom };
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

            // Result: Window resize listener should be added
            expect(addEventListenerSpy.callCount).to.equal(1);
            expect(addEventListenerSpy.firstCall.firstArg).to.equal("resize");
            expect(typeof addEventListenerSpy.firstCall.lastArg).to.equal("function");
        });

        it("should initialize sidebar toggle listener", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebarToggle = underTest.element.querySelector(
                foundryUISelectors.sidebarExpansionToggle
            ) as HTMLElement;

            const addEventListenerSpy = sandbox.spy(sidebarToggle, "addEventListener");

            initMaxWidthTransitionForTickBarHud(underTest);

            expect(addEventListenerSpy.firstCall?.firstArg).to.equal("click");
            expect(typeof addEventListenerSpy.firstCall?.lastArg).to.equal("function");
        });

        it("should initialize mutation observer for sidebar changes", async () => {
            const { underTest, dom } = await setupTickBarHud();
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;

            const observeStub = sandbox.stub(dom.window.MutationObserver.prototype, "observe");

            initMaxWidthTransitionForTickBarHud(underTest);

            expect(observeStub.firstCall?.firstArg).to.equal(sidebar);
            expect(observeStub.firstCall?.lastArg).to.deep.equal({
                attributes: true,
                attributeFilter: ["class", "style"],
            });
        });
    });

    describe("positionTickBarHudBetweenElements", () => {
        it("should calculate correct max width when all elements present", async () => {
            const { underTest } = await setupTickBarHud();
            const leftColumn = underTest.element.querySelector(foundryUISelectors.controlPanel) as HTMLElement;
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;
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
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;
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
            const leftColumn = underTest.element.querySelector(foundryUISelectors.controlPanel) as HTMLElement;
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
            const sidebarToggle = underTest.element.querySelector(
                foundryUISelectors.sidebarExpansionToggle
            ) as HTMLElement;
            const leftColumn = underTest.element.querySelector(foundryUISelectors.controlPanel) as HTMLElement;
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;
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
            const sidebarToggle = underTest.element.querySelector(
                foundryUISelectors.sidebarButtons + "[data-action=tab]"
            ) as HTMLElement;
            const leftColumn = underTest.element.querySelector(foundryUISelectors.controlPanel) as HTMLElement;
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;
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
            const sidebarToggle = underTest.element.querySelector(
                foundryUISelectors.sidebarButtons + "[data-action=tab]"
            ) as HTMLElement;
            const leftColumn = underTest.element.querySelector(foundryUISelectors.controlPanel) as HTMLElement;
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;
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
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;
            initMaxWidthTransitionForTickBarHud(underTest);

            sidebar.setAttribute("style", sidebar.getAttribute("style") + "; width: 300px;");

            await expectEventually(() => requestAnimationFrameStub.callCount === 2);
        });

        it("should reposition on sidebar class changes", async () => {
            const { underTest } = await setupTickBarHud();
            const sidebar = underTest.element.querySelector(foundryUISelectors.sidebar) as HTMLElement;
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
