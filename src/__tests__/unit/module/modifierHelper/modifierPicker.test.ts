import { expect } from "chai";
import { JSDOM } from "jsdom";
import { attributeChoices, modifierDescription } from "module/modifierHelper/catalogue";
import { ModifierHelper } from "module/modifierHelper/ModifierHelper";
import { activateModifierPicker } from "module/modifierHelper/modifierPicker";
import { modifierGroups, modifierCategories } from "module/modifierHelper/modifierGroups";
import { skillGroups } from "module/config/skillGroups";
import { createHtml } from "../../../handlebarHarness";
import { definitions, definition, sampleValue, setupModifierHelperTests } from "./testUtils";

describe("Modifier helper", () => {
    const sandbox = setupModifierHelperTests();

    it("suggests the next comma-separated damage feature and preserves levels and surrounding entries", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'item.damage features="Scharf 2" 2W6+2',
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        const render = sandbox.stub(helper, "render").resolves(helper);
        try {
            await helper._onRender(context);
            const damageValue = helper.element.querySelector<HTMLInputElement>("[name=modifierValue]")!;
            damageValue.value = "2W6 +2";
            damageValue.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            const input = helper.element.querySelector<HTMLInputElement>("[data-attribute=features]")!;
            const picker = input.closest<HTMLElement>(".modifier-feature-combobox");
            expect(picker).not.to.equal(null);
            const visible = () =>
                [...picker!.querySelectorAll<HTMLElement>("[data-picker-value]")].filter((option) => !option.hidden);
            const change = (value: string, caret = value.length) => {
                input.value = value;
                input.setSelectionRange(caret, caret);
                input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            };
            change("Scharf 2,");
            expect(input.getAttribute("aria-expanded")).to.equal("true");
            expect(visible().length).to.be.greaterThan(20);
            change("Scharf 2, kRiT");
            expect(visible().map((option) => option.dataset.pickerValue)).to.include("Kritisch");
            expect(visible()[0].textContent).to.include("Kritisch [Stufe]");
            input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
            input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            expect(input.value).to.equal("Scharf 2, Kritisch");
            expect(input.getAttribute("aria-expanded")).to.equal("false");
            expect(dom.window.document.activeElement).to.equal(input);
            change("Scharf 2, Kritisch 3,");
            expect(input.getAttribute("aria-expanded")).to.equal("true");
            change("Scharf 2, Kritisch 3, Wuch");
            expect(visible()[0].textContent).to.equal("Wuchtig");
            visible()[0].click();
            expect(input.value).to.equal("Scharf 2, Kritisch 3, Wuchtig");
            expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(
                'item.damage features="Scharf 2, Kritisch 3, Wuchtig" 2W6+2'
            );
            change("Scharf 2, Ex, Wuchtig", "Scharf 2, Ex".length);
            visible()[0].click();
            expect(input.value).to.equal("Scharf 2, Exakt, Wuchtig");
            change("Scharf 2, unbekanntes Merkmal");
            expect(visible()).to.be.empty;
            expect(input.value).to.equal("Scharf 2, unbekanntes Merkmal");
            expect(input.getAttribute("aria-expanded")).to.equal("false");
            change("Scharf 2,");
            input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            expect(input.getAttribute("aria-expanded")).to.equal("false");
            input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
            expect(input.getAttribute("aria-expanded")).to.equal("true");
            expect(input.getAttribute("aria-activedescendant")).to.equal(visible()[visible().length - 1].id);
            helper.element.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true }));
            expect(input.getAttribute("aria-expanded")).to.equal("false");
            expect(render.called).to.equal(false);
            expect(
                context.fields
                    .find((field) => field.key === "features")!
                    .choices.some((choice) => choice.value === "Scharf 2")
            ).to.equal(false);
        } finally {
            dom.window.close();
        }
    });

    for (const entry of definitions.filter(
        (entry) =>
            [...entry.requiredAttributes, ...entry.optionalAttributes].includes("skill") &&
            !entry.helperAttributes?.skill?.hidden
    )) {
        it(`provides searchable skill choices without duplicating values in ${entry.path}`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `${entry.path} ${sampleValue(entry)}`,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            try {
                await helper._onRender(context);
                const picker = helper.element.querySelector<HTMLDetailsElement>('[data-attribute-picker="skill"]');
                expect(picker).not.to.equal(null);
                const focus = entry.path.startsWith("focus.");
                const grouped = entry.helperAttributes?.skill?.groupChoices !== false;
                if (!grouped) {
                    expect(picker!.querySelector("[data-category-heading]")).to.equal(null);
                    const visible = [...picker!.querySelectorAll<HTMLElement>("[data-picker-value]")].filter(
                        (option) => !option.hidden
                    );
                    expect(visible.map((option) => option.dataset.pickerValue)).to.have.members([
                        "",
                        ...(focus ? [] : ["arcanelore"]),
                        ...skillGroups.magic,
                    ]);
                    const labels = visible.slice(1).map((option) => option.textContent!);
                    expect(labels).to.deep.equal([...labels].sort((a, b) => a.localeCompare(b, "de")));
                }
                for (const category of grouped ? (["general", "fighting", "magic"] as const) : []) {
                    const group = picker!.querySelector<HTMLElement>(`[data-choice-category="${category}"]`)!;
                    expect(group.getAttribute("role")).to.equal("group");
                    expect(group.querySelector("[data-category-heading]")!.getAttribute("aria-expanded")).to.equal(
                        "false"
                    );
                    expect(
                        [...group.querySelectorAll<HTMLElement>("[data-picker-value]")].every((option) => option.hidden)
                    ).to.equal(true);
                    expect(
                        [...group.querySelectorAll<HTMLElement>("[data-picker-value]")]
                            .map((option) => option.dataset.pickerValue)
                            .sort()
                    ).to.deep.equal(
                        skillGroups[category]
                            .filter((skill) =>
                                attributeChoices(entry, "skill").some((choice) => choice.value === skill)
                            )
                            .sort()
                    );
                }
                const search = picker!.querySelector<HTMLInputElement>('input[type="search"]')!;
                search.value = "fEuEr";
                search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                expect(
                    [...picker!.querySelectorAll<HTMLElement>("[data-picker-value]")]
                        .filter((option) => !option.hidden)
                        .map((option) => option.dataset.pickerValue)
                ).to.deep.equal(["firemagic"]);
                if (grouped)
                    expect(
                        [...picker!.querySelectorAll<HTMLElement>("[data-choice-category]")]
                            .filter((group) => !group.hidden)
                            .map((group) => group.dataset.choiceCategory)
                    ).to.deep.equal(["magic"]);
                if (grouped)
                    expect(
                        picker!.querySelector('[data-category-heading="magic"]')!.getAttribute("aria-expanded")
                    ).to.equal("true");
                search.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
                dom.window.document.activeElement!.dispatchEvent(
                    new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })
                );
                expect(helper.element.querySelector<HTMLInputElement>("[data-attribute=skill]")!.value).to.equal(
                    "firemagic"
                );
                expect(picker!.querySelector("summary")!.textContent).to.include("Feuermagie");
                if (grouped)
                    expect(
                        picker!.querySelector('[data-category-heading="magic"]')!.getAttribute("aria-expanded")
                    ).to.equal("false");
                expect(
                    (await helper._prepareContext({})).fields.find((field) => field.key === "skill")!.value
                ).to.equal("firemagic");
                expect(helper.element.querySelectorAll("[name=modifierValue]")).to.have.length(
                    entry.requiresValue ? 1 : 0
                );
                picker!.querySelector<HTMLElement>('[data-picker-value=""]')!.click();
                expect(helper.element.querySelector<HTMLInputElement>("[data-attribute=skill]")!.value).to.equal("");
                search.value = "keine Fertigkeit";
                search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                expect(picker!.querySelector<HTMLElement>(".modifier-picker-empty")!.textContent).to.include(
                    "splittermond.modifierHelper.noSkillResults"
                );
            } finally {
                dom.window.close();
            }
        });
    }

    it("keeps manually expanded skill categories across renders and restores them after searching", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: "actor.skills +2",
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        try {
            await helper._onRender(context);
            const picker = helper.element.querySelector<HTMLDetailsElement>('[data-attribute-picker="skill"]')!;
            const general = picker.querySelector<HTMLButtonElement>('[data-category-heading="general"]')!;
            general.click();
            expect(general.getAttribute("aria-expanded")).to.equal("true");
            expect(picker.querySelector<HTMLElement>('[data-picker-value="acrobatics"]')!.hidden).to.equal(false);
            const search = picker.querySelector<HTMLInputElement>('input[type="search"]')!;
            search.value = "feuer";
            search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            const magic = picker.querySelector<HTMLButtonElement>('[data-category-heading="magic"]')!;
            expect(magic.getAttribute("aria-expanded")).to.equal("true");
            magic.click();
            expect(picker.querySelector<HTMLElement>('[data-picker-value="firemagic"]')!.hidden).to.equal(true);
            expect(picker.querySelector<HTMLElement>(".modifier-picker-empty")!.hidden).to.equal(true);
            search.value = "";
            search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            expect(general.getAttribute("aria-expanded")).to.equal("true");
            expect(magic.getAttribute("aria-expanded")).to.equal("false");
            const updated = await helper._prepareContext({});
            helper.element.innerHTML = createHtml("templates/apps/modifier-helper.hbs", updated);
            await helper._onRender(updated);
            expect(
                helper.element
                    .querySelector('[data-attribute-picker="skill"] [data-category-heading="general"]')!
                    .getAttribute("aria-expanded")
            ).to.equal("true");
            expect(
                helper.element
                    .querySelector('[data-attribute-picker="skill"] [data-category-heading="magic"]')!
                    .getAttribute("aria-expanded")
            ).to.equal("false");
        } finally {
            dom.window.close();
        }
    });

    describe("selected picker visibility", () => {
        const cases = [
            ['item.addFeature feature="Gehärtet" +1', '[data-attribute-picker="feature"]', "Gehärtet", false],
            ['actor.skills skill="watermagic" +2', '[data-attribute-picker="skill"]', "watermagic", true],
            [
                'item.castDuration unit="T" skill="watermagic" +2',
                '[data-attribute-picker="skill"]',
                "watermagic",
                false,
            ],
            ["watermagic +2", ".modifier-picker-main", "watermagic", true],
            ["item.castDuration.multiplier 2", ".modifier-variant-picker", "item.castDuration.multiplier", false],
        ] as const;

        for (const [initial, selector, value, grouped] of cases) {
            it(`reveals and scrolls to ${value} when reopening ${selector}`, async () => {
                const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
                const context = await helper._prepareContext({});
                const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
                const root = dom.window.document.body;
                Object.defineProperty(helper, "element", { value: root });
                const render = sandbox.spy(helper, "render");
                try {
                    await helper._onRender(context);
                    const picker = root.querySelector<HTMLDetailsElement>(selector)!;
                    const list = picker.querySelector<HTMLElement>(".modifier-picker-list")!;
                    const selected = picker.querySelector<HTMLElement>(`[data-picker-value="${value}"]`)!;
                    const body = root.querySelector<HTMLElement>(".modifier-helper-body")!;
                    sandbox.stub(list, "getBoundingClientRect").returns(new dom.window.DOMRect(0, 100, 600, 200));
                    sandbox.stub(selected, "getBoundingClientRect").returns(new dom.window.DOMRect(0, 650, 600, 30));
                    Object.defineProperty(list, "clientHeight", { value: 200 });
                    picker.querySelectorAll<HTMLElement>("[data-category-heading]").forEach((heading) => {
                        sandbox.stub(heading, "getBoundingClientRect").returns(new dom.window.DOMRect(0, 100, 600, 40));
                    });
                    list.scrollTop = 15;
                    body.scrollTop = 23;
                    picker.open = true;
                    picker.dispatchEvent(new dom.window.Event("toggle"));
                    expect(selected.hidden).to.equal(false);
                    expect(list.scrollTop).to.equal(grouped ? 460 : 480);
                    expect(body.scrollTop).to.equal(23);
                    expect(dom.window.document.activeElement).to.equal(
                        picker.querySelector('input[type="search"]') ?? selected
                    );
                    expect(render.called).to.equal(false);
                    if (grouped)
                        expect(
                            picker.querySelector('[data-category-heading="magic"]')!.getAttribute("aria-expanded")
                        ).to.equal("true");
                } finally {
                    dom.window.close();
                }
            });
        }

        it("clears an excluding search on reopening but keeps the selected modifier and value", async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: "watermagic +2",
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            const root = dom.window.document.body;
            Object.defineProperty(helper, "element", { value: root });
            try {
                await helper._onRender(context);
                const picker = root.querySelector<HTMLDetailsElement>(".modifier-picker-main")!;
                const search = picker.querySelector<HTMLInputElement>("[name=modifierSearch]")!;
                search.value = "defense";
                search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                picker.open = true;
                picker.dispatchEvent(new dom.window.Event("toggle"));
                expect(search.value).to.equal("");
                expect(picker.querySelector<HTMLElement>('[data-picker-value="watermagic"]')!.hidden).to.equal(false);
                expect((await helper._prepareContext({})).search).to.equal("");
                expect(root.querySelector<HTMLInputElement>("[name=modifierValue]")!.value).to.equal("2");
            } finally {
                dom.window.close();
            }
        });
    });

    describe("modifier picker", () => {
        let dom: JSDOM;
        let root: HTMLElement;
        let picker: HTMLDetailsElement;
        let search: HTMLInputElement;
        let selected: string;
        let dispose: () => void;
        const options = () => [...root.querySelectorAll<HTMLElement>("[data-modifier-path]")];
        const visible = () => options().filter((option) => !option.hidden);
        const searchFor = (query: string) => {
            search.value = query;
            search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
        };
        const key = (element: HTMLElement, value: string) =>
            element.dispatchEvent(
                new dom.window.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true })
            );

        beforeEach(async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: "defense +2",
                validate: () => [],
                apply: () => true,
            });
            dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", await helper._prepareContext({})));
            root = dom.window.document.body;
            picker = root.querySelector<HTMLDetailsElement>(".modifier-picker")!;
            search = root.querySelector<HTMLInputElement>("[name=modifierSearch]")!;
            selected = "";
            dispose = activateModifierPicker(
                root,
                (path) => (selected = path),
                () => {}
            );
            picker.open = true;
        });
        afterEach(() => {
            dispose();
            dom.window.close();
        });

        it("shows only the path in the closed selection and separate description columns in the list", () => {
            expect(picker.querySelector("summary")!.textContent).to.equal("defense");
            const option = options().find((entry) => entry.dataset.modifierPath === "defense")!;
            expect(option.children).to.have.length(2);
            expect(option.children[0].textContent).to.equal("defense");
            expect(option.children[1].textContent).to.equal(modifierDescription(definition("defense")));
        });

        it("starts with two root categories and retains child expansion when the skill parent closes", () => {
            const headings = () =>
                [...root.querySelectorAll<HTMLButtonElement>("[data-category-heading]")]
                    .filter((heading) => !heading.hidden)
                    .map((heading) => heading.dataset.categoryHeading);
            expect(headings()).to.deep.equal(["skills", "other"]);
            const parent = root.querySelector<HTMLButtonElement>('[data-category-heading="skills"]')!;
            parent.click();
            expect(headings()).to.deep.equal(["skills", "general", "magic", "fighting", "other"]);
            expect(visible()).to.be.empty;
            root.querySelector<HTMLButtonElement>('[data-category-heading="magic"]')!.click();
            expect(visible().map((option) => option.dataset.modifierPath)).to.have.members([
                "actor.skills.magic",
                ...skillGroups.magic,
            ]);
            parent.click();
            expect(headings()).to.deep.equal(["skills", "other"]);
            expect(visible()).to.be.empty;
            parent.click();
            expect(visible().map((option) => option.dataset.modifierPath)).to.have.members([
                "actor.skills.magic",
                ...skillGroups.magic,
            ]);
            expect(parent.querySelector("[data-category-count]")!.textContent).to.equal(
                String(skillGroups.general.length + skillGroups.magic.length + skillGroups.fighting.length + 5)
            );
        });

        it("filters by description as well as path without retaining unrelated selected entries", () => {
            searchFor("waffengeschwindigkeit");
            expect(visible().map((option) => option.dataset.modifierPath)).to.deep.equal(["item.weaponspeed"]);
            searchFor("ITEM.DAMAGE");
            expect(visible().map((option) => option.dataset.modifierPath)).to.deep.equal(["item.damage"]);
        });

        it("searches collapsed parents and restores their state after sorting and clearing the search", () => {
            const parent = root.querySelector<HTMLButtonElement>('[data-category-heading="skills"]')!;
            const magic = root.querySelector<HTMLButtonElement>('[data-category-heading="magic"]')!;
            searchFor("Feuermagie");
            expect(visible().map((option) => option.dataset.modifierPath)).to.deep.equal(["firemagic"]);
            expect(parent.hidden).to.equal(false);
            expect(magic.hidden).to.equal(false);
            expect(parent.getAttribute("aria-expanded")).to.equal("true");
            parent.click();
            expect(visible()).to.be.empty;
            expect(magic.hidden).to.equal(true);
            expect(root.querySelector<HTMLElement>(".modifier-picker-empty")!.hidden).to.equal(true);
            root.querySelector<HTMLInputElement>("[name=modifierSort][value=alphabetical]")!.click();
            expect(parent.hidden).to.equal(true);
            expect(visible().map((option) => option.dataset.modifierPath)).to.deep.equal(["firemagic"]);
            root.querySelector<HTMLInputElement>("[name=modifierSort][value=category]")!.click();
            expect(visible()).to.be.empty;
            searchFor("");
            expect(parent.getAttribute("aria-expanded")).to.equal("false");
            expect(magic.hidden).to.equal(true);
            expect(visible()).to.be.empty;
        });

        it("shows an empty result and restores the choices after clearing search", () => {
            const empty = root.querySelector<HTMLElement>(".modifier-picker-empty")!;
            searchFor("no matching modifier");
            expect(visible()).to.have.length(0);
            expect(empty.hidden).to.equal(false);
            searchFor("");
            expect(visible()).to.be.empty;
            expect(empty.hidden).to.equal(true);
        });

        it("starts with all categories collapsed and opens their choices on demand", () => {
            const headings = [...root.querySelectorAll<HTMLButtonElement>("[data-category-heading]")];
            expect(headings).to.have.length(modifierCategories.length + 1);
            expect(headings.every((heading) => heading.getAttribute("aria-expanded") === "false")).to.equal(true);
            expect(visible()).to.be.empty;
            headings.find((heading) => heading.dataset.categoryHeading === "skills")!.click();
            headings.find((heading) => heading.dataset.categoryHeading === "general")!.click();
            expect(visible().map((option) => option.dataset.modifierPath)).to.have.members([
                "actor.skills",
                "actor.skills.general",
                "actor.skills.social",
                ...skillGroups.general,
            ]);
            expect(picker.open).to.equal(true);
        });

        it("scrolls the first expanded entry directly below its category heading", () => {
            root.querySelector<HTMLButtonElement>('[data-category-heading="skills"]')!.click();
            const list = root.querySelector<HTMLElement>(".modifier-picker-list")!;
            const heading = root.querySelector<HTMLButtonElement>('[data-category-heading="magic"]')!;
            const first = root.querySelector<HTMLElement>('[data-modifier-path="actor.skills.magic"]')!;
            sandbox.stub(list, "getBoundingClientRect").returns(new dom.window.DOMRect(0, 100, 600, 400));
            sandbox.stub(heading, "getBoundingClientRect").returns(new dom.window.DOMRect(0, 170, 600, 40));
            sandbox.stub(first, "getBoundingClientRect").returns(new dom.window.DOMRect(0, 220, 600, 20));
            list.scrollTop = 15;
            heading.click();
            expect(list.scrollTop).to.equal(95);
            heading.click();
            expect(list.scrollTop).to.equal(95);
        });

        it("moves the keyboard focus only through visible choices", () => {
            searchFor("actor.");
            key(search, "ArrowDown");
            expect(dom.window.document.activeElement).to.equal(visible()[0]);
            key(visible()[0], "ArrowDown");
            expect(dom.window.document.activeElement).to.equal(visible()[1]);
            key(visible()[1], "End");
            expect(dom.window.document.activeElement).to.equal(visible()[visible().length - 1]);
            key(visible()[visible().length - 1], "Home");
            expect(dom.window.document.activeElement).to.equal(visible()[0]);
        });

        it("closes with Escape, restores focus and consumes the key without changing the selection", () => {
            expect(key(search, "Escape")).to.equal(false);
            expect(picker.open).to.equal(false);
            expect(dom.window.document.activeElement).to.equal(picker.querySelector("summary"));
            expect(selected).to.equal("");
        });

        it("selects the clicked path and closes the list", () => {
            searchFor("item");
            options()
                .find((entry) => entry.dataset.modifierPath === "item.damage")!
                .click();
            expect(selected).to.equal("item.damage");
            expect(picker.open).to.equal(false);
        });

        for (const activationKey of ["Enter", " "]) {
            it(`selects the focused option with ${JSON.stringify(activationKey)}`, () => {
                searchFor("item");
                const option = options().find((entry) => entry.dataset.modifierPath === "item.damage")!;
                option.focus();
                key(option, activationKey);
                expect(selected).to.equal("item.damage");
                expect(picker.open).to.equal(false);
            });
        }

        it("dismisses the list when focus leaves the picker", () => {
            search.focus();
            root.querySelector<HTMLInputElement>("[name=modifierValue]")!.focus();
            expect(picker.open).to.equal(false);
        });

        it("keeps the menu open during the transient focus loss of a sort label click", () => {
            search.focus();
            search.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
            expect(picker.open).to.equal(true);
            root.querySelector<HTMLInputElement>("[name=modifierSort][value=alphabetical]")!.click();
            expect(picker.open).to.equal(true);
        });

        it("dismisses outside pointer clicks and removes that listener on disposal", () => {
            root.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true }));
            expect(picker.open).to.equal(false);
            picker.open = true;
            dispose();
            root.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true }));
            expect(picker.open).to.equal(true);
        });

        it("collapses categories, searches their hidden entries, and restores the collapsed state", () => {
            root.querySelector<HTMLButtonElement>('[data-category-heading="skills"]')!.click();
            const heading = root.querySelector<HTMLButtonElement>('[data-category-heading="magic"]')!;
            heading.click();
            heading.click();
            expect(heading.getAttribute("aria-expanded")).to.equal("false");
            expect(visible().some((option) => option.dataset.category === "magic")).to.equal(false);
            expect(picker.open).to.equal(true);
            searchFor("Feuermagie");
            expect(visible().map((option) => option.dataset.modifierPath)).to.deep.equal(["firemagic"]);
            expect(heading.getAttribute("aria-expanded")).to.equal("true");
            searchFor("");
            expect(heading.getAttribute("aria-expanded")).to.equal("false");
            expect(visible().some((option) => option.dataset.category === "magic")).to.equal(false);
            heading.click();
            expect(visible().filter((option) => option.dataset.category === "magic")).to.have.length(
                skillGroups.magic.length + 1
            );
        });

        it("does not show an empty-search warning when all categories are collapsed", () => {
            expect(visible()).to.be.empty;
            expect(root.querySelector<HTMLElement>(".modifier-picker-empty")!.hidden).to.equal(true);
            root.querySelector<HTMLInputElement>("[name=modifierSort][value=alphabetical]")!.click();
            expect(visible()).to.have.length(modifierGroups(definitions).length);
        });

        it("switches between grouped and alphabetical ordering without losing search or drafts", () => {
            const headings = () =>
                [...root.querySelectorAll<HTMLElement>("[data-category-heading]")].filter((heading) => !heading.hidden);
            expect(headings().map((heading) => heading.dataset.categoryHeading)).to.deep.equal(["skills", "other"]);
            root.querySelectorAll<HTMLButtonElement>("[data-category-heading]").forEach((heading) => heading.click());
            const categoryOrder = visible().map((option) =>
                modifierCategories.findIndex((category) => category === option.dataset.category)
            );
            expect(categoryOrder).to.deep.equal([...categoryOrder].sort((a, b) => a - b));
            const value = root.querySelector<HTMLInputElement>("[name=modifierValue]")!;
            value.value = "7";
            searchFor("actor.");
            const matches = visible().map((option) => option.dataset.modifierPath!);
            root.querySelector<HTMLInputElement>("[name=modifierSort][value=alphabetical]")!.click();
            expect(visible().map((option) => option.dataset.modifierPath)).to.deep.equal(
                [...matches].sort((a, b) => a.localeCompare(b))
            );
            expect(headings()).to.be.empty;
            expect(search.value).to.equal("actor.");
            expect(value.value).to.equal("7");
            expect(root.querySelector("[name=modifierValue]")).to.equal(value);
            root.querySelector<HTMLInputElement>("[name=modifierSort][value=category]")!.click();
            expect(headings().map((heading) => heading.dataset.categoryHeading)).to.deep.equal([
                "skills",
                "general",
                "magic",
                "fighting",
                "other",
            ]);
            expect(picker.querySelector('[aria-selected="true"]')?.getAttribute("data-modifier-path")).to.equal(
                "defense"
            );
        });
    });
});
