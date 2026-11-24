import { modifierCategoryHeadings, type ModifierSortMode } from "./modifierGroups";

interface SearchablePicker {
    element: HTMLDetailsElement;
    search: HTMLInputElement;
    options: HTMLElement[];
    list: HTMLElement;
    empty: HTMLElement;
    searchKey: "search" | "pickerValue";
    collapsedCategories: Set<string>;
    searchCollapsedCategories: Set<string>;
}

interface ModifierPicker extends SearchablePicker {
    headings: HTMLButtonElement[];
    parents: Map<string, string>;
    sortMode: ModifierSortMode;
}

interface AttributePicker extends SearchablePicker {
    groups: HTMLElement[];
}

export function activateModifierPicker(
    element: HTMLElement,
    onSelect: (path: string) => void,
    onSearch: (query: string) => void,
    onSort: (mode: ModifierSortMode) => void = () => {},
    collapsedCategories: Set<string> = new Set(modifierCategoryHeadings.map(({ value }) => value))
) {
    const picker = createModifierPicker(element, collapsedCategories);
    sortModifiers(picker);
    bindModifierCategories(picker);
    bindModifierSort(picker, onSort);
    bindPickerSearch(picker, () => filterModifiers(picker), onSearch);
    return activatePicker(picker.element, onSelect, (selected) => {
        if (selected) revealModifier(picker, selected, onSearch);
    });
}

function createModifierPicker(element: HTMLElement, collapsedCategories: Set<string>): ModifierPicker {
    const picker = element.querySelector<HTMLDetailsElement>(".modifier-picker-main")!;
    const headings = [...picker.querySelectorAll<HTMLButtonElement>("[data-category-heading]")];
    return {
        ...createSearchablePicker(picker, "[data-modifier-path]", "search", collapsedCategories),
        headings,
        parents: new Map(
            headings.map((heading) => [heading.dataset.categoryHeading!, heading.dataset.categoryParent!])
        ),
        sortMode:
            picker.querySelector<HTMLInputElement>("[name=modifierSort]:checked")?.value === "alphabetical"
                ? "alphabetical"
                : "category",
    };
}

function filterModifiers(picker: ModifierPicker) {
    const matches = searchMatches(picker);
    const collapsed = collapsedCategories(picker);
    updateOptionVisibility(
        picker,
        matches,
        (option) =>
            picker.sortMode === "category" &&
            (collapsed.has(option.dataset.category!) || collapsed.has(picker.parents.get(option.dataset.category!)!))
    );
    updateModifierHeadings(picker, matches, collapsed);
}

function updateModifierHeadings(picker: ModifierPicker, matches: HTMLElement[], collapsed: Set<string>) {
    picker.headings.forEach((heading) => {
        const category = heading.dataset.categoryHeading!;
        const count = matches.filter(
            (option) =>
                option.dataset.category === category || picker.parents.get(option.dataset.category!) === category
        ).length;
        heading.hidden =
            picker.sortMode !== "category" || count === 0 || collapsed.has(heading.dataset.categoryParent!);
        heading.setAttribute("aria-expanded", String(!collapsed.has(category)));
        heading.querySelector<HTMLElement>("[data-category-count]")!.textContent = String(count);
    });
}

function sortModifiers(picker: ModifierPicker) {
    picker.options.sort((a, b) => a.dataset.modifierPath!.localeCompare(b.dataset.modifierPath!));
    picker.list.dataset.sortMode = picker.sortMode;
    if (picker.sortMode === "category") {
        picker.headings.forEach((heading) => {
            picker.list.append(heading);
            picker.options
                .filter((option) => option.dataset.category === heading.dataset.categoryHeading)
                .forEach((option) => picker.list.append(option));
        });
    } else {
        picker.options.forEach((option) => picker.list.append(option));
    }
    filterModifiers(picker);
}

function bindModifierCategories(picker: ModifierPicker) {
    picker.headings.forEach((heading) => {
        heading.addEventListener("click", () => {
            const category = heading.dataset.categoryHeading!;
            const collapsed = collapsedCategories(picker);
            toggleCategory(collapsed, category);
            filterModifiers(picker);
            if (!collapsed.has(category)) {
                const first =
                    picker.headings.find((child) => child.dataset.categoryParent === category && !child.hidden) ??
                    picker.options.find((option) => option.dataset.category === category && !option.hidden)!;
                scrollBelowHeading(picker.list, heading, first);
            }
        });
    });
}

function bindModifierSort(picker: ModifierPicker, onSort: (mode: ModifierSortMode) => void) {
    picker.element.querySelectorAll<HTMLInputElement>("[name=modifierSort]").forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.value !== "category" && radio.value !== "alphabetical") return;
            picker.sortMode = radio.value;
            onSort(picker.sortMode);
            sortModifiers(picker);
            picker.list.scrollTop = 0;
        });
    });
}

