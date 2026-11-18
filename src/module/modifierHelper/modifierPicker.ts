import { modifierCategoryHeadings, type ModifierSortMode } from "./modifierGroups";

export function activateModifierPicker(
    element: HTMLElement,
    onSelect: (path: string) => void,
    onSearch: (query: string) => void,
    onSort: (mode: ModifierSortMode) => void = () => {},
    collapsedCategories: Set<string> = new Set(modifierCategoryHeadings.map(({ value }) => value))
) {
    const picker = element.querySelector<HTMLDetailsElement>(".modifier-picker-main")!;
    const search = picker.querySelector<HTMLInputElement>("[name=modifierSearch]")!;
    const options = [...picker.querySelectorAll<HTMLElement>("[data-modifier-path]")];
    const list = picker.querySelector<HTMLElement>(".modifier-picker-list")!;
    const headings = [...picker.querySelectorAll<HTMLButtonElement>("[data-category-heading]")];
    const parents = new Map(
        headings.map((heading) => [heading.dataset.categoryHeading!, heading.dataset.categoryParent!])
    );
    const belongsToCategory = (option: HTMLElement, category: string) =>
        option.dataset.category === category || parents.get(option.dataset.category!) === category;
    let sortMode: ModifierSortMode =
        picker.querySelector<HTMLInputElement>("[name=modifierSort]:checked")?.value === "alphabetical"
            ? "alphabetical"
            : "category";
    const empty = picker.querySelector<HTMLElement>(".modifier-picker-empty")!;
    const searchCollapsedCategories = new Set<string>();
    const collapsed = () => (search.value.trim() ? searchCollapsedCategories : collapsedCategories);
    const matchesSearch = (option: HTMLElement, query: string) =>
        `${option.textContent} ${option.dataset.search ?? ""}`.toLocaleLowerCase().includes(query);
    const filter = () => {
        const query = search.value.trim().toLocaleLowerCase();
        const matches = options.filter((option) => matchesSearch(option, query));
        options.forEach((option) => {
            const hiddenCategory =
                sortMode === "category" &&
                (collapsed().has(option.dataset.category!) || collapsed().has(parents.get(option.dataset.category!)!));
            option.hidden = !matches.includes(option) || hiddenCategory;
            option.tabIndex = -1;
        });
        const visible = options.filter((option) => !option.hidden);
        const focusable = visible.find((option) => option.getAttribute("aria-selected") === "true") ?? visible[0];
        if (focusable) focusable.tabIndex = 0;
        empty.hidden = matches.length > 0;
        headings.forEach((heading) => {
            const category = heading.dataset.categoryHeading!;
            const count = matches.filter((option) => belongsToCategory(option, category)).length;
            heading.hidden = sortMode !== "category" || count === 0 || collapsed().has(heading.dataset.categoryParent!);
            heading.setAttribute("aria-expanded", String(!collapsed().has(category)));
            heading.querySelector<HTMLElement>("[data-category-count]")!.textContent = String(count);
        });
    };
    const sort = () => {
        options.sort((a, b) => a.dataset.modifierPath!.localeCompare(b.dataset.modifierPath!));
        list.dataset.sortMode = sortMode;
        if (sortMode === "category") {
            headings.forEach((heading) => {
                list.append(heading);
                options
                    .filter((option) => option.dataset.category === heading.dataset.categoryHeading)
                    .forEach((option) => list.append(option));
            });
        } else options.forEach((option) => list.append(option));
        filter();
    };
    sort();
    headings.forEach((heading) =>
        heading.addEventListener("click", () => {
            const category = heading.dataset.categoryHeading!;
            if (collapsed().has(category)) collapsed().delete(category);
            else collapsed().add(category);
            filter();
            if (!collapsed().has(category)) {
                const first =
                    headings.find((child) => child.dataset.categoryParent === category && !child.hidden) ??
                    options.find((option) => option.dataset.category === category && !option.hidden)!;
                list.scrollTop +=
                    first.getBoundingClientRect().top -
                    list.getBoundingClientRect().top -
                    heading.getBoundingClientRect().height;
            }
        })
    );
    picker.querySelectorAll<HTMLInputElement>("[name=modifierSort]").forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.value !== "category" && radio.value !== "alphabetical") return;
            sortMode = radio.value;
            onSort(sortMode);
            sort();
            list.scrollTop = 0;
        });
    });
    search.addEventListener("input", () => {
        onSearch(search.value);
        searchCollapsedCategories.clear();
        filter();
        list.scrollTop = 0;
    });
    return activatePicker(picker, onSelect, (selected) => {
        if (!selected) return;
        if (!matchesSearch(selected, search.value.trim().toLocaleLowerCase())) {
            search.value = "";
            onSearch("");
            searchCollapsedCategories.clear();
        }
        const category = selected.dataset.category!;
        collapsed().delete(category);
        const parent = parents.get(category);
        if (parent) collapsed().delete(parent);
        filter();
    });
}

