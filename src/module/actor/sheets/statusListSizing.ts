export const BASELINE_HEIGHT = 720;
export const ROW_HEIGHT = 31;
export const BASE_CAPACITY = 8;

type ListKey = "channeledDamage" | "statusEffects" | "spellEffects" | "activeEffects";

interface ListSpec {
    list: string;
    body: string;
}

const LIST_SPECS: Record<ListKey, ListSpec> = {
    channeledDamage: { list: ".damage > .list", body: "ol.list-body" },
    statusEffects: { list: ".status-effects > .list", body: "ol.list-body.item-list" },
    spellEffects: { list: ".spell-effects > .list", body: "ol.list-body.item-list" },
    activeEffects: { list: ".active-effects > .list", body: "ol.list-body" },
};

const TOP_TO_BOTTOM: ListKey[] = ["channeledDamage", "statusEffects", "spellEffects", "activeEffects"];

const BOTTOM_TO_TOP: ListKey[] = ["activeEffects", "spellEffects", "statusEffects", "channeledDamage"];

const STATUS_TAB = 'section[data-tab="status"]';

type ListCounts = Record<ListKey, number>;
type ListCapacities = Record<ListKey, number>;

function queryItemCounts(sheetElement: HTMLElement): ListCounts {
    return Object.fromEntries(
        TOP_TO_BOTTOM.map((key) => {
            const spec = LIST_SPECS[key];
            const list = sheetElement.querySelector(spec.list);
            const body = list?.querySelector(spec.body);
            const items = body?.querySelectorAll(":scope > .list-item");
            return [key, items?.length ?? 0];
        })
    ) as ListCounts;
}

function computeTotalRows(sheetHeight: number | string): number {
    if (typeof sheetHeight !== "number") return BASE_CAPACITY;
    return Math.max(0, BASE_CAPACITY + Math.floor((sheetHeight - BASELINE_HEIGHT) / ROW_HEIGHT));
}

function distributeRows(counts: ListCounts, totalRows: number): ListCapacities {
    const capacities = Object.fromEntries(TOP_TO_BOTTOM.map((key) => [key, 0])) as ListCapacities;
    let remaining = totalRows;
    while (remaining > 0) {
        let progress = false;
        for (const key of BOTTOM_TO_TOP) {
            if (remaining <= 0) break;
            if (capacities[key] < counts[key]) {
                capacities[key] += 1;
                remaining -= 1;
                progress = true;
            }
        }
        if (!progress) break;
    }
    return capacities;
}

function applyCapacities(sheetElement: HTMLElement, capacities: ListCapacities): void {
    for (const key of TOP_TO_BOTTOM) {
        const list = sheetElement.querySelector(LIST_SPECS[key].list) as HTMLElement | null;
        list?.style.setProperty("--status-list-capacity", String(capacities[key]));
    }
}

export function applyStatusListSizing(sheetElement: HTMLElement, sheetHeight: number | string): void {
    if (!sheetElement.querySelector(STATUS_TAB)) return;

    const counts = queryItemCounts(sheetElement);
    const totalRows = computeTotalRows(sheetHeight);
    const capacities = distributeRows(counts, totalRows);
    applyCapacities(sheetElement, capacities);
}
