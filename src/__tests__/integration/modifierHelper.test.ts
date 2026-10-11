import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActiveEffect, withActor } from "./fixtures";
import { passesEventually } from "../util";
import type { SplittermondActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import type SplittermondItem from "module/item/item";
import type SplittermondWeaponItem from "module/item/weapon";
import type SplittermondItemEffectsSheet from "module/item/sheets/item-effects-sheet";
import type { SplittermondActiveEffect } from "module/activeEffect";
import { openModifierHelper } from "module/modifierHelper";
import { ModifierHelper } from "module/modifierHelper/ModifierHelper";
import sinon from "sinon";

function control<T extends HTMLElement>(element: ParentNode, selector: string): T {
    const result = element.querySelector<T>(selector);
    if (!result) throw new Error(`Missing control ${selector}`);
    return result;
}

function helperElement(): HTMLElement {
    return control(document, ".modifier-helper");
}

function change(element: ParentNode, selector: string, value: string) {
    const input = control<HTMLInputElement | HTMLSelectElement>(element, selector);
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function selectModifier(path: string, expectedField: string) {
    const picker = control<HTMLDetailsElement>(helperElement(), ".modifier-picker-main");
    if (!picker.open) control<HTMLElement>(picker, "summary").click();
    const segments = path.split(".");
    const option = [...picker.querySelectorAll<HTMLElement>("[data-modifier-path]")]
        .filter((entry) => path === entry.dataset.modifierPath || path.startsWith(`${entry.dataset.modifierPath}.`))
        .sort((a, b) => b.dataset.modifierPath!.length - a.dataset.modifierPath!.length)[0];
    if (!option) throw new Error(`Missing modifier option ${path}`);
    const depth = option.dataset.modifierPath!.split(".").length;
    const heading = control<HTMLButtonElement>(picker, `[data-category-heading="${option.dataset.category}"]`);
    if (option.hidden) {
        if (heading.hidden)
            control<HTMLButtonElement>(picker, `[data-category-heading="${heading.dataset.categoryParent}"]`).click();
        if (option.hidden) heading.click();
    }
    const previous = control<HTMLElement>(helperElement(), ".modifier-helper-content");
    const changesGroup = option.getAttribute("aria-selected") !== "true";
    option.click();
    if (changesGroup)
        await passesEventually(
            () => {
                if (control(helperElement(), ".modifier-helper-content") === previous)
                    throw new Error("Modifier render is still pending");
            },
            2000,
            50
        );
    for (let index = depth; index < segments.length; index++) {
        const parent = segments.slice(0, index).join(".");
        await selectVariant(parent, segments.slice(0, index + 1).join("."));
    }
    await passesEventually(() => control(helperElement(), expectedField), 2000, 50);
}

async function selectVariant(parent: string, path: string) {
    const selector = `[data-path-parent="${parent}"]`;
    await passesEventually(() => control(helperElement(), selector), 2000, 50);
    const previous = control<HTMLElement>(helperElement(), selector);
    previous.click();
    control<HTMLElement>(previous.closest(".modifier-picker")!, `[data-picker-value="${path}"]`).click();
    await passesEventually(
        () => {
            if (control(helperElement(), selector) === previous) throw new Error("Variant render is still pending");
        },
        2000,
        50
    );
}

async function closeHelper() {
    const helper = document.querySelector(".modifier-helper");
    helper?.querySelector<HTMLButtonElement>("[data-action=cancel]")?.click();
    await passesEventually(
        () => {
            if (document.querySelector(".modifier-helper")) throw new Error("Modifier helper is still open");
        },
        2000,
        50
    );
}

async function draftAction(action: string, index?: number) {
    const previous = control<HTMLElement>(helperElement(), ".modifier-helper-content");
    const entry = index === undefined ? "" : `[data-index="${index}"]`;
    control<HTMLButtonElement>(previous, `[data-action="${action}"]${entry}`).click();
    await passesEventually(
        () => {
            if (control(helperElement(), ".modifier-helper-content") === previous)
                throw new Error("Draft render is still pending");
        },
        2000,
        50
    );
}

export function modifierHelperTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;
    describe("Modifier helper integration", function () {
        // These tests include persisted document updates, multiple sheet renders and fixture cleanup.
        this.timeout(10000);
        it(
            "starts blank with collapsed categories and guides a new check modifier through optional fields",
            withActiveEffect(
                { name: "Helper empty start", type: "modifier", system: { modifiers: [], costModifiers: [] } },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        const picker = control<HTMLDetailsElement>(helperElement(), ".modifier-picker-main");
                        expect(picker.open).to.equal(true);
                        await passesEventually(
                            () =>
                                expect(
                                    control<HTMLElement>(picker, ".modifier-picker-popup").clientHeight
                                ).to.be.greaterThan(100),
                            2000,
                            50
                        );
                        expect(helperElement().querySelector("[data-action=addModifier]")).to.equal(null);
                        expect(
                            control<HTMLElement>(helperElement(), ".modifier-picker-main summary span").textContent
                        ).to.equal("Bitte auswählen");
                        expect(
                            control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").disabled
                        ).to.equal(true);
                        expect(
                            helperElement().querySelector("[data-attribute], [name=modifierValue], output")
                        ).to.equal(null);
                        const headings = [
                            ...helperElement().querySelectorAll<HTMLButtonElement>("[data-category-heading]"),
                        ];
                        expect(headings).to.have.length(5);
                        expect(
                            headings
                                .filter((heading) => !heading.hidden)
                                .map((heading) => heading.dataset.categoryHeading)
                        ).to.deep.equal(["skills", "other"]);
                        expect(headings.every((heading) => heading.getAttribute("aria-expanded") === "false")).to.equal(
                            true
                        );
                        await selectModifier("actor.woundmalus", '[data-path-parent="actor.woundmalus"]');
                        expect(
                            control<HTMLElement>(helperElement(), '[data-path-parent="actor.woundmalus"] span')
                                .textContent
                        ).to.equal("Bitte auswählen");
                        expect(
                            [
                                ...helperElement().querySelectorAll<HTMLElement>(
                                    ".modifier-variant-picker [data-picker-value]"
                                ),
                            ].map((option) => option.dataset.pickerValue)
                        ).to.deep.equal([
                            "actor.woundmalus.levelmod",
                            "actor.woundmalus.mod",
                            "actor.woundmalus.nbrLevels",
                        ]);
                        expect(helperElement().querySelector("[name=modifierValue]")).to.equal(null);
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        expect(
                            control(helperElement(), '[data-path-parent="actor.woundmalus"]').getAttribute(
                                "aria-invalid"
                            )
                        ).to.equal("true");
                        expect(effect.system.modifiers).to.have.length(0);
                        await selectModifier("check.require", "[data-attribute=rollType]");
                        expect(helperElement().querySelector("[name=modifierValue]")).to.equal(null);
                        expect(helperElement().querySelector(".modifier-variant-picker")).to.equal(null);
                        expect(
                            control<HTMLElement>(helperElement(), ".modifier-picker-main summary").dataset.pathValue
                        ).to.equal("check.require");
                        const type = control<HTMLSelectElement>(helperElement(), "[data-attribute=type]");
                        const label = type.closest(".modifier-helper-control")!;
                        expect(control<HTMLElement>(label, ".modifier-helper-label").textContent).to.include(
                            "Probenart (Optional)"
                        );
                        const hint = control<HTMLElement>(label, ".modifier-helper-hint");
                        expect(hint.textContent).to.include("Probenart");
                        expect(hint.getBoundingClientRect().top).to.be.at.least(type.getBoundingClientRect().bottom);
                        expect(hint.getBoundingClientRect().height).to.be.greaterThan(0);
                        change(helperElement(), "[data-attribute=rollType]", "standard");
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                            'check.require rollType="standard"'
                        );
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal(
                                    'check.require rollType="standard"'
                                );
                                expect(effect.system.modifiers[0].path).to.equal("check.require");
                                expect(effect.system.modifiers[0].attributes.rollType).to.equal("standard");
                            },
                            2500,
                            50
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );
        it(
            "searches a feature in the styled picker and persists its choice across reopening",
            withActiveEffect(
                {
                    name: "Helper feature search",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                    flags: { splittermond: { rawInput: 'item.addFeature feature="Kritisch" +2' } },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        const picker = control<HTMLDetailsElement>(
                            helperElement(),
                            '[data-attribute-picker="feature"]'
                        );
                        expect(helperElement().querySelector("[data-action=addFeature]")).to.equal(null);
                        const featureBounds = control<HTMLElement>(picker, "summary").getBoundingClientRect();
                        const valueBounds = control<HTMLInputElement>(
                            helperElement(),
                            "[name=modifierValue]"
                        ).getBoundingClientRect();
                        expect(valueBounds.top).to.be.closeTo(featureBounds.top, 1);
                        expect(valueBounds.left).to.be.greaterThan(featureBounds.right);
                        expect(control<HTMLElement>(picker, "summary span").textContent).to.equal("Kritisch [Stufe]");
                        control<HTMLElement>(picker, "summary").click();
                        const list = control<HTMLElement>(picker, ".modifier-picker-list");
                        await passesEventually(() => expect(list.clientHeight).to.be.greaterThan(0), 2000, 50);
                        expect(list.scrollHeight).to.be.greaterThan(list.clientHeight);
                        expect(getComputedStyle(list).overflowY).to.equal("auto");
                        const mainList = control<HTMLElement>(
                            helperElement(),
                            ".modifier-picker-main .modifier-picker-list"
                        );
                        expect(getComputedStyle(list, "::-webkit-scrollbar").width).to.equal(
                            getComputedStyle(mainList, "::-webkit-scrollbar").width
                        );
                        expect(getComputedStyle(list, "::-webkit-scrollbar-thumb").background).to.equal(
                            getComputedStyle(mainList, "::-webkit-scrollbar-thumb").background
                        );
                        change(picker, 'input[type="search"]', "scharf");
                        const visible = [...picker.querySelectorAll<HTMLElement>("[data-picker-value]")].filter(
                            (option) => !option.hidden
                        );
                        expect(visible.map((option) => option.dataset.pickerValue)).to.deep.equal(["Scharf"]);
                        visible[0].click();
                        expect(control<HTMLInputElement>(helperElement(), "[data-attribute=feature]").value).to.equal(
                            "Scharf"
                        );
                        expect(picker.open).to.equal(false);
                        expect(control<HTMLElement>(picker, "summary span").textContent).to.equal("Scharf [Stufe]");
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                            'item.addFeature feature="Scharf" +2'
                        );
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal(
                                    'item.addFeature feature="Scharf" +2'
                                );
                                expect(effect.system.modifiers[0].attributes.feature).to.equal("Scharf");
                                expect(document.querySelector(".modifier-helper")).to.equal(null);
                            },
                            2500,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(
                            control<HTMLElement>(helperElement(), '[data-attribute-picker="feature"] summary span')
                                .textContent
                        ).to.equal("Scharf [Stufe]");
                        expect(control<HTMLInputElement>(helperElement(), "[data-attribute=feature]").value).to.equal(
                            "Scharf"
                        );
                        await selectModifier("check.result", "[data-attribute=category]");
                        expect(helperElement().querySelector(".modifier-variant-picker")).to.equal(null);
                        expect(helperElement().querySelector('[data-attribute-picker="feature"]')).to.equal(null);
                        expect(
                            control<HTMLElement>(helperElement(), ".modifier-picker-main summary").dataset.pathValue
                        ).to.equal("check.result");
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "restores a direct skill-group choice and persists ordered attribute filters after switching to actor.skills",
            withActiveEffect(
                {
                    name: "Helper skill filters",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                    flags: { splittermond: { rawInput: "skills.magic +2" } },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    const raw = 'actor.skills attribute1="agility" attribute2="strength" skill="acrobatics" +2';
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(
                            control<HTMLElement>(helperElement(), ".modifier-picker-main summary").dataset.pathValue
                        ).to.equal("actor.skills.magic");
                        expect(helperElement().querySelector(".modifier-variant-picker")).to.equal(null);
                        await selectModifier("actor.skills", "[data-attribute=attribute1]");
                        expect(
                            [...helperElement().querySelectorAll<HTMLElement>("[data-attribute]")].map(
                                (field) => field.dataset.attribute
                            )
                        ).to.deep.equal(["attribute1", "attribute2", "skill", "emphasis"]);
                        change(helperElement(), "[data-attribute=attribute1]", "agility");
                        change(helperElement(), "[data-attribute=attribute2]", "strength");
                        const skills = control<HTMLDetailsElement>(helperElement(), '[data-attribute-picker="skill"]');
                        control<HTMLElement>(skills, "summary").click();
                        expect(
                            [...skills.querySelectorAll<HTMLElement>("[data-choice-category]")].map((group) =>
                                group.getAttribute("aria-label")
                            )
                        ).to.deep.equal(["Allgemeine Fertigkeiten", "Kampffertigkeiten", "Magieschulen"]);
                        const skillList = control<HTMLElement>(skills, ".modifier-picker-list");
                        await passesEventually(() => expect(skillList.clientHeight).to.be.greaterThan(0), 2000, 50);
                        expect(getComputedStyle(skillList).overflowY).to.equal("auto");
                        for (const heading of skills.querySelectorAll("[data-category-heading]"))
                            expect(heading.getAttribute("aria-expanded")).to.equal("false");
                        expect(
                            skills.querySelector("[data-choice-category] [data-picker-value]:not([hidden])")
                        ).to.equal(null);
                        const magicHeading = control<HTMLButtonElement>(skills, '[data-category-heading="magic"]');
                        magicHeading.click();
                        expect(skills.open).to.equal(true);
                        expect(magicHeading.getAttribute("aria-expanded")).to.equal("true");
                        const firstMagic = control<HTMLElement>(
                            skills,
                            '[data-choice-category="magic"] [data-picker-value]'
                        );
                        expect(firstMagic.hidden).to.equal(false);
                        expect(firstMagic.getBoundingClientRect().top).to.be.closeTo(
                            magicHeading.getBoundingClientRect().bottom,
                            2
                        );
                        change(skills, 'input[type="search"]', "aKrOb");
                        expect(
                            [...skills.querySelectorAll<HTMLElement>("[data-choice-category]")]
                                .filter((group) => !group.hidden)
                                .map((group) => group.dataset.choiceCategory)
                        ).to.deep.equal(["general"]);
                        expect(
                            control(skills, '[data-category-heading="general"]').getAttribute("aria-expanded")
                        ).to.equal("true");
                        const search = control<HTMLInputElement>(skills, 'input[type="search"]');
                        search.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
                        expect(document.activeElement).to.equal(control(skills, '[data-picker-value="acrobatics"]'));
                        document.activeElement!.dispatchEvent(
                            new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
                        );
                        expect(skills.open).to.equal(false);
                        expect(
                            control(skills, '[data-category-heading="general"]').getAttribute("aria-expanded")
                        ).to.equal("false");
                        expect(magicHeading.getAttribute("aria-expanded")).to.equal("true");
                        expect(control<HTMLElement>(skills, "summary").textContent).to.include("Akrobatik");
                        change(helperElement(), "[name=modifierValue]", "2");
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                        expect(
                            control<HTMLElement>(helperElement(), '[data-attribute-picker="skill"] summary').textContent
                        ).to.include("Akrobatik");
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal(raw);
                                expect(effect.system.modifiers).to.have.length(1);
                                expect(effect.system.modifiers[0].path).to.equal("actor.skills");
                                expect(effect.system.modifiers[0].attributes).to.include({
                                    attribute1: "agility",
                                    attribute2: "strength",
                                    skill: "acrobatics",
                                });
                                expect(document.querySelector(".modifier-helper")).to.equal(null);
                            },
                            2500,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(helperElement().querySelector(".modifier-variant-picker")).to.equal(null);
                        expect(
                            control<HTMLSelectElement>(helperElement(), "[data-attribute=attribute1]").value
                        ).to.equal("agility");
                        expect(
                            control<HTMLSelectElement>(helperElement(), "[data-attribute=attribute2]").value
                        ).to.equal("strength");
                        expect(control<HTMLSelectElement>(helperElement(), "[data-attribute=skill]").value).to.equal(
                            "acrobatics"
                        );
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "omits the ineffective splinterpoint base filter but persists the bonus skill choice across reopening",
            withActiveEffect(
                {
                    name: "Helper splinterpoint filter",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                    flags: { splittermond: { rawInput: 'splinterpoints skill="acrobatics" +2' } },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    const raw = 'actor.splinterpoints.bonus skill="acrobatics" +5';
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(helperElement().querySelector("[data-attribute=skill]")).to.equal(null);
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                            "actor.splinterpoints +2"
                        );
                        await selectVariant("actor.splinterpoints", "actor.splinterpoints.bonus");
                        expect(control<HTMLSelectElement>(helperElement(), "[data-attribute=skill]").value).to.equal(
                            "acrobatics"
                        );
                        change(helperElement(), "[data-attribute=skill]", "acrobatics");
                        change(helperElement(), "[name=modifierValue]", "5");
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal(raw);
                                expect(effect.system.modifiers).to.have.length(1);
                                expect(effect.system.modifiers[0].path).to.equal("actor.splinterpoints.bonus");
                                expect(effect.system.modifiers[0].attributes.skill).to.equal("acrobatics");
                                expect(document.querySelector(".modifier-helper")).to.equal(null);
                            },
                            2500,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(control<HTMLSelectElement>(helperElement(), "[data-attribute=skill]").value).to.equal(
                            "acrobatics"
                        );
                        await selectVariant("actor.splinterpoints", "actor.splinterpoints");
                        expect(helperElement().querySelector("[data-attribute=skill]")).to.equal(null);
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                            "actor.splinterpoints +5"
                        );
                        await closeHelper();
                        expect(effect.getFlag("splittermond", "rawInput")).to.equal(raw);
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        for (const [initial, group, variant, canonical] of [
            ["woundmalus.mod +3", "actor.woundmalus", "actor.woundmalus.nbrLevels", "actor.woundmalus.nbrLevels"],
            ["handicap.mod +3", "handicap", "handicap.armor", "handicap.armor"],
            ["focuspoints +3", "focuspoints", "focuspoints.bonus", "actor.focuspoints.bonus"],
        ]) {
            it(
                `restores ${initial} without duplicate aliases and persists a different variant`,
                withActiveEffect(
                    {
                        name: "Helper progressive selection",
                        type: "modifier",
                        system: { modifiers: [], costModifiers: [] },
                        flags: { splittermond: { rawInput: initial } },
                    },
                    async (effect) => {
                        const sheet = effect.sheet as SplittermondActiveEffectConfig;
                        try {
                            await sheet.render(true);
                            control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                            await passesEventually(helperElement, 2000, 50);
                            expect(
                                control<HTMLElement>(helperElement(), ".modifier-picker summary span").textContent
                            ).to.equal(group);
                            await selectVariant(group, variant);
                            await passesEventually(
                                () =>
                                    expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                                        `${canonical} +3`
                                    ),
                                2000,
                                50
                            );
                            control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                            await passesEventually(
                                () => {
                                    expect(effect.getFlag("splittermond", "rawInput")).to.equal(`${canonical} +3`);
                                    expect(effect.system.modifiers[0].path.toLowerCase()).to.equal(
                                        canonical.toLowerCase()
                                    );
                                },
                                2500,
                                50
                            );
                            await passesEventually(
                                () => expect(document.querySelector(".modifier-helper")).to.equal(null),
                                2000,
                                50
                            );
                            control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                            await passesEventually(helperElement, 2000, 50);
                            expect(
                                control<HTMLElement>(helperElement(), `[data-path-parent="${group}"]`).dataset.pathValue
                            ).to.equal(variant);
                        } finally {
                            await closeHelper();
                            await sheet.close();
                        }
                    }
                )
            );
        }

        it(
            "requires a supported wound level count after switching variants and restores the persisted selection",
            withActiveEffect(
                {
                    name: "Helper wound level choices",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                    flags: { splittermond: { rawInput: "woundmalus.mod +2" } },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        await selectVariant("actor.woundmalus", "actor.woundmalus.nbrLevels");
                        const select = control<HTMLSelectElement>(helperElement(), "select[name=modifierValue]");
                        expect(
                            [...select.options]
                                .filter((option) => !option.disabled && option.value)
                                .map((option) => option.value)
                        ).to.deep.equal(["1", "3", "5"]);
                        expect(select.value).to.equal("2");
                        expect(select.selectedOptions[0].disabled).to.equal(true);
                        expect(select.getAttribute("aria-invalid")).to.equal("true");
                        expect(helperElement().querySelector("input[name=modifierValue]")).to.equal(null);
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal("");
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        expect(effect.getFlag("splittermond", "rawInput")).to.equal("woundmalus.mod +2");
                        change(helperElement(), "[name=modifierValue]", "3");
                        expect(control(helperElement(), "[name=modifierValue]")).to.equal(select);
                        expect(select.getAttribute("aria-invalid")).to.equal("false");
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                            "actor.woundmalus.nbrLevels +3"
                        );
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal(
                                    "actor.woundmalus.nbrLevels +3"
                                );
                                expect(effect.system.modifiers[0].path.toLowerCase()).to.equal(
                                    "actor.woundmalus.nbrlevels"
                                );
                                expect(document.querySelector(".modifier-helper")).to.equal(null);
                            },
                            2500,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(
                            control<HTMLSelectElement>(helperElement(), "select[name=modifierValue]").value
                        ).to.equal("3");
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "defaults a new cast duration to ticks and persists its spell skill filter across reopening",
            withActiveEffect(
                {
                    name: "Helper default duration unit",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        await selectModifier("item.castDuration", "[data-attribute=unit]");
                        expect(control<HTMLSelectElement>(helperElement(), "[data-attribute=unit]").value).to.equal(
                            "T"
                        );
                        const skills = control<HTMLDetailsElement>(helperElement(), '[data-attribute-picker="skill"]');
                        control<HTMLElement>(skills, "summary").click();
                        expect(skills.querySelector('[data-picker-value="acrobatics"]')).to.equal(null);
                        expect(skills.querySelector("[data-category-heading]")).to.equal(null);
                        control<HTMLElement>(skills, '[data-picker-value="arcanelore"]').click();
                        change(helperElement(), "[name=modifierValue]", "2");
                        await selectVariant("item.castDuration", "item.castDuration.multiplier");
                        expect(helperElement().querySelector("[data-attribute=unit]")).to.equal(null);
                        await selectVariant("item.castDuration", "item.castDuration");
                        expect(control<HTMLSelectElement>(helperElement(), "[data-attribute=unit]").value).to.equal(
                            "T"
                        );
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.system.modifiers[0].attributes.unit).to.equal("T");
                                expect(effect.system.modifiers[0].attributes.skill).to.equal("arcanelore");
                                expect(document.querySelector(".modifier-helper")).to.equal(null);
                            },
                            2500,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(control<HTMLSelectElement>(helperElement(), "[data-attribute=unit]").value).to.equal(
                            "T"
                        );
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                            'item.castDuration unit="T" skill="arcanelore" +2'
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "keeps sorting and drafts across nested variant renders and discards unsupported attributes",
            withActiveEffect(
                {
                    name: "Helper nested variants",
                    type: "modifier",
                    system: { modifiers: [], costModifiers: [] },
                    flags: { splittermond: { rawInput: 'item.castDuration unit="T" +2' } },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        const unit = control<HTMLElement>(
                            helperElement(),
                            "[data-attribute=unit]"
                        ).getBoundingClientRect();
                        const value = control<HTMLElement>(
                            helperElement(),
                            "[name=modifierValue]"
                        ).getBoundingClientRect();
                        const skill = control<HTMLElement>(
                            helperElement(),
                            '[data-attribute-picker="skill"] summary'
                        ).getBoundingClientRect();
                        const item = control<HTMLElement>(
                            helperElement(),
                            "[data-attribute=item]"
                        ).getBoundingClientRect();
                        expect(unit.top).to.be.closeTo(value.top, 1);
                        expect(unit.right).to.be.lessThan(value.left);
                        expect(skill.top).to.be.greaterThan(value.bottom);
                        expect(item.top).to.be.greaterThan(skill.bottom);
                        change(helperElement(), "[data-attribute=unit]", "min");
                        change(helperElement(), "[name=modifierValue]", "3");
                        control<HTMLElement>(helperElement(), ".modifier-picker summary").click();
                        change(helperElement(), "[name=modifierSearch]", "item");
                        control<HTMLInputElement>(helperElement(), "[name=modifierSort][value=alphabetical]").click();
                        control<HTMLElement>(helperElement(), ".modifier-picker summary").click();
                        await selectVariant("item.castDuration", "item.castDuration.multiplier");
                        await passesEventually(
                            () =>
                                expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                                    "item.castDuration.multiplier 3"
                                ),
                            2000,
                            50
                        );
                        expect(helperElement().querySelector("[data-attribute=unit]")).to.equal(null);
                        expect(helperElement().querySelector("[data-attribute=itemType]")).to.equal(null);
                        expect(
                            control<HTMLInputElement>(helperElement(), "[name=modifierSort][value=alphabetical]")
                                .checked
                        ).to.equal(true);
                        expect(control<HTMLInputElement>(helperElement(), "[name=modifierSearch]").value).to.equal(
                            "item"
                        );
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.system.modifiers[0].path).to.equal("item.castDuration.multiplier");
                                expect(effect.system.modifiers[0].attributes).not.to.have.property("unit");
                            },
                            2500,
                            50
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        for (const family of ["resistance", "weakness"]) {
            it(
                `edits and restores the damage type of a grouped ${family} modifier`,
                withActiveEffect(
                    {
                        name: "Helper damage type",
                        type: "modifier",
                        system: { modifiers: [], costModifiers: [] },
                        flags: { splittermond: { rawInput: `${family}.cold +2` } },
                    },
                    async (effect) => {
                        const sheet = effect.sheet as SplittermondActiveEffectConfig;
                        try {
                            await sheet.render(true);
                            control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                            await passesEventually(helperElement, 2000, 50);
                            expect(
                                control<HTMLElement>(helperElement(), ".modifier-picker summary span").textContent
                            ).to.equal(family);
                            expect(
                                control<HTMLSelectElement>(helperElement(), "[data-attribute=damageType]").value
                            ).to.equal("cold");
                            change(helperElement(), "[data-attribute=damageType]", "electric");
                            control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                            await passesEventually(
                                () => {
                                    expect(effect.getFlag("splittermond", "rawInput")).to.equal(
                                        `${family}.electric +2`
                                    );
                                    expect(effect.system.modifiers[0].path).to.equal(`${family}.electric`);
                                },
                                2500,
                                50
                            );
                            await passesEventually(
                                () => expect(document.querySelector(".modifier-helper")).to.equal(null),
                                2000,
                                50
                            );
                            control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                            await passesEventually(helperElement, 2000, 50);
                            expect(
                                control<HTMLSelectElement>(helperElement(), "[data-attribute=damageType]").value
                            ).to.equal("electric");
                        } finally {
                            await closeHelper();
                            await sheet.close();
                        }
                    }
                )
            );
        }

        it(
            "replaces an existing effect with a focus modifier and survives reopening",
            withActiveEffect(
                {
                    name: "Helper costs",
                    type: "spellEffect",
                    system: { modifiers: [], costModifiers: [] },
                    flags: { splittermond: { rawInput: "defense +2" } },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(
                            control<HTMLElement>(helperElement(), ".modifier-picker summary span").textContent
                        ).to.equal("defense");
                        await selectModifier("focus.reduction", "[data-attribute=type]");
                        change(helperElement(), "[name=modifierValue]", "K1V1");
                        const skills = control<HTMLDetailsElement>(helperElement(), '[data-attribute-picker="skill"]');
                        control<HTMLElement>(skills, "summary").click();
                        expect(skills.querySelector("[data-category-heading]")).to.equal(null);
                        expect(skills.querySelector('[data-picker-value="arcanelore"]')).to.equal(null);
                        change(skills, 'input[type="search"]', "feuer");
                        control<HTMLElement>(skills, '[data-picker-value="firemagic"]').click();
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.system.costModifiers).to.have.length(1);
                                expect(effect.system.modifiers).to.have.length(0);
                                expect(effect.system.costModifiers[0].attributes.skill).to.equal("firemagic");
                            },
                            2500,
                            50
                        );
                        await sheet.close();
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(control<HTMLInputElement>(helperElement(), "[name=modifierValue]").value).to.equal(
                            "K1V1"
                        );
                        expect(control<HTMLSelectElement>(helperElement(), "[data-attribute=skill]").value).to.equal(
                            "firemagic"
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "appends to an item input and creates both effects through the existing add action",
            withActor(async (actor) => {
                const [item] = (await actor.createEmbeddedDocuments("Item", [
                    { name: "Helper weapon", type: "weapon" },
                ])) as SplittermondItem[];
                const sheet = item.sheet as SplittermondItemEffectsSheet;
                try {
                    await sheet.render(true);
                    control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value = "defense +1";
                    control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                    await passesEventually(helperElement, 2000, 50);
                    await selectModifier("item.damage", "[data-attribute=damageType]");
                    change(helperElement(), "[name=modifierValue]", "2");
                    change(helperElement(), "[data-attribute=itemType]", "weapon");
                    control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                    await passesEventually(
                        () => {
                            expect(control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value).to.equal(
                                'defense +1, item.damage itemType="weapon" +2'
                            );
                        },
                        2000,
                        50
                    );
                    expect(item.effects.size).to.equal(0);
                    control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                    await passesEventually(() => expect(item.effects.size).to.equal(2), 2500, 50);
                    const effects = item.effects.contents as SplittermondActiveEffect[];
                    expect(
                        effects.some(
                            (effect) =>
                                "modifiers" in effect.system &&
                                effect.system.modifiers.some((modifier) => modifier.path === "item.damage")
                        )
                    ).to.equal(true);
                } finally {
                    await closeHelper();
                    await sheet.close();
                }
            })
        );

        it(
            "uses the armor source for feature choices and persists the selected cold-protection level without damage resistance",
            withActor(async (actor) => {
                const [armor] = (await actor.createEmbeddedDocuments("Item", [
                    { name: "Helper cold armor", type: "armor", system: { equipped: true } },
                ])) as SplittermondItem[];
                const sheet = armor.sheet as SplittermondItemEffectsSheet;
                try {
                    await sheet.render(true);
                    control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                    await passesEventually(helperElement, 2000, 50);
                    await selectModifier("item.addFeature", "[data-attribute=feature]");
                    expect(control<HTMLInputElement>(helperElement(), "[data-attribute=item]").value).to.equal(
                        armor.name
                    );
                    const picker = control<HTMLElement>(helperElement(), '[data-attribute-picker="feature"]');
                    expect(picker.querySelector('[data-picker-value="Stabil"]')).not.to.equal(null);
                    expect(picker.querySelector('[data-picker-value="Dornen"]')).to.equal(null);
                    expect(picker.querySelector('[data-picker-value="Behinderung"]')).to.equal(null);
                    control<HTMLElement>(picker, "summary").click();
                    control<HTMLElement>(picker, '[data-picker-value="Kälteschutz"]').click();
                    await passesEventually(() => control(helperElement(), "select[name=modifierValue]"), 2000, 50);
                    const value = control<HTMLSelectElement>(helperElement(), "select[name=modifierValue]");
                    expect(value.value).to.equal("1");
                    expect([...value.options].map((option) => option.value)).to.deep.equal(["", "1", "2"]);
                    const checkbox = control<HTMLInputElement>(helperElement(), "[data-adjustment-enabled]");
                    expect(checkbox.getBoundingClientRect().width).to.equal(20);
                    expect(checkbox.getBoundingClientRect().height).to.equal(20);
                    change(helperElement(), "[name=modifierValue]", "2");
                    const feature = 'item.addFeature feature="Kälteschutz" item="Helper cold armor" +2';
                    expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                        `${feature}, handicap +2`
                    );
                    checkbox.click();
                    expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(feature);
                    checkbox.click();
                    control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                    await passesEventually(
                        () =>
                            expect(control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value).to.equal(
                                `${feature}, handicap +2`
                            ),
                        2000,
                        50
                    );
                    control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                    await passesEventually(
                        () => {
                            const effects = armor.effects.contents as SplittermondActiveEffect[];
                            expect(effects).to.have.length(2);
                            expect(effects.map((effect) => effect.getFlag("splittermond", "rawInput"))).to.have.members(
                                [feature, "handicap +2"]
                            );
                        },
                        2500,
                        50
                    );
                } finally {
                    await closeHelper();
                    await sheet.close();
                }
            })
        );

        it(
            "gets shield context from an existing effect without narrowing its stored filter and defaults new feature drafts to the shield name",
            withActor(async (actor) => {
                const [shield] = (await actor.createEmbeddedDocuments("Item", [
                    { name: "Helper shield context", type: "shield" },
                ])) as SplittermondItem[];
                const [effect] = (await shield.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Helper shield effect",
                        type: "modifier",
                        flags: { splittermond: { rawInput: 'item.mergeFeature feature="Verbesserte Defensive" +1' } },
                        system: { modifiers: [], costModifiers: [] },
                    },
                ])) as SplittermondActiveEffect[];
                const sheet = effect.sheet as SplittermondActiveEffectConfig;
                try {
                    await sheet.render(true);
                    control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                    await passesEventually(helperElement, 2000, 50);
                    expect(control<HTMLInputElement>(helperElement(), "[data-attribute=item]").value).to.equal("");
                    expect(control<HTMLElement>(helperElement(), "[data-feature-adjustment] p").textContent).to.equal(
                        "Höchstens einmal."
                    );
                    const picker = control<HTMLElement>(helperElement(), '[data-attribute-picker="feature"]');
                    expect(picker.querySelector('[data-picker-value="Gehärtet"]')).not.to.equal(null);
                    expect(picker.querySelector('[data-picker-value="Deckung"]')).not.to.equal(null);
                    expect(picker.querySelector('[data-picker-value="Stabil"]')).to.equal(null);
                    expect(picker.querySelector('[data-picker-value="Verbesserte Exaktheit"]')).to.equal(null);
                    expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                        'item.mergeFeature feature="Verbesserte Defensive" +1'
                    );
                    await selectModifier("item.addFeature", "[data-attribute=feature]");
                    expect(control<HTMLInputElement>(helperElement(), "[data-attribute=item]").value).to.equal(
                        shield.name
                    );
                } finally {
                    await closeHelper();
                    await sheet.close();
                }
            })
        );

        for (const path of ["item.addFeature", "item.mergeFeature"]) {
            it(
                `${path}: persists an improvement and its mechanical companion, edits them together, and respects single-effect reopening`,
                withActor(async (actor) => {
                    const [weapon] = (await actor.createEmbeddedDocuments("Item", [
                        {
                            name: "Helper improved critical",
                            type: "weapon",
                            system: {
                                equipped: true,
                                features: { internalFeatureList: [{ name: "Kritisch", value: 1 }] },
                            },
                        },
                    ])) as SplittermondWeaponItem[];
                    const sheet = weapon.sheet as SplittermondItemEffectsSheet;
                    let effectSheet: SplittermondActiveEffectConfig | undefined;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        await selectModifier(path, "[data-attribute=feature]");
                        const picker = control<HTMLElement>(helperElement(), '[data-attribute-picker="feature"]');
                        control<HTMLElement>(picker, "summary").click();
                        change(picker, 'input[type="search"]', "Verbesserter Kritischer Schaden");
                        control<HTMLElement>(picker, '[data-picker-value="Verbesserter Kritischer Schaden"]').click();
                        await passesEventually(() => control(helperElement(), "[data-adjustment-enabled]"), 2000, 50);
                        expect(
                            control<HTMLInputElement>(helperElement(), "[data-adjustment-enabled]").checked
                        ).to.equal(true);
                        expect(control<HTMLInputElement>(helperElement(), "[data-attribute=item]").value).to.equal(
                            weapon.name
                        );
                        const raw = `${path} feature="Verbesserter Kritischer Schaden" item="Helper improved critical" +1, item.addFeature feature="Kritisch" item="Helper improved critical" +2`;
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                        await draftAction("addModifier");
                        await draftAction("editModifier", 0);
                        expect(helperElement().querySelector("[data-feature-row]")).to.equal(null);
                        expect(
                            control<HTMLInputElement>(helperElement(), "[data-adjustment-enabled]").checked
                        ).to.equal(true);
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () =>
                                expect(
                                    control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value
                                ).to.equal(raw),
                            2000,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                        await passesEventually(
                            () => {
                                expect(weapon.effects.size).to.equal(2);
                                expect(weapon.system.features.featureValue("Kritisch")).to.equal(3);
                            },
                            3000,
                            50
                        );
                        await passesEventually(
                            () => expect(document.querySelector(".modifier-helper")).to.equal(null),
                            2000,
                            50
                        );
                        const effect = (weapon.effects.contents as SplittermondActiveEffect[]).find(
                            (entry) => entry.getFlag("splittermond", "rawInput") === raw.split(", ")[0]
                        )!;
                        effectSheet = effect.sheet as SplittermondActiveEffectConfig;
                        await effectSheet.render(true);
                        control<HTMLButtonElement>(effectSheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        const checkbox = control<HTMLInputElement>(helperElement(), "[data-adjustment-enabled]");
                        expect(checkbox.checked).to.equal(false);
                        expect(checkbox.disabled).to.equal(true);
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                            raw.split(", ")[0]
                        );
                    } finally {
                        await closeHelper();
                        await effectSheet?.close();
                        await sheet.close();
                    }
                })
            );
        }

        it(
            "selects a skill and emphasis for a repeatable improvement without copying its item filters to the actor modifier",
            withActor(async (actor) => {
                const [item] = (await actor.createEmbeddedDocuments("Item", [
                    { name: "Helper skill improvement", type: "equipment" },
                ])) as SplittermondItem[];
                const sheet = item.sheet as SplittermondItemEffectsSheet;
                try {
                    await sheet.render(true);
                    control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                    await passesEventually(helperElement, 2000, 50);
                    await selectModifier("item.addFeature", "[data-attribute=feature]");
                    change(helperElement(), "[data-attribute=feature]", "Fertigkeitsbonus");
                    await passesEventually(
                        () => control(helperElement(), "[data-feature-adjustment] [data-attribute=skill]"),
                        2000,
                        50
                    );
                    const value = control<HTMLSelectElement>(helperElement(), "[name=modifierValue]");
                    expect(value.tagName).to.equal("SELECT");
                    expect(value.value).to.equal("1");
                    expect([...value.options].map((option) => option.value)).to.deep.equal(["", "1", "2", "3"]);
                    const adjustment = control<HTMLElement>(helperElement(), "[data-feature-adjustment]");
                    const picker = control<HTMLElement>(adjustment, '[data-attribute-picker="skill"]');
                    control<HTMLElement>(picker, "summary").click();
                    change(picker, 'input[type="search"]', "Akrobatik");
                    control<HTMLElement>(picker, '[data-picker-value="acrobatics"]').click();
                    change(adjustment, "[data-attribute=emphasis]", "Balance");
                    change(helperElement(), "[name=modifierValue]", "2");
                    change(helperElement(), "[data-attribute=item]", item.name);
                    const raw =
                        'item.addFeature feature="Fertigkeitsbonus" item="Helper skill improvement" +2, actor.skills skill="acrobatics" emphasis="Balance" +2';
                    expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                    control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                    await passesEventually(
                        () =>
                            expect(control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value).to.equal(
                                raw
                            ),
                        2000,
                        50
                    );
                    await passesEventually(
                        () => expect(document.querySelector(".modifier-helper")).to.equal(null),
                        2000,
                        50
                    );
                    control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                    await passesEventually(
                        () => {
                            expect(item.effects.size).to.equal(2);
                            const effects = item.effects.contents as SplittermondActiveEffect[];
                            const bonus = effects.find(
                                (entry) => entry.getFlag("splittermond", "rawInput") === raw.split(", ")[1]
                            )!;
                            if (!("modifiers" in bonus.system)) throw new Error("Missing modifier data");
                            expect(bonus.system.modifiers[0].attributes).to.deep.equal({
                                name: "Balance",
                                type: "equipment",
                                skill: "acrobatics",
                                emphasis: "Balance",
                            });
                        },
                        3000,
                        50
                    );
                } finally {
                    await closeHelper();
                    await sheet.close();
                }
            })
        );

        it(
            "edits a mixed draft list before appending it and persisting separate item effects",
            withActor(async (actor) => {
                const [item] = (await actor.createEmbeddedDocuments("Item", [
                    { name: "Helper multiple modifiers", type: "weapon" },
                ])) as SplittermondItem[];
                const sheet = item.sheet as SplittermondItemEffectsSheet;
                const input = () => control<HTMLInputElement>(sheet.element, ".effect-modifier-input");
                try {
                    await sheet.render(true);
                    input().value = "defense +1";
                    control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                    await passesEventually(helperElement, 2000, 50);
                    await selectModifier("item.damage", "[name=modifierValue]");
                    change(helperElement(), "[data-attribute=item]", "Sword, Shield");
                    change(helperElement(), "[name=modifierValue]", "2");
                    await draftAction("addModifier");
                    await selectModifier("focus.reduction", "[name=modifierValue]");
                    change(helperElement(), "[name=modifierValue]", "K1V1");
                    change(helperElement(), "[data-attribute=skill]", "firemagic");
                    await draftAction("editModifier", 0);
                    expect(control<HTMLInputElement>(helperElement(), "[data-attribute=item]").value).to.equal(
                        "Sword, Shield"
                    );
                    change(helperElement(), "[name=modifierValue]", "3");
                    await draftAction("editModifier", 1);
                    expect(control<HTMLInputElement>(helperElement(), "[name=modifierValue]").value).to.equal("K1V1");
                    await draftAction("addModifier");
                    await selectModifier("speed", "[name=modifierValue]");
                    await draftAction("removeModifier", 2);
                    expect(input().value).to.equal("defense +1");
                    expect(item.effects.size).to.equal(0);
                    const draft = 'item.damage item="Sword, Shield" +3, focus.reduction skill="firemagic" K1V1';
                    expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(draft);
                    control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                    await passesEventually(() => expect(input().value).to.equal(`defense +1, ${draft}`), 2000, 50);
                    control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                    await passesEventually(
                        () => {
                            const effects = item.effects.contents as SplittermondActiveEffect[];
                            expect(effects).to.have.length(3);
                            const damage = effects.find(
                                (effect) =>
                                    effect.getFlag("splittermond", "rawInput") === 'item.damage item="Sword, Shield" +3'
                            )!;
                            const focus = effects.find(
                                (effect) =>
                                    effect.getFlag("splittermond", "rawInput") ===
                                    'focus.reduction skill="firemagic" K1V1'
                            )!;
                            if (!("modifiers" in damage.system) || !("costModifiers" in focus.system))
                                throw new Error("Missing structured modifier data");
                            expect(damage.system.modifiers[0].serializedValue).to.deep.equal({
                                type: "amount",
                                amount: 3,
                            });
                            expect(damage.system.modifiers[0].attributes.item).to.equal("Sword, Shield");
                            expect(focus.system.costModifiers[0].attributes.skill).to.equal("firemagic");
                        },
                        2500,
                        50
                    );
                } finally {
                    await closeHelper();
                    await sheet.close();
                }
            })
        );

        it(
            "adds multiple features with independent levels through separate helper drafts",
            withActor(async (actor) => {
                const [weapon] = (await actor.createEmbeddedDocuments("Item", [
                    {
                        name: "Helper multiple features",
                        type: "weapon",
                        system: {
                            equipped: true,
                            features: { internalFeatureList: [{ name: "Scharf", value: 1 }] },
                        },
                    },
                ])) as SplittermondWeaponItem[];
                const sheet = weapon.sheet as SplittermondItemEffectsSheet;
                try {
                    await sheet.render(true);
                    control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                    await passesEventually(helperElement, 2000, 50);
                    for (const [feature, value] of [
                        ["Scharf", "2"],
                        ["Kritisch", "3"],
                    ]) {
                        await selectModifier("item.addFeature", "[data-attribute=feature]");
                        const picker = control<HTMLDetailsElement>(
                            helperElement(),
                            '[data-attribute-picker="feature"]'
                        );
                        control<HTMLElement>(picker, "summary").click();
                        control<HTMLElement>(picker, `[data-picker-value="${feature}"]`).click();
                        change(helperElement(), "[name=modifierValue]", value);
                        if (feature === "Scharf") await draftAction("addModifier");
                    }
                    const raw =
                        'item.addFeature feature="Scharf" item="Helper multiple features" +2, item.addFeature feature="Kritisch" item="Helper multiple features" +3';
                    expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                    control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                    await passesEventually(
                        () =>
                            expect(control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value).to.equal(
                                raw
                            ),
                        2000,
                        50
                    );
                    control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                    await passesEventually(
                        () => {
                            expect(weapon.effects.size).to.equal(2);
                            expect(weapon.system.features.featureValue("Scharf")).to.equal(3);
                            expect(weapon.system.features.featureValue("Kritisch")).to.equal(3);
                        },
                        2500,
                        50
                    );
                } finally {
                    await closeHelper();
                    await sheet.close();
                }
            })
        );

        for (const path of ["item.addFeature", "item.mergeFeature"] as const) {
            it(
                `persists ${path} with automatic values for unscaled features and an explicit level in another row`,
                withActor(async (actor) => {
                    const [weapon] = (await actor.createEmbeddedDocuments("Item", [
                        { name: "Helper unscaled features", type: "weapon", system: { equipped: true } },
                    ])) as SplittermondWeaponItem[];
                    const sheet = weapon.sheet as SplittermondItemEffectsSheet;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        await selectModifier(path, "[data-attribute=feature]");
                        change(helperElement(), "[data-attribute=feature]", "Wuchtig");
                        expect(control<HTMLInputElement>(helperElement(), "[name=modifierValue]").required).to.equal(
                            false
                        );
                        expect(
                            control<HTMLElement>(helperElement(), ".modifier-helper-value").getBoundingClientRect()
                                .height
                        ).to.equal(0);
                        expect(
                            control<HTMLElement>(
                                helperElement(),
                                '[data-attribute-picker="feature"]'
                            ).getBoundingClientRect().width
                        ).to.be.closeTo(
                            control<HTMLElement>(helperElement(), ".modifier-helper-field-grid").getBoundingClientRect()
                                .width,
                            1
                        );
                        await draftAction("addFeature");
                        const firstRow = control<HTMLElement>(helperElement(), "[data-feature-row]");
                        change(firstRow, "[data-attribute=feature]", "Freihändig");
                        expect(control<HTMLInputElement>(firstRow, "[name=modifierValue]").value).to.equal("");
                        expect(control<HTMLInputElement>(firstRow, "[name=modifierValue]").required).to.equal(false);
                        expect(
                            control<HTMLElement>(firstRow, ".modifier-helper-value").getBoundingClientRect().height
                        ).to.equal(0);
                        await draftAction("addFeature");
                        const rows = [...helperElement().querySelectorAll<HTMLElement>("[data-feature-row]")];
                        change(rows[1], "[data-attribute=feature]", "Kritisch");
                        expect(control<HTMLInputElement>(rows[1], "[name=modifierValue]").required).to.equal(true);
                        expect(
                            control<HTMLElement>(rows[1], ".modifier-helper-value").getBoundingClientRect().height
                        ).to.be.greaterThan(20);
                        change(rows[1], "[name=modifierValue]", "3");
                        change(rows[1], "[data-attribute=feature]", "Wuchtig");
                        expect(
                            control<HTMLElement>(rows[1], ".modifier-helper-value").getBoundingClientRect().height
                        ).to.equal(0);
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.include(
                            `${path} feature="Wuchtig" item="Helper unscaled features" +1`
                        );
                        change(rows[1], "[data-attribute=feature]", "Kritisch");
                        expect(control<HTMLInputElement>(rows[1], "[name=modifierValue]").value).to.equal("3");
                        const raw = `${path} feature="Wuchtig" item="Helper unscaled features" +1, ${path} feature="Freihändig" item="Helper unscaled features" +1, ${path} feature="Kritisch" item="Helper unscaled features" +3`;
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                        await draftAction("addModifier");
                        await draftAction("editModifier", 0);
                        expect(control<HTMLInputElement>(helperElement(), "[name=modifierValue]").required).to.equal(
                            false
                        );
                        expect(
                            control<HTMLElement>(helperElement(), ".modifier-helper-value").getBoundingClientRect()
                                .height
                        ).to.equal(0);
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () =>
                                expect(
                                    control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value
                                ).to.equal(raw),
                            2000,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                        await passesEventually(
                            () => {
                                expect(weapon.effects.size).to.equal(3);
                                expect(weapon.system.features.featureValue("Wuchtig")).to.equal(1);
                                expect(weapon.system.features.featureValue("Freihändig")).to.equal(1);
                                expect(weapon.system.features.featureValue("Kritisch")).to.equal(3);
                            },
                            2500,
                            50
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                })
            );

            it(
                `builds ${path} rows with shared filters and independent levels, then persists separate effects`,
                withActor(async (actor) => {
                    const [weapon] = (await actor.createEmbeddedDocuments("Item", [
                        {
                            name: "Helper feature rows",
                            type: "weapon",
                            system: {
                                equipped: true,
                                skill: "blades",
                                features: {
                                    internalFeatureList: [
                                        { name: "Scharf", value: 4 },
                                        { name: "Kritisch", value: 1 },
                                    ],
                                },
                            },
                        },
                    ])) as SplittermondWeaponItem[];
                    const sheet = weapon.sheet as SplittermondItemEffectsSheet;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        await selectModifier(path, "[data-attribute=feature]");
                        const firstPicker = control<HTMLDetailsElement>(
                            helperElement(),
                            '[data-attribute-picker="feature"]'
                        );
                        control<HTMLElement>(firstPicker, "summary").click();
                        control<HTMLElement>(firstPicker, '[data-picker-value="Scharf"]').click();
                        const primaryValue = control<HTMLInputElement>(helperElement(), "[name=modifierValue]");
                        for (const invalid of ["-2", "1.5"]) {
                            change(helperElement(), "[name=modifierValue]", invalid);
                            expect(primaryValue.getAttribute("aria-invalid")).to.equal("true");
                            expect(
                                control<HTMLElement>(
                                    helperElement(),
                                    `[id="${primaryValue.getAttribute("aria-errormessage")}"]`
                                ).textContent
                            ).to.equal("Bitte eine positive ganze Zahl als Merkmalsstufe angeben.");
                            control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                            expect(document.body.contains(helperElement())).to.equal(true);
                            expect(control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value).to.equal(
                                ""
                            );
                            expect(weapon.effects.size).to.equal(0);
                        }
                        change(helperElement(), "[name=modifierValue]", "2");
                        change(helperElement(), "[data-attribute=item]", weapon.name);
                        change(helperElement(), "[data-attribute=itemType]", "weapon");
                        change(helperElement(), "[data-attribute=skill]", "blades");
                        await draftAction("addFeature");
                        let row = control<HTMLElement>(helperElement(), "[data-feature-row]");
                        const value = control<HTMLInputElement>(row, "[name=modifierValue]");
                        const picker = control<HTMLDetailsElement>(row, '[data-attribute-picker="feature"]');
                        expect(document.activeElement).to.equal(control(picker, "summary"));
                        expect(value.getBoundingClientRect().top).to.be.closeTo(
                            control<HTMLElement>(picker, "summary").getBoundingClientRect().top,
                            1
                        );
                        expect(
                            control<HTMLElement>(row, "[data-action=removeFeature]").getBoundingClientRect().bottom
                        ).to.be.at.most(value.getBoundingClientRect().top);
                        control<HTMLElement>(picker, "summary").click();
                        change(picker, 'input[type="search"]', "kritisch");
                        control<HTMLElement>(picker, '[data-picker-value="Kritisch"]').click();
                        for (const invalid of ["-2", "1.5", "0"]) {
                            change(row, "[name=modifierValue]", invalid);
                            expect(
                                control<HTMLElement>(row, ".modifier-helper-value .modifier-helper-error").textContent
                            ).to.equal("Bitte eine positive ganze Zahl als Merkmalsstufe angeben.");
                            expect(value.getAttribute("aria-invalid")).to.equal("true");
                            control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                            expect(document.body.contains(helperElement())).to.equal(true);
                            expect(control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value).to.equal(
                                ""
                            );
                            expect(weapon.effects.size).to.equal(0);
                        }
                        change(row, "[name=modifierValue]", "3");
                        await draftAction("addFeature");
                        const rows = [...helperElement().querySelectorAll<HTMLElement>("[data-feature-row]")];
                        control<HTMLButtonElement>(rows[1], "[data-action=removeFeature]").click();
                        await passesEventually(
                            () => expect(helperElement().querySelectorAll("[data-feature-row]")).to.have.length(1),
                            2000,
                            50
                        );
                        const raw = `${path} feature="Scharf" item="Helper feature rows" itemType="weapon" skill="blades" +2, ${path} feature="Kritisch" item="Helper feature rows" itemType="weapon" skill="blades" +3`;
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                        await draftAction("addModifier");
                        await draftAction("editModifier", 0);
                        row = control<HTMLElement>(helperElement(), "[data-feature-row]");
                        expect(control<HTMLInputElement>(row, "[data-attribute=feature]").value).to.equal("Kritisch");
                        expect(control<HTMLInputElement>(row, "[name=modifierValue]").value).to.equal("3");
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () =>
                                expect(
                                    control<HTMLInputElement>(sheet.element, ".effect-modifier-input").value
                                ).to.equal(raw),
                            2000,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=add-effect]").click();
                        await passesEventually(
                            () => {
                                expect(weapon.effects.size).to.equal(2);
                                expect(weapon.system.features.featureValue("Scharf")).to.equal(
                                    path === "item.addFeature" ? 6 : 4
                                );
                                expect(weapon.system.features.featureValue("Kritisch")).to.equal(
                                    path === "item.addFeature" ? 4 : 3
                                );
                            },
                            2500,
                            50
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                })
            );
        }

        it("places the value above all filters for speed, defense tick cost and fumble result at wide and narrow widths", async () => {
            const input = document.createElement("input");
            const helper = openModifierHelper(
                { name: "Helper value order", uuid: "", actor: null, isOwner: false },
                null,
                () => input,
                { append: true }
            )!;
            try {
                await passesEventually(helperElement, 2000, 50);
                for (const path of ["item.defenseTickCost", "item.weaponspeed", "lowerfumbleresult"]) {
                    await selectModifier(path, "[name=modifierValue]");
                    const value = control<HTMLInputElement>(helper.element, "[name=modifierValue]");
                    expect(helper.element.querySelectorAll("[name=modifierValue]")).to.have.length(1);
                    for (const width of [760, 480]) {
                        helper.setPosition({ width, height: 860, top: 30, left: 30 });
                        const filters = [
                            ...helper.element.querySelectorAll<HTMLElement>(
                                ".modifier-helper-attributes > .modifier-helper-field-grid > .modifier-helper-control"
                            ),
                        ];
                        expect(filters.length).to.be.greaterThan(0);
                        for (const filter of filters) {
                            expect(value.getBoundingClientRect().bottom).to.be.at.most(
                                filter.getBoundingClientRect().top
                            );
                        }
                    }
                    change(helper.element, "[data-attribute=skill]", "blades");
                    change(helper.element, "[name=modifierValue]", "-3");
                    expect(control<HTMLOutputElement>(helper.element, "output").value).to.equal(
                        `${path} skill="blades" -3`
                    );
                    expect(control<HTMLInputElement>(helper.element, "[name=modifierValue]")).to.equal(value);
                }
            } finally {
                await helper.close();
            }
        });

        it("shows at least six readable spell skills in the default-sized duration picker without covering the fixed result", async () => {
            const input = document.createElement("input");
            const helper = openModifierHelper(
                { name: "Helper readable spell skills", uuid: "", actor: null, isOwner: false },
                null,
                () => input,
                { append: true }
            )!;
            try {
                await passesEventually(helperElement, 2000, 50);
                await selectModifier("item.castDuration", "[data-attribute=unit]");
                helper.setPosition({ width: 760, height: 860, top: 30, left: 30 });
                const body = control<HTMLElement>(helper.element, ".modifier-helper-body");
                const skills = control<HTMLDetailsElement>(body, '[data-attribute-picker="skill"]');
                control<HTMLElement>(skills, "summary").click();
                expect(skills.querySelector("[data-category-heading]")).to.equal(null);
                expect(control<HTMLElement>(skills, '[data-picker-value="arcanelore"]').hidden).to.equal(false);
                await passesEventually(
                    () => {
                        const list = control<HTMLElement>(skills, ".modifier-picker-list").getBoundingClientRect();
                        const popup = control<HTMLElement>(skills, ".modifier-picker-popup").getBoundingClientRect();
                        const options = [
                            ...skills.querySelectorAll<HTMLElement>('[data-picker-value]:not([data-picker-value=""])'),
                        ];
                        const visible = options.filter((option) => {
                            const bounds = option.getBoundingClientRect();
                            return bounds.top >= list.top - 1 && bounds.bottom <= list.bottom + 1;
                        });
                        expect(visible.length).to.be.at.least(6);
                        expect(parseFloat(getComputedStyle(visible[0]).fontSize)).to.be.at.least(14);
                        expect(visible[0].getBoundingClientRect().height).to.be.at.least(24);
                        expect(popup.top).to.be.at.least(body.getBoundingClientRect().top);
                        expect(popup.bottom).to.be.at.most(body.getBoundingClientRect().bottom);
                    },
                    2000,
                    50
                );
            } finally {
                await helper.close();
            }
        });

        for (const path of ["item.addFeature", "item.mergeFeature"]) {
            it(`keeps header, result and footer visible while scrolling many ${path} rows and constrains their pickers`, async () => {
                const input = document.createElement("input");
                const helper = openModifierHelper(
                    { name: "Helper fixed layout", uuid: "", actor: null, isOwner: false },
                    null,
                    () => input,
                    { append: true }
                )!;
                try {
                    await passesEventually(helperElement, 2000, 50);
                    await selectModifier(path, "[data-attribute=feature]");
                    for (let index = 0; index < 11; index++) await draftAction("addFeature");
                    change(helper.element, "[data-attribute=feature]", "Scharf");
                    change(helper.element, "[name=modifierValue]", "2");
                    for (const row of helper.element.querySelectorAll<HTMLElement>("[data-feature-row]")) {
                        const feature = control<HTMLElement>(row, '[data-attribute-picker="feature"]');
                        expect(feature.parentElement!.querySelector(".modifier-helper-hint")).to.equal(null);
                        change(row, "[data-attribute=feature]", "Kritisch");
                        change(row, "[name=modifierValue]", "3");
                    }
                    for (const width of [760, 480]) {
                        helper.setPosition({ width, height: 600, top: 30, left: 30 });
                        const root = control<HTMLElement>(helper.element, ".modifier-helper-content");
                        const body = control<HTMLElement>(root, ".modifier-helper-body");
                        const header = control<HTMLElement>(root, ".modifier-helper-selection");
                        const footer = control<HTMLElement>(root, ".form-footer");
                        const bottom = control<HTMLElement>(root, ".modifier-helper-bottom");
                        const preview = control<HTMLOutputElement>(bottom, "output");
                        const bottomTop = bottom.getBoundingClientRect().top;
                        const previewTop = preview.getBoundingClientRect().top;
                        const headerTop = header.getBoundingClientRect().top;
                        const footerTop = footer.getBoundingClientRect().top;
                        expect(body.scrollHeight).to.be.greaterThan(body.clientHeight);
                        expect(getComputedStyle(body).overflowY).to.equal("auto");
                        expect(root.scrollHeight).to.be.at.most(root.clientHeight + 1);
                        body.scrollTop = body.scrollHeight;
                        body.dispatchEvent(new Event("scroll"));
                        expect(header.getBoundingClientRect().top).to.equal(headerTop);
                        expect(footer.getBoundingClientRect().top).to.equal(footerTop);
                        expect(preview.getBoundingClientRect().top).to.equal(previewTop);
                        expect(preview.scrollHeight).to.be.greaterThan(preview.clientHeight);
                        expect(getComputedStyle(preview).overflowY).to.equal("auto");
                        expect(preview.textContent).to.include(`${path} feature="Kritisch" +3`);
                        expect(body.getBoundingClientRect().top).to.be.at.least(header.getBoundingClientRect().bottom);
                        expect(body.getBoundingClientRect().bottom).to.be.at.most(bottomTop);
                        expect(footer.getBoundingClientRect().bottom).to.be.at.most(
                            root.getBoundingClientRect().bottom + 1
                        );
                        for (const button of footer.querySelectorAll("button"))
                            expect(button.getBoundingClientRect().height).to.be.greaterThan(0);
                        const main = control<HTMLDetailsElement>(root, ".modifier-picker-main");
                        control<HTMLElement>(main, "summary").click();
                        await passesEventually(
                            () =>
                                expect(
                                    control<HTMLElement>(main, ".modifier-picker-popup").getBoundingClientRect().bottom
                                ).to.be.at.most(bottomTop),
                            2000,
                            50
                        );
                        control<HTMLElement>(main, "summary").click();
                        const rows = [...root.querySelectorAll<HTMLElement>("[data-feature-row]")];
                        const row = rows[rows.length - 1];
                        const picker = control<HTMLDetailsElement>(row, '[data-attribute-picker="feature"]');
                        control<HTMLElement>(picker, "summary").scrollIntoView({ block: "center" });
                        control<HTMLElement>(picker, "summary").click();
                        await passesEventually(
                            () => {
                                const popup = control<HTMLElement>(
                                    picker,
                                    ".modifier-picker-popup"
                                ).getBoundingClientRect();
                                const anchor = control<HTMLElement>(picker, "summary").getBoundingClientRect();
                                const bounds = body.getBoundingClientRect();
                                expect(popup.height).to.be.closeTo(
                                    Math.max(anchor.top - bounds.top - 4, bounds.bottom - anchor.bottom - 4),
                                    1
                                );
                                expect(popup.top).to.be.at.least(body.getBoundingClientRect().top);
                                expect(popup.bottom).to.be.at.most(body.getBoundingClientRect().bottom);
                            },
                            2000,
                            50
                        );
                        control<HTMLElement>(picker, "summary").click();
                    }
                    await selectModifier("item.damage", "[data-attribute=features]");
                    expect(control<HTMLElement>(helper.element, ".modifier-helper-body").scrollTop).to.equal(0);
                } finally {
                    await helper.close();
                }
            });
        }

        it("discards all staged list entries on cancellation", async () => {
            const input = document.createElement("input");
            input.value = "defense +1";
            document.body.append(input);
            const helper = openModifierHelper(
                { name: "Helper cancel list", uuid: "", actor: null, isOwner: false },
                null,
                () => input,
                { append: true }
            )!;
            try {
                await passesEventually(helperElement, 2000, 50);
                await selectModifier("speed", "[name=modifierValue]");
                change(helperElement(), "[name=modifierValue]", "2");
                await draftAction("addModifier");
                await closeHelper();
                expect(input.value).to.equal("defense +1");
            } finally {
                await helper.close();
                input.remove();
            }
        });

        for (const type of ["equipment", "mastery"] as const) {
            it(
                `appends through the ${type} property field and retains structured effects after later updates`,
                withActor(async (actor) => {
                    const initial = type === "mastery" ? 'skills skill="${skill}" +1' : "defense +1";
                    const [item] = (await actor.createEmbeddedDocuments("Item", [
                        {
                            name: "Helper property integration",
                            type,
                            system: { modifier: initial, ...(type === "mastery" ? { skill: "acrobatics" } : {}) },
                        },
                    ])) as SplittermondItem[];
                    const sheet = item.sheet as SplittermondItemEffectsSheet;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper-property]").click();
                        await passesEventually(helperElement, 2000, 50);
                        await selectModifier("resistance", "[data-attribute=damageType]");
                        change(helperElement(), "[data-attribute=damageType]", "cold");
                        change(helperElement(), "[name=modifierValue]", "2");
                        await draftAction("addModifier");
                        await selectModifier("speed", "[name=modifierValue]");
                        change(helperElement(), "[name=modifierValue]", "3");
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        const verifyEffects = () => {
                            const effects = item.effects.contents as SplittermondActiveEffect[];
                            expect(effects).to.have.length(3);
                            expect(
                                effects.some((effect) => effect.getFlag("splittermond", "rawInput") === "speed +3")
                            ).to.equal(true);
                            const resistance = effects.find(
                                (effect) => effect.getFlag("splittermond", "rawInput") === "resistance.cold +2"
                            )!;
                            expect(resistance.type).to.equal("autoGenerated");
                            if (!("modifiers" in resistance.system))
                                throw new Error("Missing structured modifier data");
                            expect(resistance.system.modifiers[0].path).to.equal("resistance.cold");
                            expect(resistance.system.modifiers[0].serializedValue).to.deep.equal({
                                type: "amount",
                                amount: 2,
                            });
                        };
                        await passesEventually(
                            () => {
                                expect(
                                    control<HTMLInputElement>(sheet.element, '[name="system.modifier"]').value
                                ).to.equal(`${initial}, resistance.cold +2, speed +3`);
                                verifyEffects();
                            },
                            3000,
                            50
                        );
                        await item.update(
                            type === "mastery" ? { "system.skill": "athletics" } : { name: "Helper property renamed" }
                        );
                        await passesEventually(
                            () => {
                                verifyEffects();
                                if (type === "mastery") {
                                    expect(
                                        item.effects.contents.some(
                                            (effect) =>
                                                effect.getFlag("splittermond", "rawInput") ===
                                                'skills skill="athletics" +1'
                                        )
                                    ).to.equal(true);
                                }
                            },
                            3000,
                            50
                        );
                        await sheet.close();
                        await sheet.render(true);
                        expect(control<HTMLInputElement>(sheet.element, '[name="system.modifier"]').value).to.equal(
                            `${initial}, resistance.cold +2, speed +3`
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                })
            );
        }

        it(
            "validates incompatible filters inline without rerendering or losing the value",
            withActiveEffect(
                {
                    name: "Helper field errors",
                    type: "modifier",
                    flags: { splittermond: { rawInput: "item.damage +2" } },
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        const field = control<HTMLInputElement>(helperElement(), "[data-attribute=spellType]");
                        change(helperElement(), "[data-attribute=item]", "Test item");
                        change(helperElement(), "[data-attribute=spellType]", "Schaden");
                        expect(field.getAttribute("aria-invalid")).to.equal("true");
                        expect(control<HTMLElement>(helperElement(), "[data-error-for=spellType]").hidden).to.equal(
                            false
                        );
                        const hint = control<HTMLElement>(
                            field.closest(".modifier-helper-control")!,
                            ".modifier-helper-hint"
                        );
                        expect(hint.textContent).to.include("Zaubertypus");
                        expect(hint.hidden).to.equal(false);
                        change(helperElement(), "[data-attribute=item]", "");
                        expect(control<HTMLInputElement>(helperElement(), "[data-attribute=spellType]")).to.equal(
                            field
                        );
                        expect(field.getAttribute("aria-invalid")).to.equal("false");
                        expect(hint.textContent).to.include("Zaubertypus");
                        expect(control<HTMLInputElement>(helperElement(), "[name=modifierValue]").value).to.equal("2");
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => expect(effect.system.modifiers[0].attributes.spellType).to.equal("schaden"),
                            2500,
                            50
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "keeps invalid input open and cancellation leaves the effect unchanged",
            withActiveEffect(
                {
                    name: "Helper cancel",
                    type: "modifier",
                    flags: { splittermond: { rawInput: "defense +2" } },
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        await selectModifier("check.require", "[data-attribute=rollType]");
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        expect(helperElement()).to.exist;
                        expect(control<HTMLElement>(helperElement(), "[data-error-for=rollType]").hidden).to.equal(
                            false
                        );
                        expect(
                            control<HTMLElement>(helperElement(), "[data-attribute=rollType]").getAttribute(
                                "aria-invalid"
                            )
                        ).to.equal("true");
                        await closeHelper();
                        expect(effect.getFlag("splittermond", "rawInput")).to.equal("defense +2");
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "does not offer the helper for generated effects",
            withActiveEffect(
                { name: "Generated helper test", type: "autoGenerated", system: { modifiers: [], costModifiers: [] } },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        expect(sheet.element.querySelector("[data-action=modifier-helper]")).to.equal(null);
                    } finally {
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "accepts numbers, formulas and references in the same field without rerendering",
            withActiveEffect(
                {
                    name: "Helper unified value",
                    type: "modifier",
                    flags: { splittermond: { rawInput: "item.damage +2" } },
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    const valueInput = () => control<HTMLInputElement>(helperElement(), "[name=modifierValue]");
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        const field = valueInput();
                        expect(field.type).to.equal("text");
                        expect(helperElement().querySelector("[name=valueMode]")).to.equal(null);
                        for (const [value, expected] of [
                            ["2.5", "+2.5"],
                            ["-2", "-2"],
                            ["${attributes.strength.value}", "${attributes.strength.value}"],
                            ["2W6+1", "2W6+1"],
                        ]) {
                            change(helperElement(), "[name=modifierValue]", value);
                            expect(valueInput()).to.equal(field);
                            expect(field.getAttribute("aria-invalid")).to.equal("false");
                            expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(
                                `item.damage ${expected}`
                            );
                        }
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal("item.damage 2W6+1");
                                expect(effect.system.modifiers[0].path).to.equal("item.damage");
                            },
                            2500,
                            50
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "suggests another damage feature after a comma and persists a spaced dice formula across reopening",
            withActiveEffect(
                {
                    name: "Helper damage suggestions",
                    type: "modifier",
                    flags: { splittermond: { rawInput: "item.damage +2" } },
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    const raw = 'item.damage features="Scharf 2, Kritisch 3" 2W6+2';
                    try {
                        await sheet.render(true);
                        // DOM insertion alone does not guarantee that listeners and positioning are ready.
                        const rendering = sinon.spy(ModifierHelper.prototype, "render");
                        try {
                            control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                            await rendering.firstCall.returnValue;
                        } finally {
                            rendering.restore();
                        }
                        const value = control<HTMLInputElement>(helperElement(), "[name=modifierValue]");
                        const item = control<HTMLInputElement>(helperElement(), "[data-attribute=item]");
                        expect(value.closest(".modifier-helper-attributes")).not.to.equal(null);
                        expect(value.getBoundingClientRect().bottom).to.be.at.most(item.getBoundingClientRect().top);
                        expect(value.placeholder).to.equal("bspw. 2W6 +2 oder +5");
                        change(helperElement(), "[name=modifierValue]", "2W6 +2");
                        const input = control<HTMLInputElement>(helperElement(), "[data-attribute=features]");
                        const picker = input.closest<HTMLElement>(".modifier-feature-combobox")!;
                        const list = control<HTMLElement>(picker, ".modifier-picker-list");
                        input.focus();
                        expect(input.getAttribute("aria-expanded"), "feature suggestions open on focus").to.equal(
                            "true"
                        );
                        await passesEventually(
                            () =>
                                expect(list.clientHeight, "focused feature suggestions are visible").to.be.greaterThan(
                                    0
                                ),
                            2000,
                            50
                        );
                        expect(list.scrollHeight).to.be.greaterThan(list.clientHeight);
                        expect(getComputedStyle(list).overflowY).to.equal("auto");
                        expect(control<HTMLElement>(picker, '[data-picker-value="Scharf"]').textContent).to.equal(
                            "Scharf [Stufe]"
                        );
                        control<HTMLElement>(picker, '[data-picker-value="Scharf"]').click();
                        expect(input.value).to.equal("Scharf");
                        expect(input.getAttribute("aria-expanded")).to.equal("false");
                        change(picker, "[data-attribute=features]", "Scharf 2,");
                        expect(input.getAttribute("aria-expanded")).to.equal("true");
                        expect(
                            [...list.querySelectorAll<HTMLElement>("[data-picker-value]")].filter(
                                (option) => !option.hidden
                            ).length
                        ).to.be.greaterThan(20);
                        change(picker, "[data-attribute=features]", "Scharf 2, Krit");
                        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
                        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                        expect(input.value).to.equal("Scharf 2, Kritisch");
                        expect(document.activeElement).to.equal(input);
                        change(picker, "[data-attribute=features]", "Scharf 2, Kritisch 3");
                        expect(control<HTMLOutputElement>(helperElement(), "output").value).to.equal(raw);
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(effect.getFlag("splittermond", "rawInput")).to.equal(raw);
                                expect(effect.system.modifiers[0].attributes.features).to.equal("Scharf 2, Kritisch 3");
                                expect(effect.system.modifiers[0].serializedValue.type).to.equal("roll");
                                expect(
                                    String(effect.system.modifiers[0].serializedValue.formula).replace(/\s+/g, "")
                                ).to.equal("2d6+2");
                                expect(document.querySelector(".modifier-helper")).to.equal(null);
                            },
                            2500,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(control<HTMLInputElement>(helperElement(), "[data-attribute=features]").value).to.equal(
                            "Scharf 2, Kritisch 3"
                        );
                        expect(control<HTMLInputElement>(helperElement(), "[name=modifierValue]").value).to.equal(
                            "2d6+2"
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it(
            "explains additional-damage features without blocking persistence and clears obsolete advice",
            withActiveEffect(
                {
                    name: "Helper damage feature advice",
                    type: "modifier",
                    flags: { splittermond: { rawInput: 'item.damage features="Scharf 5" +5' } },
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const sheet = effect.sheet as SplittermondActiveEffectConfig;
                    try {
                        await sheet.render(true);
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        const features = control<HTMLInputElement>(helperElement(), "[data-attribute=features]");
                        expect(features.closest(".modifier-helper-control")!.textContent).to.include(
                            "Merkmale des Zusatzschadens"
                        );
                        expect(features.closest(".modifier-helper-control")!.textContent).to.include("W6: 3, W10: 5");
                        const value = control<HTMLInputElement>(helperElement(), "[name=modifierValue]");
                        const hint = control<HTMLElement>(helperElement(), "[data-value-hint]");
                        expect(hint.hidden).to.equal(false);
                        expect(hint.textContent).to.include("feste Zahl");
                        expect(hint.getBoundingClientRect().top).to.be.at.least(value.getBoundingClientRect().bottom);
                        change(helperElement(), "[name=modifierValue]", "1W6");
                        expect(hint.hidden).to.equal(true);
                        expect(control(helperElement(), "[name=modifierValue]")).to.equal(value);
                        change(helperElement(), "[name=modifierValue]", "5");
                        expect(hint.hidden).to.equal(false);
                        expect(value.getAttribute("aria-invalid")).to.equal("false");
                        control<HTMLButtonElement>(helperElement(), "[data-action=applyModifier]").click();
                        await passesEventually(
                            () => {
                                expect(document.querySelector(".modifier-helper")).to.equal(null);
                                expect(effect.system.modifiers[0].attributes.features).to.equal("Scharf 5");
                                expect(effect.system.modifiers[0].serializedValue).to.deep.equal({
                                    type: "amount",
                                    amount: 5,
                                });
                            },
                            2500,
                            50
                        );
                        control<HTMLButtonElement>(sheet.element, "[data-action=modifier-helper]").click();
                        await passesEventually(helperElement, 2000, 50);
                        expect(control<HTMLElement>(helperElement(), "[data-value-hint]").hidden).to.equal(false);
                        await selectModifier("item.mergeFeature", "[data-attribute=feature]");
                        await passesEventually(
                            () => {
                                expect(helperElement().querySelector("[data-attribute=features]")).to.equal(null);
                                expect(control<HTMLElement>(helperElement(), "[data-value-hint]").hidden).to.equal(
                                    true
                                );
                            },
                            2000,
                            50
                        );
                    } finally {
                        await closeHelper();
                        await sheet.close();
                    }
                }
            )
        );

        it("reveals selected features, grouped skills, modifiers and variants when their pickers reopen", async () => {
            const cases = [
                ['item.addFeature feature="Gehärtet" +1', '[data-attribute-picker="feature"]'],
                ['actor.skills skill="watermagic" +2', '[data-attribute-picker="skill"]'],
                ["watermagic +2", ".modifier-picker-main"],
                ["item.castDuration.multiplier 2", ".modifier-variant-picker"],
            ] as const;
            for (const [initial, selector] of cases) {
                const input = document.createElement("input");
                input.value = initial;
                const helper = openModifierHelper(
                    { name: "Helper selected option", uuid: "", actor: null, isOwner: false },
                    null,
                    () => input
                )!;
                try {
                    await passesEventually(() => expect(helper.rendered).to.equal(true), 2000, 50);
                    helper.setPosition({ width: 640, height: 560, top: 30, left: 30 });
                    const picker = control<HTMLDetailsElement>(helper.element, selector);
                    const summary = control<HTMLElement>(picker, "summary");
                    const list = control<HTMLElement>(picker, ".modifier-picker-list");
                    const selected = control<HTMLElement>(picker, '[data-picker-value][aria-selected="true"]');
                    const body = control<HTMLElement>(helper.element, ".modifier-helper-body");
                    const scrollTop = body.scrollTop;
                    const assertVisible = () => {
                        const bounds = selected.getBoundingClientRect();
                        const viewport = list.getBoundingClientRect();
                        expect(selected.hidden).to.equal(false);
                        expect(viewport.height).to.be.greaterThan(0);
                        expect(bounds.top).to.be.at.least(viewport.top - 1);
                        expect(bounds.bottom).to.be.at.most(viewport.bottom + 1);
                        const category =
                            selected.dataset.category ??
                            selected.closest<HTMLElement>("[data-choice-category]")?.dataset.choiceCategory;
                        const heading = [...list.querySelectorAll<HTMLElement>("[data-category-heading]")].find(
                            (entry) => entry.dataset.categoryHeading === category
                        );
                        if (heading) {
                            expect(heading.getAttribute("aria-expanded")).to.equal("true");
                            expect(bounds.top).to.be.at.least(heading.getBoundingClientRect().bottom - 1);
                        }
                        expect(body.scrollTop).to.equal(scrollTop);
                        expect(input.value).to.equal(initial);
                    };
                    summary.click();
                    await passesEventually(assertVisible, 2000, 50);
                    list.scrollTop = list.scrollHeight;
                    summary.click();
                    summary.click();
                    await passesEventually(assertVisible, 2000, 50);
                } finally {
                    await helper.close();
                }
            }
        });

        it("keeps sorting open and grows the picker with the application window", async () => {
            const input = document.createElement("input");
            input.value = "defense +2";
            const helper = openModifierHelper(
                { name: "Helper layout", uuid: "", actor: null, isOwner: false },
                null,
                () => input
            )!;
            try {
                await passesEventually(() => expect(helper.rendered).to.equal(true), 2000, 50);
                helper.setPosition({ width: 640, height: 480, top: 30, left: 30 });
                const picker = control<HTMLDetailsElement>(helper.element, ".modifier-picker-main");
                const popup = control<HTMLElement>(picker, ".modifier-picker-popup");
                expect(picker.open).to.equal(false);
                control<HTMLElement>(picker, "summary").click();
                const visibleHeadings = () =>
                    [...picker.querySelectorAll<HTMLElement>("[data-category-heading]")]
                        .filter((heading) => !heading.hidden)
                        .map((heading) => heading.dataset.categoryHeading);
                expect(visibleHeadings()).to.deep.equal(["skills", "other"]);
                control<HTMLButtonElement>(picker, '[data-category-heading="skills"]').click();
                expect(visibleHeadings()).to.deep.equal(["skills", "general", "magic", "fighting", "other"]);
                control<HTMLButtonElement>(picker, '[data-category-heading="general"]').click();
                await passesEventually(
                    () => {
                        expect(Number.parseFloat(popup.style.maxHeight)).to.be.greaterThan(100);
                        expect(popup.clientHeight).to.be.greaterThan(100);
                    },
                    2000,
                    50
                );
                const initialSize = popup.getBoundingClientRect();
                helper.setPosition({ width: 760, height: 680 });
                await passesEventually(
                    () => {
                        const size = popup.getBoundingClientRect();
                        expect(size.height).to.be.greaterThan(initialSize.height + 100);
                        expect(size.width).to.be.greaterThan(initialSize.width + 100);
                        expect(size.bottom).to.be.at.most(
                            control<HTMLElement>(helper.element, ".modifier-helper-content").getBoundingClientRect()
                                .bottom
                        );
                    },
                    2000,
                    50
                );
                const magic = control<HTMLButtonElement>(picker, '[data-category-heading="magic"]');
                magic.click();
                expect(getComputedStyle(magic).position).to.equal("sticky");
                const categoryStyle = getComputedStyle(magic);
                const buttonStyle = getComputedStyle(control(helper.element, "[data-action=cancel]"));
                expect(
                    categoryStyle.backgroundImage === buttonStyle.backgroundImage,
                    "native category texture"
                ).to.equal(true);
                expect(categoryStyle.fontFamily).to.equal(buttonStyle.fontFamily);
                expect(categoryStyle.color).to.equal(buttonStyle.color);
                const list = control<HTMLElement>(picker, ".modifier-picker-list");
                const first = control<HTMLElement>(list, '[data-modifier-path="actor.skills.magic"]');
                expect(Math.abs(magic.getBoundingClientRect().top - list.getBoundingClientRect().top)).to.be.lessThan(
                    2
                );
                expect(
                    Math.abs(first.getBoundingClientRect().top - magic.getBoundingClientRect().bottom)
                ).to.be.lessThan(2);
                const search = control<HTMLInputElement>(picker, "[name=modifierSearch]");
                search.focus();
                search.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
                control<HTMLInputElement>(picker, "[name=modifierSort][value=alphabetical]").closest("label")!.click();
                expect(picker.open).to.equal(true);
                expect(control<HTMLInputElement>(picker, "[name=modifierSort][value=alphabetical]").checked).to.equal(
                    true
                );
                expect(control<HTMLInputElement>(helper.element, "[name=modifierValue]").value).to.equal("2");
                control<HTMLInputElement>(picker, "[name=modifierSort][value=category]").closest("label")!.click();
                control<HTMLButtonElement>(picker, '[data-category-heading="general"]').click();
                expect(
                    control<HTMLButtonElement>(picker, '[data-category-heading="general"]').getAttribute(
                        "aria-expanded"
                    )
                ).to.equal("false");
                expect(control<HTMLElement>(picker, '[data-modifier-path="acrobatics"]').hidden).to.equal(true);
                expect(picker.open).to.equal(true);
            } finally {
                await helper.close();
            }
        });

        it("provides room for direct item functions and their variants with aligned draft controls at a narrow width", async () => {
            const input = document.createElement("input");
            const helper = openModifierHelper(
                { name: "Helper default layout", uuid: "", actor: null, isOwner: false },
                null,
                () => input,
                { append: true }
            )!;
            try {
                await passesEventually(helperElement, 2000, 50);
                const height = helper.element.getBoundingClientRect().height;
                expect(control<HTMLDetailsElement>(helperElement(), ".modifier-picker-main").open).to.equal(true);
                control<HTMLButtonElement>(helperElement(), '[data-category-heading="other"]').click();
                const list = control<HTMLElement>(helperElement(), ".modifier-picker-main .modifier-picker-list");
                await passesEventually(() => expect(list.clientHeight).to.be.greaterThan(240), 2000, 50);
                expect(list.querySelector('[data-modifier-path="item"]')).to.equal(null);
                const itemFunctions = [...list.querySelectorAll<HTMLElement>('[data-modifier-path^="item."]')];
                expect(itemFunctions).to.have.length(6);
                expect(itemFunctions.every((option) => !option.hidden)).to.equal(true);
                await selectModifier("item.castDuration", '[data-path-parent="item.castDuration"]');
                control<HTMLElement>(helperElement(), '[data-path-parent="item.castDuration"]').click();
                const variants = control<HTMLElement>(
                    helperElement(),
                    ".modifier-variant-picker .modifier-picker-list"
                );
                await passesEventually(
                    () => {
                        expect(variants.clientHeight).to.be.greaterThan(0);
                        expect(variants.scrollHeight).to.be.at.most(variants.clientHeight + 1);
                    },
                    2000,
                    50
                );
                expect(helper.element.getBoundingClientRect().height).to.equal(height);
                expect(height).to.be.at.least(Math.min(700, window.innerHeight - 32));
                helper.setPosition({ width: 480 });
                const buttons = [...helper.element.querySelectorAll<HTMLButtonElement>(".form-footer button")];
                expect(buttons).to.have.length(3);
                const addBounds = buttons[0].getBoundingClientRect();
                buttons.forEach((button) => {
                    expect(button.getBoundingClientRect().height).to.equal(addBounds.height);
                    expect(button.scrollWidth).to.be.at.most(button.clientWidth);
                });
            } finally {
                await helper.close();
            }
        });
    });
}
