import type { SplittermondApplication } from "../../data/SplittermondApplication";
import { foundryApi } from "../../api/foundryApi";

/**
 * Selectors for important Foundry UI elements that we require in this module
 * Only exported for testing purposes
 */
export const foundryUISelectors = {
    sidebar: "#sidebar",
    sidebarContent: "#sidebar-content",
    sidebarButtons: "#sidebar menu button",
    sidebarExpansionToggle: "#sidebar menu button.collapse[data-action='toggleState']",
    controlPanel: "#ui-left-column-1",
    sceneNavigationColumn: "#ui-left-column-2",
    sceneNavigationMenus: "#scene-navigation .scene-navigation-menu",
} as const;

export function initMaxWidthTransitionForTickBarHud(tickBarHud: SplittermondApplication) {
    // Initial positioning
    positionTickBarHudBetweenElements(tickBarHud);
    // Reuse the empirically determined sidebar transition delays from the live listeners below.
    window.setTimeout(() => positionTickBarHudBetweenElements(tickBarHud), 300);
    window.setTimeout(() => positionTickBarHudBetweenElements(tickBarHud), 800);

    foundryApi.hooks.on("splittermond.tickBarHudRendered", (app: SplittermondApplication) =>
        positionTickBarHudBetweenElementsImmediately(app)
    );

    // Listen for window resize
    window.addEventListener("resize", () => positionTickBarHudBetweenElements(tickBarHud));

    initSidebarToggleListener(tickBarHud);
    initSidebarExpansionListener(tickBarHud);
    initSidebarMutationObserver(tickBarHud);
    initSceneNavigationObservers(tickBarHud);
}

/**
 * Positions the tick bar between visible left-side controls and the sidebar.
 * Transition properties are given in the Less file
 */
function positionTickBarHudBetweenElements(tickBarHud: SplittermondApplication) {
    try {
        const tickBarElement = tickBarHud.element.querySelector(".tick-bar-hud") as HTMLElement;
        const { left, maxWidth } = calculateTickBarPosition(tickBarHud);
        requestAnimationFrame(() => {
            tickBarElement.style.left = `${left}px`;
            tickBarElement.style.maxWidth = `${maxWidth}px`;
        });
    } catch (e) {}
}

function positionTickBarHudBetweenElementsImmediately(tickBarHud: SplittermondApplication) {
    try {
        const tickBarElement = tickBarHud.element.querySelector(".tick-bar-hud") as HTMLElement;
        const { left, maxWidth } = calculateTickBarPosition(tickBarHud);
        tickBarElement.style.left = `${left}px`;
        tickBarElement.style.maxWidth = `${maxWidth}px`;
    } catch (e) {}
}

function calculateTickBarPosition(tickBarHud: SplittermondApplication) {
    const paddingForTickBar = 15;
    const defaultLeft = 110;
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
    let left = Math.max(defaultLeft, leftColumnRect.right + paddingForTickBar);
    const tickBarRect = tickBarElement.getBoundingClientRect();
    // The navigation root and its empty menus can span the entire viewport.
    // Only occupied, visible menus reserve space at the tick bar's height.
    for (const menu of doc.querySelectorAll<HTMLElement>(foundryUISelectors.sceneNavigationMenus)) {
        const visibility = window.getComputedStyle(menu).visibility;
        const rect = menu.getBoundingClientRect();
        if (
            menu.childElementCount > 0 &&
            visibility !== "hidden" &&
            visibility !== "collapse" &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > tickBarRect.top &&
            rect.top < tickBarRect.bottom
        ) {
            left = Math.max(left, rect.right + paddingForTickBar);
        }
    }

    const sidebarRect = sidebar.getBoundingClientRect();
    const rightEdge = sidebarRect.left;

    return { left, maxWidth: Math.max(0, rightEdge - left - paddingForTickBar) };
}

function initSceneNavigationObservers(tickBarHud: SplittermondApplication) {
    const column = tickBarHud.element.ownerDocument.querySelector(foundryUISelectors.sceneNavigationColumn);
    if (!column) return;

    const resizeObserver = new ResizeObserver(() => positionTickBarHudBetweenElements(tickBarHud));
    const observeMenus = () => {
        resizeObserver.disconnect();
        column
            .querySelectorAll(foundryUISelectors.sceneNavigationMenus)
            .forEach((menu) => resizeObserver.observe(menu));
        positionTickBarHudBetweenElements(tickBarHud);
    };
    // Observe the stable column because Foundry replaces the menus on render.
    const mutationObserver = new MutationObserver(observeMenus);
    mutationObserver.observe(column, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
    });
    observeMenus();
    tickBarHud.addEventListener(
        "close",
        () => {
            mutationObserver.disconnect();
            resizeObserver.disconnect();
        },
        { once: true }
    );
}

function initSidebarToggleListener(tickBarHud: SplittermondApplication) {
    tickBarHud.element.ownerDocument
        .querySelector(foundryUISelectors.sidebarExpansionToggle)
        ?.addEventListener("click", () => {
            // The 300 ms and 800 ms delays were determined empirically from Foundry's sidebar transition.
            setTimeout(() => {
                positionTickBarHudBetweenElements(tickBarHud);
            }, 300);
            //Fallback to place our bar in the correct position in case the first timeout was too early
            setTimeout(() => {
                positionTickBarHudBetweenElements(tickBarHud);
            }, 800);
        });
}

function initSidebarExpansionListener(tickBarHud: SplittermondApplication) {
    tickBarHud.element.ownerDocument.querySelectorAll(foundryUISelectors.sidebarButtons).forEach((el) => {
        if (el.matches(foundryUISelectors.sidebarExpansionToggle)) {
            return;
        }
        el.addEventListener("click", () => {
            const sidebarContent = tickBarHud.element.ownerDocument.querySelector(foundryUISelectors.sidebarContent);
            if (sidebarContent?.classList.contains("expanded")) {
                return;
            }
            // The 300 ms and 800 ms delays were determined empirically from Foundry's sidebar transition.
            setTimeout(() => {
                positionTickBarHudBetweenElements(tickBarHud);
            }, 300);
            //Fallback to place our bar in the correct position in case the first timeout was too early
            setTimeout(() => {
                positionTickBarHudBetweenElements(tickBarHud);
            }, 800);
        });
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