function revealModifier(picker: ModifierPicker, selected: HTMLElement, onSearch: (query: string) => void) {
    if (!matchesSearch(picker, selected)) {
        picker.search.value = "";
        onSearch("");
        picker.searchCollapsedCategories.clear();
    }
    const category = selected.dataset.category!;
    const collapsed = collapsedCategories(picker);
    collapsed.delete(category);
    const parent = picker.parents.get(category);
    if (parent) collapsed.delete(parent);
    filterModifiers(picker);
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
    const state: AttributePicker = {
        ...createSearchablePicker(picker, "[data-picker-value]", "pickerValue", collapsedCategories),
        groups: [...picker.querySelectorAll<HTMLElement>("[data-choice-category]")],
    };
    bindAttributeCategories(state);
    bindPickerSearch(state, () => filterAttributes(state));
    filterAttributes(state);
    return activatePicker(
        picker,
        (value) => {
            selectAttribute(state, value);
            onSelect(value);
        },
        (selected) => {
            if (selected) revealAttribute(state, selected);
        }
    );
}

function filterAttributes(picker: AttributePicker) {
    const matches = searchMatches(picker);
    const collapsed = collapsedCategories(picker);
    updateOptionVisibility(picker, matches, (option) => {
        const category = option.closest<HTMLElement>("[data-choice-category]")?.dataset.choiceCategory;
        return category !== undefined && collapsed.has(category);
    });
    picker.groups.forEach((group) => {
        const count = matches.filter((option) => group.contains(option)).length;
        group.hidden = count === 0;
        group
            .querySelector("[data-category-heading]")!
            .setAttribute("aria-expanded", String(!collapsed.has(group.dataset.choiceCategory!)));
        group.querySelector("[data-category-count]")!.textContent = String(count);
    });
}

function bindAttributeCategories(picker: AttributePicker) {
    picker.groups.forEach((group) => {
        const heading = group.querySelector<HTMLButtonElement>("[data-category-heading]")!;
        heading.addEventListener("click", () => {
            const category = group.dataset.choiceCategory!;
            const collapsed = collapsedCategories(picker);
            toggleCategory(collapsed, category);
            filterAttributes(picker);
            if (!collapsed.has(category)) {
                const first = group.querySelector<HTMLElement>("[data-picker-value]:not([hidden])")!;
                scrollBelowHeading(picker.list, heading, first);
            }
        });
    });
}

function selectAttribute(picker: AttributePicker, value: string) {
    const selected = picker.options.find((option) => option.dataset.pickerValue === value)!;
    picker.options.forEach((option) => option.setAttribute("aria-selected", String(option === selected)));
    picker.element.querySelector<HTMLElement>("summary span")!.textContent = selected.textContent;
    picker.search.value = "";
    filterAttributes(picker);
    picker.list.scrollTop = 0;
}

function revealAttribute(picker: AttributePicker, selected: HTMLElement) {
    if (!matchesSearch(picker, selected)) {
        picker.search.value = "";
        picker.searchCollapsedCategories.clear();
    }
    const category = selected.closest<HTMLElement>("[data-choice-category]")?.dataset.choiceCategory;
    if (category) collapsedCategories(picker).delete(category);
    filterAttributes(picker);
}

function createSearchablePicker(
    element: HTMLDetailsElement,
    optionSelector: string,
    searchKey: SearchablePicker["searchKey"],
    collapsedCategories: Set<string>
): SearchablePicker {
    return {
        element,
        search: element.querySelector<HTMLInputElement>('input[type="search"]')!,
        options: [...element.querySelectorAll<HTMLElement>(optionSelector)],
        list: element.querySelector<HTMLElement>(".modifier-picker-list")!,
        empty: element.querySelector<HTMLElement>(".modifier-picker-empty")!,
        searchKey,
        collapsedCategories,
        searchCollapsedCategories: new Set(),
    };
}

function collapsedCategories(picker: SearchablePicker): Set<string> {
    return picker.search.value.trim() ? picker.searchCollapsedCategories : picker.collapsedCategories;
}

function matchesSearch(
    picker: SearchablePicker,
    option: HTMLElement,
    query = picker.search.value.trim().toLocaleLowerCase()
): boolean {
    return `${option.textContent} ${option.dataset[picker.searchKey] ?? ""}`.toLocaleLowerCase().includes(query);
}

function searchMatches(picker: SearchablePicker): HTMLElement[] {
    const query = picker.search.value.trim().toLocaleLowerCase();
    return picker.options.filter((option) => matchesSearch(picker, option, query));
}

