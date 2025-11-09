import type SplittermondActorSheet from "module/actor/sheets/actor-sheet";

export class HoverStateTracker {
    private _activeOverlay: string | null = null;

    constructor() {}

    trackHoverState(sheet: SplittermondActorSheet) {
        const overlayElements = sheet.element.querySelectorAll("#health, #focus");
        overlayElements.forEach((overlay) => {
            overlay.addEventListener("mouseenter", () => {
                this._activeOverlay = `#${overlay.id}`;
                // Remove the programmatic hover class when user hovers
                overlay.classList.remove("hover");
            });
            overlay.addEventListener("mouseleave", () => {
                this._activeOverlay = null;
                // Remove the programmatic hover class when leaving
                overlay.classList.remove("hover");
            });
        });
    }

    restoreHoverState(sheet: SplittermondActorSheet) {
        // Restore active overlay if one was open before the render
        if (this._activeOverlay) {
            const overlayElement = sheet.element.querySelector(this._activeOverlay);
            if (overlayElement) {
                // Add the .hover class to trigger CSS styling
                overlayElement.classList.add("hover");
            }
        }
    }
}
