import { fitModifierPicker } from "./modifierPicker";

export function activateFeatureSuggestions(picker: HTMLElement, onSelect: () => void): () => void {
    const input = picker.querySelector<HTMLInputElement>("[role=combobox]")!;
    const popup = picker.querySelector<HTMLElement>(".modifier-picker-popup")!;
    const list = picker.querySelector<HTMLElement>(".modifier-picker-list")!;
    const options = [...list.querySelectorAll<HTMLElement>("[data-picker-value]")];
    const document = picker.ownerDocument;
    let active: HTMLElement | undefined;
    const visibleOptions = () => options.filter((option) => !option.hidden);
    const segment = () => {
        const caret = input.selectionStart ?? input.value.length;
        const start = input.value.lastIndexOf(",", caret - 1) + 1;
        const next = input.value.indexOf(",", caret);
        return { start, end: next < 0 ? input.value.length : next };
    };
    const highlight = (option?: HTMLElement) => {
        active = option;
        options.forEach((entry) => entry.setAttribute("aria-selected", String(entry === active)));
        if (active) input.setAttribute("aria-activedescendant", active.id);
        else input.removeAttribute("aria-activedescendant");
    };
    const close = () => {
        popup.hidden = true;
        picker.classList.remove("is-open");
        input.setAttribute("aria-expanded", "false");
        highlight();
    };
    const open = () => {
        const { start, end } = segment();
        const query = input.value.slice(start, end).trim().toLocaleLowerCase();
        options.forEach((option) => (option.hidden = !option.dataset.pickerValue!.toLocaleLowerCase().includes(query)));
        highlight();
        list.scrollTop = 0;
        if (!visibleOptions().length) return close();
        popup.hidden = false;
        picker.classList.add("is-open");
        input.setAttribute("aria-expanded", "true");
        fitModifierPicker(picker);
    };
    const select = (option: HTMLElement) => {
        const { start, end } = segment();
        const replacement = `${start ? " " : ""}${option.dataset.pickerValue!}`;
        input.setRangeText(replacement, start, end, "end");
        input.focus();
        close();
        onSelect();
    };
    input.addEventListener("focus", open);
    input.addEventListener("click", open);
    input.addEventListener("input", open);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !popup.hidden) {
            event.preventDefault();
            event.stopPropagation();
            close();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (popup.hidden) open();
            const visible = visibleOptions();
            const index = active ? visible.indexOf(active) : event.key === "ArrowDown" ? -1 : visible.length;
            const next = Math.max(0, Math.min(visible.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
            highlight(visible[next]);
            active?.scrollIntoView?.({ block: "nearest" });
        } else if (event.key === "Enter" && active && !popup.hidden) {
            event.preventDefault();
            select(active);
        } else if (event.key === "Tab") close();
    });
    options.forEach((option) => {
        option.addEventListener("pointerdown", (event) => event.preventDefault());
        option.addEventListener("click", () => select(option));
    });
    picker.querySelector<HTMLButtonElement>("[data-feature-toggle]")!.addEventListener("click", () => {
        const wasOpen = !popup.hidden;
        input.focus();
        if (wasOpen) close();
        else open();
    });
    picker.addEventListener("focusout", (event) => {
        if (event.relatedTarget instanceof document.defaultView!.Node && !picker.contains(event.relatedTarget)) close();
    });
    const dismissOutside = (event: PointerEvent) => {
        if (event.target instanceof document.defaultView!.Node && !picker.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
}