export function activateAttributePicker(
    picker: HTMLDetailsElement,
    onSelect: (value: string) => void,
    collapsedCategories = new Set(
        [...picker.querySelectorAll<HTMLElement>("[data-category-heading]")].map(
            (heading) => heading.dataset.categoryHeading!
        )
    )
): () => void {
    const search = picker.querySelector<HTMLInputElement>('input[type="search"]')!;
    const options = [...picker.querySelectorAll<HTMLElement>("[data-picker-value]")];
    const list = picker.querySelector<HTMLElement>(".modifier-picker-list")!;
    const empty = picker.querySelector<HTMLElement>(".modifier-picker-empty")!;
    const groups = [...picker.querySelectorAll<HTMLElement>("[data-choice-category]")];
    const searchCollapsedCategories = new Set<string>();
    const collapsed = () => (search.value.trim() ? searchCollapsedCategories : collapsedCategories);
    const matchesSearch = (option: HTMLElement, query: string) =>
        `${option.textContent} ${option.dataset.pickerValue}`.toLocaleLowerCase().includes(query);
    const filter = () => {
        const query = search.value.trim().toLocaleLowerCase();
        const matches = options.filter((option) => matchesSearch(option, query));
        options.forEach((option) => {
            const category = option.closest<HTMLElement>("[data-choice-category]")?.dataset.choiceCategory;
            option.hidden = !matches.includes(option) || (category !== undefined && collapsed().has(category));
            option.tabIndex = -1;
        });
        groups.forEach((group) => {
            const count = matches.filter((option) => group.contains(option)).length;
            group.hidden = count === 0;
            group
                .querySelector("[data-category-heading]")!
                .setAttribute("aria-expanded", String(!collapsed().has(group.dataset.choiceCategory!)));
            group.querySelector("[data-category-count]")!.textContent = String(count);
        });
        const visible = options.filter((option) => !option.hidden);
        const focusable = visible.find((option) => option.getAttribute("aria-selected") === "true") ?? visible[0];
        if (focusable) focusable.tabIndex = 0;
        empty.hidden = matches.length > 0;
    };
    groups.forEach((group) => {
        const heading = group.querySelector<HTMLButtonElement>("[data-category-heading]")!;
        heading.addEventListener("click", () => {
            const category = group.dataset.choiceCategory!;
            if (collapsed().has(category)) collapsed().delete(category);
            else collapsed().add(category);
            filter();
            if (!collapsed().has(category)) {
                const first = group.querySelector<HTMLElement>("[data-picker-value]:not([hidden])")!;
                list.scrollTop +=
                    first.getBoundingClientRect().top -
                    list.getBoundingClientRect().top -
                    heading.getBoundingClientRect().height;
            }
        });
    });
    search.addEventListener("input", () => {
        searchCollapsedCategories.clear();
        filter();
        list.scrollTop = 0;
    });
    filter();
    return activatePicker(
        picker,
        (value) => {
            const selected = options.find((option) => option.dataset.pickerValue === value)!;
            options.forEach((option) => option.setAttribute("aria-selected", String(option === selected)));
            picker.querySelector<HTMLElement>("summary span")!.textContent = selected.textContent;
            search.value = "";
            filter();
            list.scrollTop = 0;
            onSelect(value);
        },
        (selected) => {
            if (!selected) return;
            if (!matchesSearch(selected, search.value.trim().toLocaleLowerCase())) {
                search.value = "";
                searchCollapsedCategories.clear();
            }
            const category = selected.closest<HTMLElement>("[data-choice-category]")?.dataset.choiceCategory;
            if (category) collapsed().delete(category);
            filter();
        }
    );
}

