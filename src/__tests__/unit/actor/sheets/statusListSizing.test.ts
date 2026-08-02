import { expect } from "chai";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import { applyStatusListSizing, BASELINE_HEIGHT, ROW_HEIGHT } from "module/actor/sheets/statusListSizing";

function getCapacity(dom: JSDOM, listSelector: string): string {
    return (
        (dom.window.document.querySelector(listSelector) as HTMLElement | null)?.style.getPropertyValue(
            "--status-list-capacity"
        ) ?? ""
    );
}

/**
 * Build a minimal status-tab DOM tree with configurable list-item counts.
 * `counts` maps the anchor selector to the number of `.list-item` elements.
 */
function buildStatusTabDom(dom: JSDOM, counts: Record<string, number> = {}): HTMLElement {
    const { document } = dom.window;
    const body = document.body;

    const tab = document.createElement("section");
    tab.setAttribute("class", "tab");
    tab.setAttribute("data-group", "primary");
    tab.setAttribute("data-tab", "status");

    const listConfigs = [
        { key: ".damage > .list", selector: ".damage", bodyClass: "" },
        {
            key: ".status-effects > .list",
            selector: ".status-effects",
            bodyClass: "item-list",
        },
        {
            key: ".spell-effects > .list",
            selector: ".spell-effects",
            bodyClass: "item-list",
        },
        {
            key: ".active-effects > .list",
            selector: ".active-effects",
            bodyClass: "",
        },
    ];

    const wrapper = document.createElement("div");

    for (const cfg of listConfigs) {
        const listWrapper = document.createElement("div");
        listWrapper.className = cfg.selector.replace(".", "");

        const listDiv = document.createElement("div");
        listDiv.className = "list";

        const header = document.createElement("div");
        header.className = "list-header";
        const title = document.createElement("h3");
        title.textContent = cfg.selector;
        header.appendChild(title);
        listDiv.appendChild(header);

        const bodyEl = document.createElement("ol");
        bodyEl.className = "list-body" + (cfg.bodyClass ? " " + cfg.bodyClass : "");

        const itemCount = counts[cfg.key] ?? 0;
        for (let i = 0; i < itemCount; i++) {
            const li = document.createElement("li");
            li.className = "list-item";
            li.textContent = `Item ${i + 1}`;
            bodyEl.appendChild(li);
        }
        listDiv.appendChild(bodyEl);
        listWrapper.appendChild(listDiv);
        wrapper.appendChild(listWrapper);
    }

    tab.appendChild(wrapper);
    body.appendChild(tab);

    return body;
}

describe("applyStatusListSizing", () => {
    it("base case: height = baseline, lists with mixed counts → each gets min(count, 4), no extra rows", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 2,
            ".status-effects > .list": 4,
            ".spell-effects > .list": 6,
            ".active-effects > .list": 3,
        });
        applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT);

        expect(getCapacity(dom, ".damage > .list")).to.equal("2");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("4");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("4");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("3");
    });

    it("all full: every list has >4 items, baseline height → all capped at 4", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 5,
            ".status-effects > .list": 8,
            ".spell-effects > .list": 3,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT);

        expect(getCapacity(dom, ".damage > .list")).to.equal("4");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("4");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("3");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("4");
    });

    it("partial full: some <4, some >4, baseline height → base cap applies, no distribution", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 1,
            ".status-effects > .list": 7,
            ".spell-effects > .list": 2,
            ".active-effects > .list": 4,
        });
        applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT);

        expect(getCapacity(dom, ".damage > .list")).to.equal("1");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("4");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("2");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("4");
    });

    it("over-slack: height much taller than baseline, extra rows distributed bottom-to-top, skipping full lists", () => {
        const extraRows = 23;
        const tallHeight = BASELINE_HEIGHT + extraRows * ROW_HEIGHT;

        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 10,
            ".status-effects > .list": 10,
            ".spell-effects > .list": 10,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, tallHeight);

        // 23 extra rows distributed bottom-to-top through 4 lists.
        // Base caps: all 4 → 10 available each. floor(23/4) = 5 full rounds = 20 rows used, 3 remain.
        // Extra distribution in pass 6: activeEffects→9, spellEffects→9, statusEffects→9, damage stays at 8+5=13? No base=4.
        // After 5 rounds: all at 9 (4+5). 3 rows remain: active→10, spell→10, status→10, damage stays 9.

        expect(getCapacity(dom, ".damage > .list")).to.equal("9");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("10");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("10");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("10");
    });

    it("over-slack: truly skips lists at their itemCount ceiling", () => {
        const slackHeight = BASELINE_HEIGHT + 5 * ROW_HEIGHT;

        // statusEffects=2, activeEffects=1 → already at itemCount → cannot accept extra
        // damage=5, spellEffects=5 → can accept from 4 up
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 5,
            ".status-effects > .list": 2,
            ".spell-effects > .list": 5,
            ".active-effects > .list": 1,
        });
        applyStatusListSizing(dom.window.document.body, slackHeight);

        // Base caps: damage=4, statusEffects=2, spellEffects=4, activeEffects=1
        // pass 1: active(1<1?no), spell(4<5→5, extra=4), status(2<2?no), damage(4<5→5, extra=3)
        // pass 2: active(full), spell(5<5?no), status(full), damage(5<5?no) → no progress → stop
        // 3 extra rows remain unused.

        expect(getCapacity(dom, ".active-effects > .list")).to.equal("1");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("5");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("2");
        expect(getCapacity(dom, ".damage > .list")).to.equal("5");
    });

    it("empty/missing tab: no status tab → early return, no crash, no property set", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        expect(() => applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT)).to.not.throw();
    });

    it("auto height: sheetHeight is 'auto' → treated as baseline (0 extra rows)", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 2,
            ".status-effects > .list": 5,
            ".spell-effects > .list": 3,
            ".active-effects > .list": 4,
        });
        applyStatusListSizing(dom.window.document.body, "auto" as const);

        expect(getCapacity(dom, ".damage > .list")).to.equal("2");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("4");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("3");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("4");
    });

    it("zero items in all lists: baseline height → all at 0", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 0,
            ".status-effects > .list": 0,
            ".spell-effects > .list": 0,
            ".active-effects > .list": 0,
        });
        applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT);

        expect(getCapacity(dom, ".damage > .list")).to.equal("0");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("0");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("0");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("0");
    });

    it("negative height treated as 0 → baseline", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 5,
            ".status-effects > .list": 3,
            ".spell-effects > .list": 4,
            ".active-effects > .list": 2,
        });
        applyStatusListSizing(dom.window.document.body, -100);

        // effectiveHeight = max(-100, 0) = 0; extra = max(0, (0-720)/31) = 0
        // Just base caps

        expect(getCapacity(dom, ".damage > .list")).to.equal("4");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("3");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("4");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("2");
    });

    it("extra rows distribute evenly across all available lists", () => {
        const slackHeight = BASELINE_HEIGHT + 8 * ROW_HEIGHT;

        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 10,
            ".status-effects > .list": 10,
            ".spell-effects > .list": 10,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, slackHeight);

        // Base caps: all 4. Extra: 8 distributed bottom-to-top.
        // pass 1: active→5, spell→5, status→5, damage→5 (4 used, 4 left)
        // pass 2: active→6, spell→6, status→6, damage→6 (4 used, 0 left)

        expect(getCapacity(dom, ".damage > .list")).to.equal("6");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("6");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("6");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("6");
    });

    it("constant exports are correct", () => {
        expect(BASELINE_HEIGHT).to.equal(720);
        expect(ROW_HEIGHT).to.equal(31);
    });
});
