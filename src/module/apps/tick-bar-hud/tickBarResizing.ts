import type { SplittermondApplication } from "../../data/SplittermondApplication";
import { foundryApi } from "../../api/foundryApi";

/**
 * Selectors for important Foundry UI elements that we require in this module
 * Only exported for testing purposes
 */
export const foundryUISelectors = {
    sidebar: "#sidebar",
    sidebarExpansionToggle: "#sidebar menu button.collapse[data-action='toggleState']",
    controlPanel: "#ui-left-column-1",
} as const;

export function initMaxWidthTransitionForTickBarHud(tickBarHud: SplittermondApplication) {
    // Initial positioning
    positionTickBarHudBetweenElements(tickBarHud);

    foundryApi.hooks.on("splittermond.tickBarHudRendered", (app: SplittermondApplication) =>
        positionTickBarHudBetweenElementsImmediately(app)
    );

    // Listen for window resize
    window.addEventListener("resize", () => positionTickBarHudBetweenElements(tickBarHud));

    initSidebarToggleListener(tickBarHud);
    initSidebarMutationObserver(tickBarHud);
}

/**
 * Positions the tick bar hud to fill the space between ui-left-column-1 and sidebar
 * Transition properties are given in the Less file
 */
function positionTickBarHudBetweenElements(tickBarHud: SplittermondApplication) {
    try {
        const tickBarElement = tickBarHud.element.querySelector(".tick-bar-hud") as HTMLElement;
        const availableWidth = calculateAvailableWidth(tickBarHud);
        requestAnimationFrame(() => (tickBarElement.style.maxWidth = `${availableWidth}px`));
    } catch (e) {}
}

function positionTickBarHudBetweenElementsImmediately(tickBarHud: SplittermondApplication) {
    try {
        const tickBarElement = tickBarHud.element.querySelector(".tick-bar-hud") as HTMLElement;
        const availableWidth = calculateAvailableWidth(tickBarHud);
        tickBarElement.style.maxWidth = `${availableWidth}px`;
    } catch (e) {}
}

function calculateAvailableWidth(tickBarHud: SplittermondApplication): number {
    const paddingForTickBar = 30;
    const doc = tickBarHud.element.ownerDocument;
    if (!doc) throw new Error("Invalid tickBarHud");

    const leftColumn = doc.querySelector(foundryUISelectors.controlPanel) as HTMLElement;
    const sidebar = doc.querySelector(foundryUISelectors.sidebar) as HTMLElement;
    const tickBarElement = tickBarHud.element.querySelector(".tick-bar-hud") as HTMLElement;

    if (!leftColumn || !sidebar || !tickBarElement) {
        console.warn("Splittermond | Could not find necessary Foundry UI elements to position Tick Bar HUD");
        throw new Error();
    }

    const leftColumnRect = leftColumn.getBoundingClientRect();
    const leftEdge = leftColumnRect.right;

    const sidebarRect = sidebar.getBoundingClientRect();
    const rightEdge = sidebarRect.left;

    return rightEdge - leftEdge - paddingForTickBar;
}

function initSidebarToggleListener(tickBarHud: SplittermondApplication) {
    tickBarHud.element.ownerDocument
        .querySelector(foundryUISelectors.sidebarExpansionToggle)
        ?.addEventListener("click", () => {
            setTimeout(() => {
                positionTickBarHudBetweenElements(tickBarHud);
            }, 300);
            //Fallback to place our bar in the correct position in case the first timeout was too early
            setTimeout(() => {
                positionTickBarHudBetweenElements(tickBarHud);
            }, 800);
        });
}

function initSidebarMutationObserver(tickBarHud: SplittermondApplication) {
    const sidebar = tickBarHud.element.ownerDocument?.querySelector(foundryUISelectors.sidebar);
    if (!sidebar) return;

    // Create MutationObserver to watch for sidebar class changes
    const observer = new MutationObserver((mutations) => {
        // Only reposition if the mutation isn't from our own style changes
        const isOurChange = mutations.some(
            (mutation) => mutation.target === tickBarHud.element.querySelector(".tick-bar-hud")
        );
        if (!isOurChange) {
            // Small delay to ensure DOM changes are complete
            requestAnimationFrame(() => positionTickBarHudBetweenElements(tickBarHud));
        }
    });
    observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ["class", "style"],
    });
}
