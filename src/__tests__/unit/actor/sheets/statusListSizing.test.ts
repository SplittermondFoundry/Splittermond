import { expect } from "chai";
import { describe, it } from "mocha";
import { JSDOM } from "jsdom";
import {
    applyStatusListSizing,
    BASE_CAPACITY,
    BASELINE_HEIGHT,
    ROW_HEIGHT,
} from "module/actor/sheets/statusListSizing";

function getCapacity(dom: JSDOM, listSelector: string): string {
    return (
        (dom.window.document.querySelector(listSelector) as HTMLElement | null)?.style.getPropertyValue(
            "--status-list-capacity"
        ) ?? ""
    );
}

const LIST_CONFIGS = [
    { key: ".damage > .list", wrapper: "damage", bodyClass: "" },
    { key: ".status-effects > .list", wrapper: "status-effects", bodyClass: "item-list" },
    { key: ".spell-effects > .list", wrapper: "spell-effects", bodyClass: "item-list" },
    { key: ".active-effects > .list", wrapper: "active-effects", bodyClass: "" },
] as const;

function buildStatusTabDom(dom: JSDOM, counts: Record<string, number> = {}): HTMLElement {
    const { document } = dom.window;
    const body = document.body;

    const tab = document.createElement("section");
    tab.setAttribute("class", "tab");
    tab.setAttribute("data-group", "primary");
    tab.setAttribute("data-tab", "status");

    const wrapper = document.createElement("div");

    for (const cfg of LIST_CONFIGS) {
        const listWrapper = document.createElement("div");
        listWrapper.className = cfg.wrapper;

        const listDiv = document.createElement("div");
        listDiv.className = "list";

        const header = document.createElement("div");
        header.className = "list-header";
        const title = document.createElement("h3");
        title.textContent = cfg.wrapper;
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
    it("baseline: BASE_CAPACITY rows distributed bottom-to-top, respecting itemCount ceilings", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 2,
            ".status-effects > .list": 4,
            ".spell-effects > .list": 6,
            ".active-effects > .list": 3,
        });
        applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT);

        // 8 rows, order active→spell→status→damage, 2 full passes use all 8.
        expect(getCapacity(dom, ".damage > .list")).to.equal("2");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("2");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("2");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("2");
    });

    it("baseline: empty lists release their budget to the others", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 0,
            ".status-effects > .list": 0,
            ".spell-effects > .list": 0,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT);

        // 8 rows, only activeEffects can take them.
        expect(getCapacity(dom, ".damage > .list")).to.equal("0");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("0");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("0");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("8");
    });

    it("baseline: all lists below budget → rows left over (no list can take more)", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 1,
            ".status-effects > .list": 1,
            ".spell-effects > .list": 1,
            ".active-effects > .list": 1,
        });
        applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT);

        // 4 items total < 8 budget → each gets 1, 4 rows unused.
        expect(getCapacity(dom, ".damage > .list")).to.equal("1");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("1");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("1");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("1");
    });

    it("taller than baseline: extra rows added to the budget", () => {
        const extraRows = 4;
        const tallHeight = BASELINE_HEIGHT + extraRows * ROW_HEIGHT;
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 10,
            ".status-effects > .list": 10,
            ".spell-effects > .list": 10,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, tallHeight);

        // budget = 8 + 4 = 12. 3 full bottom-to-top passes → each at 3.
        expect(getCapacity(dom, ".damage > .list")).to.equal("3");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("3");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("3");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("3");
    });

    it("taller than baseline: skips lists at their itemCount ceiling", () => {
        const extraRows = 5;
        const tallHeight = BASELINE_HEIGHT + extraRows * ROW_HEIGHT;
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 7,
            ".status-effects > .list": 2,
            ".spell-effects > .list": 7,
            ".active-effects > .list": 1,
        });
        applyStatusListSizing(dom.window.document.body, tallHeight);

        // budget = 8 + 5 = 13. Ceilings: d=7, s=2, sp=7, a=1 (total 17).
        // order active→spell→status→damage. active hits 1, status hits 2 early;
        // remaining 10 split between spell and damage, spell taking priority each pass.

        expect(getCapacity(dom, ".active-effects > .list")).to.equal("1");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("2");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("5");
        expect(getCapacity(dom, ".damage > .list")).to.equal("5");
    });

    it("shorter than baseline: budget shrinks below BASE_CAPACITY", () => {
        const shrinkRows = 3;
        const shortHeight = BASELINE_HEIGHT - shrinkRows * ROW_HEIGHT;
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 10,
            ".status-effects > .list": 10,
            ".spell-effects > .list": 10,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, shortHeight);

        // budget = 8 - 3 = 5. 2 passes use 4, 1 more to active.
        expect(getCapacity(dom, ".damage > .list")).to.equal("1");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("1");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("1");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("2");
    });

    it("clamps to 0 budget when sheet is far shorter than baseline", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 10,
            ".status-effects > .list": 10,
            ".spell-effects > .list": 10,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, -100);

        expect(getCapacity(dom, ".damage > .list")).to.equal("0");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("0");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("0");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("0");
    });

    it("auto height: treated as baseline budget", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 2,
            ".status-effects > .list": 5,
            ".spell-effects > .list": 3,
            ".active-effects > .list": 4,
        });
        applyStatusListSizing(dom.window.document.body, "auto" as const);

        // budget = 8. order active→spell→status→damage, 2 full passes.
        expect(getCapacity(dom, ".damage > .list")).to.equal("2");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("2");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("2");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("2");
    });

    it("empty/missing status tab → early return, no crash", () => {
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        expect(() => applyStatusListSizing(dom.window.document.body, BASELINE_HEIGHT)).to.not.throw();
    });

    it("over-slack: budget exceeds total items → all items shown, remainder unused", () => {
        const extraRows = 40;
        const tallHeight = BASELINE_HEIGHT + extraRows * ROW_HEIGHT;
        const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
        buildStatusTabDom(dom, {
            ".damage > .list": 10,
            ".status-effects > .list": 10,
            ".spell-effects > .list": 10,
            ".active-effects > .list": 10,
        });
        applyStatusListSizing(dom.window.document.body, tallHeight);

        // budget = 8 + 40 = 48, total items = 40 → each list capped at 10.
        expect(getCapacity(dom, ".damage > .list")).to.equal("10");
        expect(getCapacity(dom, ".status-effects > .list")).to.equal("10");
        expect(getCapacity(dom, ".spell-effects > .list")).to.equal("10");
        expect(getCapacity(dom, ".active-effects > .list")).to.equal("10");
    });

    it("constant exports are correct", () => {
        expect(BASELINE_HEIGHT).to.equal(720);
        expect(ROW_HEIGHT).to.equal(31);
        expect(BASE_CAPACITY).to.equal(8);
    });
});