function updateOptionVisibility(
    picker: SearchablePicker,
    matches: HTMLElement[],
    isCollapsed: (option: HTMLElement) => boolean
) {
    picker.options.forEach((option) => {
        option.hidden = !matches.includes(option) || isCollapsed(option);
        option.tabIndex = -1;
    });
    const visible = picker.options.filter((option) => !option.hidden);
    const focusable = visible.find((option) => option.getAttribute("aria-selected") === "true") ?? visible[0];
    if (focusable) focusable.tabIndex = 0;
    picker.empty.hidden = matches.length > 0;
}

function bindPickerSearch(picker: SearchablePicker, filter: () => void, onSearch?: (query: string) => void) {
    picker.search.addEventListener("input", () => {
        onSearch?.(picker.search.value);
        picker.searchCollapsedCategories.clear();
        filter();
        picker.list.scrollTop = 0;
    });
}

function toggleCategory(collapsed: Set<string>, category: string) {
    if (collapsed.has(category)) collapsed.delete(category);
    else collapsed.add(category);
}

function scrollBelowHeading(list: HTMLElement, heading: HTMLElement, first: HTMLElement) {
    list.scrollTop +=
        first.getBoundingClientRect().top - list.getBoundingClientRect().top - heading.getBoundingClientRect().height;
}

export function activatePicker(
    picker: HTMLDetailsElement,
    onSelect: (path: string) => void,
    onOpen?: (selected: HTMLElement | undefined) => void
): () => void {
    const summary = picker.querySelector<HTMLElement>("summary")!;
    const search = picker.querySelector<HTMLInputElement>('input[type="search"]');
    const close = () => {
        picker.open = false;
        summary.focus();
    };
    bindPickerOpening(picker, search, onOpen);
    bindPickerKeyboard(picker, summary, search, close);
    bindPickerOptions(picker, onSelect, close);
    return bindPickerDismissal(picker);
}

function visibleOptions(picker: HTMLElement): HTMLElement[] {
    return [...picker.querySelectorAll<HTMLElement>("[data-picker-value]")].filter((option) => !option.hidden);
}

function bindPickerOpening(
    picker: HTMLDetailsElement,
    search: HTMLInputElement | null,
    onOpen?: (selected: HTMLElement | undefined) => void
) {
    picker.addEventListener("toggle", () => {
        if (!picker.open) return;
        const selected = picker.querySelector<HTMLElement>('[data-picker-value][aria-selected="true"]') ?? undefined;
        onOpen?.(selected);
        fitModifierPicker(picker);
        (search ?? selected ?? visibleOptions(picker)[0])?.focus({ preventScroll: true });
        if (selected && !selected.hidden) centerSelectedOption(picker, selected);
    });
}

function centerSelectedOption(picker: HTMLElement, selected: HTMLElement) {
    const list = picker.querySelector<HTMLElement>(".modifier-picker-list")!;
    const category =
        selected.dataset.category ?? selected.closest<HTMLElement>("[data-choice-category]")?.dataset.choiceCategory;
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

function bindPickerKeyboard(
    picker: HTMLDetailsElement,
    summary: HTMLElement,
    search: HTMLInputElement | null,
    close: () => void
) {
    summary.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown") return;
        event.preventDefault();
        if (picker.open) (search ?? visibleOptions(picker)[0])?.focus({ preventScroll: true });
        else picker.open = true;
    });
    search?.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown") return;
        event.preventDefault();
        (
            visibleOptions(picker)[0] ?? picker.querySelector<HTMLElement>("[data-category-heading]:not([hidden])")
        )?.focus();
    });
    picker.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        close();
    });
}

function bindPickerOptions(picker: HTMLDetailsElement, onSelect: (value: string) => void, close: () => void) {
    picker.querySelectorAll<HTMLElement>("[data-picker-value]").forEach((option) => {
        option.addEventListener("click", () => {
            close();
            onSelect(option.dataset.pickerValue!);
        });
        option.addEventListener("keydown", (event) => navigateOptions(event, option, visibleOptions(picker)));
    });
}

function navigateOptions(event: KeyboardEvent, option: HTMLElement, visible: HTMLElement[]) {
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
}

function bindPickerDismissal(picker: HTMLDetailsElement): () => void {
    const document = picker.ownerDocument;
    picker.addEventListener("focusout", (event) => {
        // A label click briefly loses focus before its radio receives it; outside clicks are handled separately.
        if (event.relatedTarget instanceof document.defaultView!.Node && !picker.contains(event.relatedTarget)) {
            picker.open = false;
        }
    });
    const dismissOutside = (event: PointerEvent) => {
        if (event.target instanceof document.defaultView!.Node && !picker.contains(event.target)) picker.open = false;
    };
    document.addEventListener("pointerdown", dismissOutside);
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
