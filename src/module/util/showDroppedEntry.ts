import type { FoundryApplication } from "module/api/Application";

export function showDroppedEntry(
    sheet: InstanceType<typeof FoundryApplication>,
    tab: string | undefined,
    selector: string
): void {
    if (!sheet.element?.isConnected) return;

    function reveal(): boolean {
        if (tab) sheet.changeTab(tab, "primary", { force: true });
        const entry = sheet.element.querySelector(`${tab ? `section[data-tab="${tab}"]` : "header"} ${selector}`);
        const row = entry?.closest(".list-item, .taglist-item, .effect-card");
        if (!row) return false;
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
        row.animate(
            [
                { backgroundColor: "rgba(var(--color-primary_rgb), 0.35)", offset: 0 },
                { backgroundColor: "rgba(var(--color-primary_rgb), 0.35)", offset: 0.65 },
                { backgroundColor: "transparent" },
            ],
            { duration: 1800, easing: "ease-out" }
        );
        return true;
    }

    function cleanup(): void {
        sheet.removeEventListener("render", onRender);
        sheet.removeEventListener("close", cleanup);
    }

    function onRender(): void {
        if (reveal()) cleanup();
    }

    // Document updates already render the sheet; wait for their result if it is not in the DOM yet.
    if (sheet.rendered && reveal()) return;
    sheet.addEventListener("render", onRender);
    sheet.addEventListener("close", cleanup, { once: true });
}