export function activatePicker(
    picker: HTMLDetailsElement,
    onSelect: (path: string) => void,
    onOpen?: (selected: HTMLElement | undefined) => void
): () => void {
    const document = picker.ownerDocument;
    const summary = picker.querySelector<HTMLElement>("summary")!;
    const search = picker.querySelector<HTMLInputElement>('input[type="search"]');
    const visibleOptions = () =>
        [...picker.querySelectorAll<HTMLElement>("[data-picker-value]")].filter((option) => !option.hidden);
    const close = () => {
        picker.open = false;
        summary.focus();
    };
    picker.addEventListener("toggle", () => {
        if (!picker.open) return;
        const selected = picker.querySelector<HTMLElement>('[data-picker-value][aria-selected="true"]') ?? undefined;
        onOpen?.(selected);
        fitModifierPicker(picker);
        const options = visibleOptions();
        (search ?? selected ?? options[0])?.focus({ preventScroll: true });
        if (selected && !selected.hidden) {
            const list = picker.querySelector<HTMLElement>(".modifier-picker-list")!;
            const category =
                selected.dataset.category ??
                selected.closest<HTMLElement>("[data-choice-category]")?.dataset.choiceCategory;
            const heading = [...list.querySelectorAll<HTMLElement>("[data-category-heading]")].find(
                (heading) => heading.dataset.categoryHeading === category
            );
            const headingHeight = heading?.getBoundingClientRect().height ?? 0;
            const bounds = selected.getBoundingClientRect();
            // Scroll only the popup list, leaving the editor and fixed controls in place.
            list.scrollTop +=
                bounds.top -
                list.getBoundingClientRect().top -
                headingHeight -
                Math.max(0, (list.clientHeight - headingHeight - bounds.height) / 2);
        }
    });
    summary.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown") return;
        event.preventDefault();
        if (picker.open) (search ?? visibleOptions()[0])?.focus({ preventScroll: true });
        else picker.open = true;
    });
    search?.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown") return;
        event.preventDefault();
        (visibleOptions()[0] ?? picker.querySelector<HTMLElement>("[data-category-heading]:not([hidden])"))?.focus();
    });
    picker.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        close();
    });
    picker.addEventListener("focusout", (event) => {
        // A label click briefly loses focus before its radio receives it; outside clicks are handled separately.
        if (event.relatedTarget instanceof document.defaultView!.Node && !picker.contains(event.relatedTarget))
            picker.open = false;
    });
    const dismissOutside = (event: PointerEvent) => {
        if (event.target instanceof document.defaultView!.Node && !picker.contains(event.target)) picker.open = false;
    };
    document.addEventListener("pointerdown", dismissOutside);
    picker.querySelectorAll<HTMLElement>("[data-picker-value]").forEach((option) => {
        option.addEventListener("click", () => {
            close();
            onSelect(option.dataset.pickerValue!);
        });
        option.addEventListener("keydown", (event) => {
            const visible = visibleOptions();
            const index = visible.indexOf(option);
            let target: HTMLElement | undefined;
            switch (event.key) {
                case "Enter":
                case " ":
                    event.preventDefault();
                    option.click();
                    return;
                case "ArrowDown":
                    target = visible[Math.min(index + 1, visible.length - 1)];
                    break;
                case "ArrowUp":
                    target = visible[Math.max(index - 1, 0)];
                    break;
                case "Home":
                    target = visible[0];
                    break;
                case "End":
                    target = visible[visible.length - 1];
                    break;
                default:
                    return;
            }
            event.preventDefault();
            visible.forEach((entry) => (entry.tabIndex = entry === target ? 0 : -1));
            target?.focus();
        });
    });
    return () => document.removeEventListener("pointerdown", dismissOutside);
}

export function fitModifierPicker(picker: HTMLElement) {
    const content = picker.closest<HTMLElement>(".modifier-helper-content")!;
    const bounds = (picker.closest<HTMLElement>(".modifier-helper-body") ?? content).getBoundingClientRect();
    const footer = content.querySelector(".modifier-helper-bottom")!.getBoundingClientRect();
    const anchor = picker.querySelector("summary, [role=combobox]")!.getBoundingClientRect();
    const below = Math.max(0, Math.min(bounds.bottom, footer.top) - anchor.bottom - 4);
    const above = Math.max(0, anchor.top - bounds.top - 4);
    const upwards = (below < 240 || picker.dataset.attributePicker === "skill") && above > below;
    picker.classList.toggle("opens-up", upwards);
    picker.querySelector<HTMLElement>(".modifier-picker-popup")!.style.maxHeight = `${upwards ? above : below}px`;
}
