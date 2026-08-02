
/**
 * Module-level constants matching actor-sheet.js defaults.
 */
export const BASELINE_HEIGHT = 720;
export const ROW_HEIGHT = 28;
export const BASE_CAP = 4;


/**
 * Selector for the status tab's status effects list anchors.
 * Only exported for testing purposes.
 */
export const statusListSelectors = {
    tab: 'section[data-tab="status"]',
    channeledDamage: ".damage > .list",
    statusEffects: ".status-effects > .list",
    spellEffects: ".spell-effects > .list",
    activeEffects: ".active-effects > .list",
} as const;

/**
 * Ordering for the distribution pass — bottom-to-top visual order.
 */
const distributionOrder: (keyof typeof statusListSelectors)[] = [
    "activeEffects",
    "spellEffects",
    "statusEffects",
    "channeledDamage",
];

/**
 * Ordering for applying results — top-to-bottom visual order (matching the
 * order selectors are queried in).
 */
const applyOrder: (keyof typeof statusListSelectors)[] = [
    "channeledDamage",
    "statusEffects",
    "spellEffects",
    "activeEffects",
];

/**
 * Map from anchor selector to the `.list-body` selector inside it.
 */
const listBodySelectors: Record<string, string> = {
    ".damage > .list": "ol.list-body",
    ".status-effects > .list": "ol.list-body.item-list",
    ".spell-effects > .list": "ol.list-body.item-list",
    ".active-effects > .list": "ol.list-body",
};

/**
 * Compute the final capacity for each status-list section after distributing
 * extra rows across the four lists.
 *
 * Distribution algorithm:
 *  - Every list starts at `min(itemCount, BASE_CAP)` (base cap of 5 rows).
 *  - Extra rows (computed from sheet height above the BASELINE) are
 *    distributed one at a time, iterating bottom-to-top (activeEffects →
 *    spellEffects → statusEffects → channeledDamage).
 *  - A list accepts one more row only if its current capacity is less than
 *    its itemCount.
 *  - Distribution stops when no extra rows remain or a full bottom-to-top
 *    pass adds nothing.
 */
function computeCapacities(counts: Record<string, number>): Record<string, number> {
    const capacities = {} as Record<string, number>;
    for (const key of applyOrder) {
        const count = counts[key] ?? 0;
        capacities[key] = Math.min(count, BASE_CAP);
    }

    return capacities;
}

/**
 * Distribute extra rows across the four status lists, bottom-to-top.
 */
function distributeExtraRows(
    capacities: Record<string, number>,
    counts: Record<string, number>,
    extraRows: number
): Record<string, number> {
    while (extraRows > 0) {
        let progress = false;
        for (const key of distributionOrder) {
            if (extraRows <= 0) break;
            const current = capacities[key] ?? 0;
            const count = counts[key] ?? 0;
            if (current < count) {
                capacities[key] = current + 1;
                extraRows--;
                progress = true;
            }
        }
        if (!progress) break;
    }
    return capacities;
}

/**
 * Query the rendered DOM to count items in each list.
 */
function queryItemCounts(sheetElement: HTMLElement): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const key of applyOrder) {
        const listAnchor = sheetElement.querySelector(statusListSelectors[key]) as HTMLElement | null;
        const bodySelector = listBodySelectors[statusListSelectors[key]];
        const body = listAnchor?.querySelector(bodySelector) as HTMLOListElement | null;
        const items = body?.querySelectorAll(":scope > .list-item");
        counts[key] = items?.length ?? 0;
    }
    return counts;
}

/**
 * Apply the computed capacity to each list element via its custom property.
 */
function applyCapacities(sheetElement: HTMLElement, capacities: Record<string, number>): void {
    for (const key of applyOrder) {
        const list = sheetElement.querySelector(statusListSelectors[key]) as HTMLOListElement| null;
        list?.style.setProperty("--status-list-capacity", String(capacities[key] ?? 0));
        list?.style.setProperty("--status-list-max-capacity", String(capacities[key] + 1));
    }
}

/**
 * Calculate the space on the sheet that we have available
 */
function getEffectiveHeight(sheetElement:HTMLElement): number {
    const statusTab = sheetElement.querySelector("section.tab.status")!;
    const restActionRow = statusTab.querySelector(".rest-action.row"); //not present on NPC
    const restActionRowHeight = restActionRow?.getBoundingClientRect().height ?? 0;
    const tabHeight= statusTab?.getBoundingClientRect().height ;
    return Math.max(tabHeight - restActionRowHeight, 443.667 - 30.333);//default read tab height - the rest action button height (...that does not exist on NPC=
}

/**
 * Compute how many extra rows the sheet can display beyond the baseline.
 */
function computeExtraRows(effectiveHeight: number,counts:Record<string,number>): number {
    const totalRowNumber = Math.max(0, Math.floor((effectiveHeight) / ROW_HEIGHT));
    const headerNumber = Object.keys(counts).length;
    const minRowNumber = Object.values(counts).reduce((acc,cur)=>acc + Math.min(cur,BASE_CAP),0)
    return totalRowNumber - minRowNumber - headerNumber;
}

/**
 * Apply dynamic list sizing to the status tab so that extra vertical space
 * is distributed across the effect/damage lists below the base cap of 5 rows.
 *
 * This is a pure DOM operation — it reads item counts from rendered HTML and
 * writes a CSS custom property. It does not trigger a re-render.  Call this
 * from the `_onPosition` hook wired by the actor sheet (see S4).
 */
export function applyStatusListSizing(sheetElement: HTMLElement): void {
    const statusTab = sheetElement.querySelector(statusListSelectors.tab);
    if (!statusTab) return;

    const effectiveHeight = getEffectiveHeight(sheetElement);
    const counts = queryItemCounts(sheetElement);
    const extraRows = computeExtraRows(effectiveHeight,counts);
    const capacities = computeCapacities(counts);
    distributeExtraRows(capacities, counts, extraRows);
    applyCapacities(sheetElement, capacities);
}
