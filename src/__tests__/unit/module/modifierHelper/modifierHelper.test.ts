import { expect } from "chai";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import { attributeChoices } from "module/modifierHelper/catalogue";
import { buildModifier, readModifierInput } from "module/modifierHelper/buildModifier";
import { ModifierHelper } from "module/modifierHelper/ModifierHelper";
import { skillGroups } from "module/config/skillGroups";
import { createHtml } from "../../../handlebarHarness";
import { foundryApi } from "module/api/foundryApi";
import { source, module, definitions, localize, definition, setupModifierHelperTests } from "./testUtils";

describe("Modifier helper", () => {
    const sandbox = setupModifierHelperTests();

    it("keeps DOM references unique and stable without crypto.randomUUID", async () => {
        sandbox.stub(crypto, "randomUUID").value(undefined);
        const options = {
            definitions,
            initial: 'item.damage features="Scharf 5" +2',
            validate: () => [],
            apply: () => true,
        };
        const first = new ModifierHelper(options);
        const second = new ModifierHelper(options);
        const contexts = await Promise.all([first._prepareContext({}), second._prepareContext({})]);
        const dom = new JSDOM(
            contexts.map((context) => createHtml("templates/apps/modifier-helper.hbs", context)).join("")
        );
        try {
            const ids = [...dom.window.document.querySelectorAll<HTMLElement>("[id]")].map((element) => element.id);
            expect(ids.length).to.be.greaterThan(0);
            expect(new Set(ids).size).to.equal(ids.length);
            for (const helper of dom.window.document.querySelectorAll(".modifier-helper-content")) {
                expect(helper.querySelector<HTMLDetailsElement>(".modifier-picker-main")!.open).to.equal(false);
                for (const element of helper.querySelectorAll("[list], [aria-describedby], [aria-errormessage]")) {
                    for (const attribute of ["list", "aria-describedby", "aria-errormessage"]) {
                        const references = element.getAttribute(attribute)?.split(" ") ?? [];
                        for (const id of references)
                            expect(helper.querySelector(`[id="${id}"]`), id).not.to.equal(null);
                    }
                }
            }
            expect(await first._prepareContext({})).to.deep.equal(contexts[0]);
            expect(contexts[0].preview).to.equal('item.damage features="Scharf 5" +2');
        } finally {
            dom.window.close();
        }
    });

    for (const initial of ["", "unknown +2", "defense +2, speed +1"]) {
        it(`starts without a selection when no single known modifier can be restored: ${initial}`, async () => {
            const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            try {
                await helper._onRender(context);
                expect(context.selectedPath).to.equal("");
                expect(helper.element.querySelector<HTMLDetailsElement>(".modifier-picker-main")!.open).to.equal(true);
                expect(context.modifiers.some((entry) => entry.selected)).to.equal(false);
                expect(context.pathSteps).to.be.empty;
                expect(context.fields).to.be.empty;
                expect(context.preview).to.equal("");
                expect(helper.element.querySelector(".modifier-picker summary span")!.textContent).to.equal(
                    "splittermond.modifierHelper.chooseModifier"
                );
                expect(helper.element.querySelector("[name=modifierValue]")).to.equal(null);
                expect(
                    helper.element.querySelector<HTMLButtonElement>("[data-action=applyModifier]")!.disabled
                ).to.equal(true);
                expect(helper.element.querySelector<HTMLElement>("[data-error-general]")!.hidden).to.equal(true);
            } finally {
                dom.window.close();
            }
        });
    }

    for (const [initial, typeLabel] of [
        ['check.require rollType="standard"', "Probenart"],
        ['check.result category="success" +1', "Probenart"],
        ["focus.reduction K1V1", "Zaubertypus"],
    ]) {
        it(`labels optional fields and displays their descriptions below the controls: ${initial}`, async () => {
            const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            try {
                expect(context.fields.find((field) => field.key === "type")?.label).to.equal(typeLabel);
                for (const field of context.fields) {
                    const input = dom.window.document.querySelector(`[data-attribute="${field.key}"]`)!;
                    const label = input.closest(".modifier-helper-control")!;
                    expect(
                        label
                            .querySelector(".modifier-helper-label")!
                            .textContent!.includes("(splittermond.modifierHelper.optional)")
                    ).to.equal(!field.required);
                    const hint = label.querySelector<HTMLElement>(".modifier-helper-hint")!;
                    expect(hint.textContent).to.equal(field.hint);
                    expect(hint.hidden).to.equal(false);
                    expect([...label.children].indexOf(hint)).to.be.greaterThan([...label.children].indexOf(input));
                    const visibleInput = field.searchable ? label.querySelector("summary")! : input;
                    expect(visibleInput.getAttribute("aria-describedby")!.split(" ")).to.include(hint.id);
                }
                expect(dom.window.document.querySelector("[data-tooltip]")).to.equal(null);
            } finally {
                dom.window.close();
            }
        });
    }

    it("renders translated check-result categories accepted by the handler", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'check.result category="success" +1',
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        try {
            const options = [
                ...dom.window.document.querySelectorAll<HTMLOptionElement>(
                    '[data-attribute="category"] option[value]:not([value=""])'
                ),
            ];
            expect(options.map((option) => option.value)).to.deep.equal(
                attributeChoices(definition("check.result"), "category").map((choice) => choice.value)
            );
            for (const option of options) {
                expect(option.textContent, option.value).not.to.include("splittermond.");
                const result = module.addModifier(source, `check.result category="${option.textContent}" +1`, "innate");
                expect(result.hasErrors, option.textContent ?? option.value).to.equal(false);
                expect(result.modifiers[0].modifier.attributes.category).to.equal(option.value);
            }
        } finally {
            dom.window.close();
        }
    });

    for (const path of ["splinterpoints", "actor.splinterpoints"]) {
        for (const filter of ["", ' skill="acrobatics"']) {
            it(`omits the ineffective skill filter from the splinterpoint base helper: ${path}${filter}`, async () => {
                const initial = `${path}${filter} +2`;
                const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
                const context = await helper._prepareContext({});
                const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
                try {
                    expect(dom.window.document.querySelector("[data-attribute=skill]")).to.equal(null);
                    expect(context.preview).to.equal("actor.splinterpoints +2");
                    expect(module.addModifier(source, initial, "innate").hasErrors).to.equal(false);
                } finally {
                    dom.window.close();
                }
            });
        }

        it(`retains an editable skill filter for ${path}.bonus`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `${path}.bonus skill="acrobatics" +5`,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            try {
                const skill = dom.window.document.querySelector<HTMLSelectElement>("[data-attribute=skill]")!;
                expect(skill.value).to.equal("acrobatics");
                expect(context.preview).to.equal('actor.splinterpoints.bonus skill="acrobatics" +5');
            } finally {
                dom.window.close();
            }
        });
    }

    it("discards the bonus skill filter when switching to the splinterpoint base value", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'actor.splinterpoints.bonus skill="acrobatics" +5',
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        sandbox.stub(helper, "render").resolves(helper);
        try {
            await helper._onRender(context);
            helper.element.querySelector<HTMLElement>('[data-path-parent="actor.splinterpoints"]')!.click();
            helper.element
                .querySelector<HTMLElement>('.modifier-variant-picker [data-picker-value="actor.splinterpoints"]')!
                .click();
            const updated = await helper._prepareContext({});
            expect(updated.fields.some((field) => field.key === "skill")).to.equal(false);
            expect(updated.preview).to.equal("actor.splinterpoints +5");
        } finally {
            dom.window.close();
        }
    });

    it("resets only the editing body's scroll position when choosing a different modifier", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'item.addFeature feature="Scharf" +2',
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        sandbox.stub(helper, "render").resolves(helper);
        try {
            await helper._onRender(context);
            const body = helper.element.querySelector<HTMLElement>(".modifier-helper-body")!;
            body.scrollTop = 280;
            helper.element.querySelector<HTMLElement>('[data-modifier-path="item.damage"]')!.click();
            await Promise.resolve();
            expect(body.scrollTop).to.equal(0);
            expect((await helper._prepareContext({})).selectedPath).to.equal("item.damage");
        } finally {
            dom.window.close();
        }
    });

    it("keeps selection, result and actions outside the scrollable editing body", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: "item.damage +2",
            multiple: true,
            validate: () => [],
            apply: () => true,
        });
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", await helper._prepareContext({})));
        try {
            const root = dom.window.document.querySelector(".modifier-helper-content")!;
            const body = root.querySelector(".modifier-helper-body");
            expect(body).not.to.equal(null);
            expect(root.querySelector(".modifier-helper-selection")!.parentElement).to.equal(root);
            const bottom = root.querySelector(".modifier-helper-bottom");
            expect(bottom).not.to.equal(null);
            expect(bottom!.parentElement).to.equal(root);
            expect(root.querySelector(".form-footer")!.parentElement).to.equal(bottom);
            expect(body!.querySelector("[name=modifierValue]")).not.to.equal(null);
            expect(body!.querySelector("output")).to.equal(null);
            expect(bottom!.querySelector("output")).not.to.equal(null);
            expect(ModifierHelper.PARTS.content.scrollable).to.deep.equal([".modifier-helper-body"]);
        } finally {
            dom.window.close();
        }
    });

    it("defaults a newly selected cast duration to ticks and restores the default after the factor variant", async () => {
        const helper = new ModifierHelper({ definitions, initial: "", validate: () => [], apply: () => true });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        sandbox.stub(helper, "render").callsFake(async () => {
            const updated = await helper._prepareContext({});
            helper.element.innerHTML = createHtml("templates/apps/modifier-helper.hbs", updated);
            await helper._onRender(updated);
            return helper;
        });
        try {
            await helper._onRender(context);
            helper.element.querySelector<HTMLElement>('[data-modifier-path="item.castDuration"]')!.click();
            await helper.render();
            expect(helper.element.querySelector<HTMLSelectElement>("[data-attribute=unit]")!.value).to.equal("T");
            helper.element.querySelector<HTMLElement>('[data-picker-value="item.castDuration.multiplier"]')!.click();
            await helper.render();
            expect(helper.element.querySelector("[data-attribute=unit]")).to.equal(null);
            helper.element
                .querySelector<HTMLElement>('.modifier-variant-picker [data-picker-value="item.castDuration"]')!
                .click();
            await helper.render();
            expect(helper.element.querySelector<HTMLSelectElement>("[data-attribute=unit]")!.value).to.equal("T");
        } finally {
            dom.window.close();
        }
    });

    for (const unit of ["T", "min", "unknown"]) {
        it(`preserves a restored cast duration unit ${unit} instead of applying the default`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `item.castDuration unit="${unit}" +2`,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            expect(context.fields.find((field) => field.key === "unit")!.value).to.equal(unit);
            expect(context.preview).to.include(`unit="${unit}"`);
        });
    }

    it("defaults an omitted duration unit but respects an explicitly cleared choice on rerender", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: "item.castDuration +2",
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        expect(context.fields.find((field) => field.key === "unit")!.value).to.equal("T");
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        try {
            await helper._onRender(context);
            const unit = helper.element.querySelector<HTMLSelectElement>("[data-attribute=unit]")!;
            unit.value = "";
            unit.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
            expect((await helper._prepareContext({})).fields.find((field) => field.key === "unit")!.value).to.equal("");
        } finally {
            dom.window.close();
        }
    });

    for (const path of ["item.castDuration", "item.castDuration.multiplier", "lowerfumbleresult"]) {
        it(`offers only regular spell skills for new ${path} filters`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `${path} +2`,
                validate: () => [],
                apply: () => true,
            });
            const field = (await helper._prepareContext({})).fields.find((field) => field.key === "skill")!;
            expect(field.choices.map((choice) => choice.value)).to.have.members(["arcanelore", ...skillGroups.magic]);
            expect(field.choiceGroups).to.be.empty;
        });

        it(`preserves restored nonstandard spell skill filters in ${path}`, async () => {
            for (const skill of ["acrobatics", "Fremdfertigkeit"]) {
                const helper = new ModifierHelper({
                    definitions,
                    initial: `${path} skill="${skill}" +2`,
                    validate: () => [],
                    apply: () => true,
                });
                const context = await helper._prepareContext({});
                const field = context.fields.find((field) => field.key === "skill")!;
                expect(field.choices.find((choice) => choice.value === skill)?.selected).to.equal(true);
                expect(context.preview).to.include(`skill="${skill}"`);
            }
        });
    }

    for (const path of ["item.castDuration", "item.castDuration.multiplier"]) {
        it(`orders duration controls before skill and object filters in ${path}`, async () => {
            const multiplier = path.endsWith("multiplier");
            const helper = new ModifierHelper({
                definitions,
                initial: `${path}${multiplier ? "" : ' unit="T"'} 2`,
                validate: () => [],
                apply: () => true,
            });
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", await helper._prepareContext({})));
            try {
                const fields = [
                    ...dom.window.document.querySelectorAll<HTMLElement>("[data-attribute], [name=modifierValue]"),
                ];
                expect(fields.map((field) => field.dataset.attribute ?? "value")).to.deep.equal(
                    multiplier ? ["value", "skill", "item"] : ["unit", "value", "skill", "item"]
                );
                expect(dom.window.document.querySelectorAll("[name=modifierValue]")).to.have.length(1);
                const value = dom.window.document.querySelector(".modifier-helper-value")!;
                if (!multiplier) {
                    expect(value.previousElementSibling!.querySelector("[data-attribute=unit]")).not.to.equal(null);
                    expect(value.classList.contains("modifier-helper-wide")).to.equal(false);
                }
                expect(
                    fields
                        .find((field) => field.dataset.attribute === "skill")!
                        .closest(".modifier-helper-control")!
                        .classList.contains("modifier-helper-wide")
                ).to.equal(true);
            } finally {
                dom.window.close();
            }
        });
        it(`does not keep an empty object type field after clearing a restored ${path} filter`, async () => {
            const unit = path.endsWith("multiplier") ? "" : ' unit="T"';
            const helper = new ModifierHelper({
                definitions,
                initial: `${path}${unit} itemType="spell" 2`,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            try {
                await helper._onRender(context);
                const field = helper.element.querySelector<HTMLSelectElement>('[data-attribute="itemType"]')!;
                field.value = "";
                field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                const updated = await helper._prepareContext({});
                expect(updated.fields.some((entry) => entry.key === "itemType")).to.equal(false);
                expect(readModifierInput(updated.preview, definitions)?.input.attributes.itemType).to.equal(undefined);
            } finally {
                dom.window.close();
            }
        });

        it(`omits the redundant object type for new ${path} input but preserves existing filters`, async () => {
            const unit = path.endsWith("multiplier") ? "" : ' unit="T"';
            for (const itemType of ["", "spell", "weapon"]) {
                const filter = itemType ? ` itemType="${itemType}"` : "";
                const helper = new ModifierHelper({
                    definitions,
                    initial: `${path}${unit}${filter} 2`,
                    validate: () => [],
                    apply: () => true,
                });
                const context = await helper._prepareContext({});
                expect(context.fields.some((field) => field.key === "itemType")).to.equal(!!itemType);
                expect(readModifierInput(context.preview, definitions)?.input.attributes.itemType).to.equal(
                    itemType || undefined
                );
            }
        });
    }

    it("explains that fumble reduction moves magic table entries for sorcerers and priests", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: "lowerfumbleresult +1",
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        expect(context.description).to.include("Magiepatzertabelle");
        expect(context.description).to.include("Tabellenstufen");
        expect(context.description).to.include("Priester");
        expect(context.fields.find((field) => field.key === "skill")!.hint).to.include("Arkane Kunde");
    });

    for (const path of ["focus.reduction", "focus.addition", "focus.enhancedReduction", "focus.enhancedAddition"]) {
        it(`keeps ${path} suggestions within supported schools and explains the source skill restriction`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `${path} K1V1`,
                validate: () => [],
                apply: () => true,
            });
            const field = (await helper._prepareContext({})).fields.find((field) => field.key === "skill")!;
            expect(field.choices.map((choice) => choice.value)).to.have.members(skillGroups.magic);
            expect(field.hint).to.include("Quellobjekt");
            expect(field.hint).to.include("Fertigkeit");
        });
    }

    it("shows incompatible filters inline while editing and clears the error after correction", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'item.damage item="Test" spellType="fire" +2',
            validate: (raw) => module.addModifier(source, raw, "innate").diagnostics ?? [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        try {
            await helper._onRender(context);
            const field = helper.element.querySelector<HTMLInputElement>('[data-attribute="spellType"]')!;
            const error = helper.element.querySelector<HTMLElement>('[data-error-for="spellType"]')!;
            expect(field.getAttribute("aria-invalid")).to.equal("true");
            expect(error.textContent).to.equal(localize("splittermond.modifiers.parseMessages.spellTypeWithItem"));
            expect(field.getAttribute("aria-describedby")!.split(" ")).to.include(error.id);
            field.value = "";
            field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            expect(field.getAttribute("aria-invalid")).to.equal("false");
            expect(error.hidden).to.equal(true);
            expect(helper.element.querySelector("output")!.textContent).to.equal('item.damage item="Test" +2');
        } finally {
            dom.window.close();
        }
    });

    it("explains fixed additional damage without rejecting it or evaluating references", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'item.damage features="Scharf 5" +5',
            validate: (raw) => module.addModifier(source, raw, "innate").diagnostics ?? [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        const warn = sandbox.stub(foundryApi, "warnUser");
        try {
            await helper._onRender(context);
            const value = helper.element.querySelector<HTMLInputElement>("[name=modifierValue]")!;
            const features = helper.element.querySelector<HTMLInputElement>("[data-attribute=features]")!;
            const hint = helper.element.querySelector<HTMLElement>("[data-value-hint]");
            expect(hint?.textContent).to.include("feste Zahl");
            expect(hint!.hidden).to.equal(false);
            expect(value.getAttribute("aria-describedby")!.split(" ")).to.include(hint!.id);
            expect(value.getAttribute("aria-invalid")).to.equal("false");
            expect(features.getAttribute("aria-invalid")).to.equal("false");
            expect(context.fields.find((field) => field.key === "features")?.label).to.equal(
                "Merkmale des Zusatzschadens"
            );
            for (const [input, visible] of [
                ["-2", true],
                ["2.5", true],
                ["1W6", false],
                ["${attributes.strength.value}", false],
                ["", false],
                ["5", true],
            ] as const) {
                value.value = input;
                value.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                expect(hint!.hidden, input).to.equal(!visible);
                expect(helper.element.querySelector("[name=modifierValue]")).to.equal(value);
            }
            features.value = "";
            features.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            expect(hint!.hidden).to.equal(true);
            expect(hint!.textContent).to.equal("");
            expect(warn.called).to.equal(false);
        } finally {
            dom.window.close();
        }
    });

    it("describes every variant before it is selected, including the base value", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: "focuspoints +2",
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        try {
            const choices = context.pathSteps[0].choices;
            expect(choices).to.have.length(3);
            for (const choice of choices) {
                expect(choice.description).not.to.include("splittermond.");
                expect(choice.description).not.to.be.empty;
                const option = dom.window.document.querySelector(
                    `.modifier-variant-picker [data-picker-value="${choice.value}"]`
                )!;
                expect(option.children[1].textContent).to.equal(choice.description);
            }
            expect(choices.find((choice) => choice.value.endsWith(".multiplier"))?.description).to.include(
                "Multipliziert"
            );
        } finally {
            dom.window.close();
        }
    });

    it("keeps translated or custom existing selections instead of dropping a filter", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'skills skill="Akrobatik" value=2',
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        expect(context.fields.find((field) => field.key === "skill")?.choices).to.deep.include({
            value: "Akrobatik",
            label: "Akrobatik",
            selected: true,
        });
    });

    for (const path of ["item.defenseTickCost", "item.weaponspeed", "lowerfumbleresult"]) {
        it(`${path}: places one value control before all filters and retains filtered input when changing it`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `${path} skill="blades" +2`,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            const render = sandbox.stub(helper, "render").resolves(helper);
            try {
                await helper._onRender(context);
                const controls = [
                    ...helper.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
                        "[name=modifierValue], [data-attribute]"
                    ),
                ];
                expect(controls[0].name).to.equal("modifierValue");
                expect(controls[0].closest(".modifier-helper-attributes")).not.to.equal(null);
                expect(helper.element.querySelectorAll("[name=modifierValue]")).to.have.length(1);
                const value = controls[0];
                value.value = "-3";
                value.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(
                    `${path} skill="blades" -3`
                );
                expect(helper.element.querySelector<HTMLInputElement>("[data-attribute=skill]")!.value).to.equal(
                    "blades"
                );
                expect(render.called).to.equal(false);
            } finally {
                dom.window.close();
            }
        });
    }

    it("places the damage value first inside attributes and accepts the displayed dice examples", async () => {
        for (const value of ["1W6", "2W6 +2", "+5"]) {
            const helper = new ModifierHelper({
                definitions,
                initial: `item.damage ${value.replace(/\s+/g, "")}`,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            try {
                const controls = [
                    ...dom.window.document.querySelectorAll<HTMLInputElement>("[name=modifierValue], [data-attribute]"),
                ];
                expect(controls[0].name).to.equal("modifierValue");
                expect(controls[0].closest(".modifier-helper-attributes")).not.to.equal(null);
                expect(controls[1].dataset.attribute).to.equal("item");
                expect(controls[0].placeholder).to.equal("bspw. 2W6 +2 oder +5");
                expect(dom.window.document.querySelectorAll("[name=modifierValue]")).to.have.length(1);
                const raw = buildModifier(definition("item.damage"), { value, attributes: {} });
                expect(raw).to.equal(`item.damage ${value.replace(/\s+/g, "")}`);
                expect(module.addModifier(source, raw!, "innate").hasErrors).to.equal(false);
            } finally {
                dom.window.close();
            }
        }
        const helper = new ModifierHelper({
            definitions,
            initial: "actor.skills +2",
            validate: () => [],
            apply: () => true,
        });
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", await helper._prepareContext({})));
        try {
            const controls = [
                ...dom.window.document.querySelectorAll<HTMLInputElement>("[name=modifierValue], [data-attribute]"),
            ];
            expect(controls[controls.length - 1].name).to.equal("modifierValue");
        } finally {
            dom.window.close();
        }
    });

    for (const path of ["item.damage", "item.addFeature", "item.mergeFeature"]) {
        it(`labels leveled features without changing the stored names in ${path}`, async () => {
            const initial = path === "item.damage" ? `${path} +2` : `${path} feature="Scharf" +2`;
            const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
            const context = await helper._prepareContext({});
            const choices = context.fields.find((field) => ["feature", "features"].includes(field.key))!.choices;
            for (const value of [
                "Ablenkend",
                "Auslöser",
                "Defensiv",
                "Durchdringung",
                "Entwaffnend",
                "Entwaffnungsschutz",
                "Exakt",
                "Kälteschutz",
                "Kritisch",
                "Parierwaffe",
                "Reiterwaffe",
                "Rückstoß",
                "Scharf",
            ]) {
                expect(choices.find((choice) => choice.value === value)!.label).to.equal(`${value} [Stufe]`);
            }
            for (const value of [
                "Wuchtig",
                "Deckung",
                "Lange Waffe",
                "Umwerfend",
                "Gehärtet",
                "Kletterhilfe",
                "Schildwall",
                "Stabil",
                "Unauffällig",
            ]) {
                expect(choices.find((choice) => choice.value === value)!.label).to.equal(value);
            }
        });
    }

    for (const path of ["item.addFeature", "item.mergeFeature"]) {
        it(`places the value beside the feature before the optional filters in ${path}`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `${path} feature="Scharf" +2`,
                validate: () => [],
                apply: () => true,
            });
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", await helper._prepareContext({})));
            try {
                const grid = dom.window.document.querySelector(
                    ".modifier-helper-attributes .modifier-helper-field-grid"
                )!;
                const feature = grid.querySelector('[data-attribute-picker="feature"]')!;
                const value = dom.window.document.querySelector<HTMLInputElement>("[name=modifierValue]")!;
                expect(feature.closest(".modifier-helper-control")!.nextElementSibling).to.equal(
                    value.closest(".modifier-helper-value")
                );
                expect(grid.children[1].classList.contains("modifier-helper-wide")).to.equal(false);
                expect(value.value).to.equal("2");
                expect(dom.window.document.querySelectorAll("[name=modifierValue]")).to.have.length(1);
                expect(grid.children[2].querySelector<HTMLElement>("[data-attribute]")!.dataset.attribute).to.equal(
                    "item"
                );
            } finally {
                dom.window.close();
            }
        });

        it(`searches feature choices and updates ${path} with keyboard selection without rendering again`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: `${path} feature="Kritisch" +2`,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            const render = sandbox.stub(helper, "render").resolves(helper);
            try {
                await helper._onRender(context);
                const picker = helper.element.querySelector<HTMLDetailsElement>('[data-attribute-picker="feature"]');
                expect(picker).not.to.equal(null);
                const summary = picker!.querySelector<HTMLElement>("summary")!;
                expect(summary.textContent).to.include("Kritisch");
                const search = picker!.querySelector<HTMLInputElement>('input[type="search"]')!;
                const visible = () =>
                    [...picker!.querySelectorAll<HTMLElement>("[data-picker-value]")].filter(
                        (option) => !option.hidden
                    );
                const searchFor = (query: string) => {
                    search.value = query;
                    search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                };
                picker!.open = true;
                searchFor("kein passendes Merkmal");
                expect(visible()).to.be.empty;
                expect(picker!.querySelector<HTMLElement>(".modifier-picker-empty")!.hidden).to.equal(false);
                searchFor("sChArF");
                expect(visible().map((option) => option.dataset.pickerValue)).to.deep.equal(["Scharf"]);
                expect(picker!.querySelector<HTMLElement>(".modifier-picker-empty")!.hidden).to.equal(true);
                expect(picker!.querySelector(".modifier-picker-list")!.contains(visible()[0])).to.equal(true);
                search.focus();
                search.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
                expect(dom.window.document.activeElement).to.equal(visible()[0]);
                visible()[0].dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                expect(picker!.open).to.equal(false);
                expect(dom.window.document.activeElement).to.equal(summary);
                expect(summary.textContent).to.include("Scharf");
                expect(helper.element.querySelector<HTMLInputElement>("[data-attribute=feature]")!.value).to.equal(
                    "Scharf"
                );
                expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(
                    `${path} feature="Scharf" +2`
                );
                expect(search.value).to.equal("");
                expect(visible().length).to.be.greaterThan(20);
                expect(render.called).to.equal(false);
                const restored = new ModifierHelper({
                    definitions,
                    initial: helper.element.querySelector<HTMLOutputElement>("output")!.value,
                    validate: () => [],
                    apply: () => true,
                });
                expect(
                    (await restored._prepareContext({})).fields.find((field) => field.key === "feature")!.value
                ).to.equal("Scharf");
            } finally {
                dom.window.close();
            }
        });
    }

    it("keeps a restored extension feature searchable without replacing its value", async () => {
        const initial = 'item.mergeFeature feature="Fremdmerkmal" +2';
        const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        try {
            await helper._onRender(context);
            const picker = helper.element.querySelector<HTMLDetailsElement>('[data-attribute-picker="feature"]')!;
            expect(picker.querySelector("summary")!.textContent).to.include("Fremdmerkmal");
            const search = picker.querySelector<HTMLInputElement>('input[type="search"]')!;
            search.value = "fremd";
            search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            const visible = [...picker.querySelectorAll<HTMLElement>("[data-picker-value]")].filter(
                (option) => !option.hidden
            );
            expect(visible.map((option) => option.dataset.pickerValue)).to.deep.equal(["Fremdmerkmal"]);
            expect(visible[0].getAttribute("aria-selected")).to.equal("true");
            expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(initial);
        } finally {
            dom.window.close();
        }
    });

    it("focuses the visible feature picker for a missing required choice and clears its error after selection", async () => {
        const apply = sinon.spy(() => true);
        const helper = new ModifierHelper({ definitions, initial: "item.addFeature +2", validate: () => [], apply });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        sandbox.stub(foundryApi, "warnUser");
        try {
            await helper._onRender(context);
            await ModifierHelper.DEFAULT_OPTIONS.actions.applyModifier.call(helper);
            const picker = helper.element.querySelector<HTMLDetailsElement>('[data-attribute-picker="feature"]')!;
            const summary = picker.querySelector<HTMLElement>("summary")!;
            expect(apply.called).to.equal(false);
            expect(summary.getAttribute("aria-invalid")).to.equal("true");
            expect(dom.window.document.activeElement).to.equal(summary);
            const error = helper.element.querySelector<HTMLElement>("[data-error-for=feature]")!;
            expect(error.hidden).to.equal(false);
            expect(summary.getAttribute("aria-errormessage")).to.equal(error.id);
            picker.querySelector<HTMLElement>('[data-picker-value="Scharf"]')!.click();
            expect(summary.getAttribute("aria-invalid")).to.equal("false");
            expect(error.hidden).to.equal(true);
            expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(
                'item.addFeature feature="Scharf" +2'
            );
            picker.querySelector<HTMLElement>('[data-picker-value=""]')!.click();
            expect(summary.getAttribute("aria-invalid")).to.equal("true");
            expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal("");
        } finally {
            dom.window.close();
        }
    });

    for (const [initial, multiple] of [
        ['item.addFeature feature="Scharf" +2', false],
        ['item.mergeFeature feature="Scharf" +2', false],
        ["item.damage +2", true],
    ] as const) {
        it(`does not allow feature rows for ${initial} with multiple=${multiple}`, async () => {
            const helper = new ModifierHelper({
                definitions,
                initial,
                multiple,
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            const render = sandbox.stub(helper, "render").resolves(helper);
            try {
                await helper._onRender(context);
                expect(helper.element.querySelector("[data-action=addFeature]")).to.equal(null);
                await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                expect(render.called).to.equal(false);
                expect((await helper._prepareContext({})).featureRows).to.be.empty;
            } finally {
                dom.window.close();
            }
        });
    }
});
