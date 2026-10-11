import { expect } from "chai";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import { ModifierHelper } from "module/modifierHelper/ModifierHelper";
import { renderModifierDrafts } from "module/modifierHelper/modifierDrafts";
import { createHtml } from "../../../handlebarHarness";
import { foundryApi } from "module/api/foundryApi";
import { parseModifiers } from "module/modifiers/parsing";
import { source, module, definitions, localize, setupModifierHelperTests } from "./testUtils";

describe("Modifier helper", () => {
    const sandbox = setupModifierHelperTests();

    describe("modifier draft lists", () => {
        let dom: JSDOM;
        let helper: ModifierHelper;
        let root: HTMLElement;
        let apply: sinon.SinonSpy<[string], boolean>;
        let render: sinon.SinonStub;
        const add = () => ModifierHelper.DEFAULT_OPTIONS.actions.addModifier.call(helper);
        const finish = () => ModifierHelper.DEFAULT_OPTIONS.actions.applyModifier.call(helper);
        const preview = () => root.querySelector<HTMLOutputElement>("output")!.value;
        const changeValue = (value: string) => {
            const input = root.querySelector<HTMLInputElement>("[name=modifierValue]")!;
            input.value = value;
            input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
        };
        const edit = (index: number) =>
            ModifierHelper.DEFAULT_OPTIONS.actions.editModifier.call(
                helper,
                new dom.window.Event("click"),
                root.querySelector<HTMLElement>(`[data-action=editModifier][data-index="${index}"]`)!
            );
        const remove = (index: number) =>
            ModifierHelper.DEFAULT_OPTIONS.actions.removeModifier.call(
                helper,
                new dom.window.Event("click"),
                root.querySelector<HTMLElement>(`[data-action=removeModifier][data-index="${index}"]`)!
            );
        const selectGroup = async (path: string) => {
            const option = root.querySelector<HTMLElement>(`[data-modifier-path="${path}"]`)!;
            if (option.hidden) {
                const heading = root.querySelector<HTMLButtonElement>(
                    `[data-category-heading="${option.dataset.category}"]`
                )!;
                if (heading.hidden)
                    root.querySelector<HTMLButtonElement>(
                        `[data-category-heading="${heading.dataset.categoryParent}"]`
                    )!.click();
                if (option.hidden) heading.click();
            }
            option.click();
            await render.lastCall.returnValue;
        };
        beforeEach(async () => {
            dom = new JSDOM();
            root = dom.window.document.body;
            apply = sinon.spy((_raw: string) => true);
            helper = new ModifierHelper({
                definitions,
                initial: "defense +2",
                multiple: true,
                validate: (raw) => module.addModifier(source, raw, "innate").diagnostics ?? [],
                apply,
            });
            Object.defineProperty(helper, "element", { value: root });
            render = sandbox.stub(helper, "render").callsFake(async () => {
                const context = await helper._prepareContext({});
                root.innerHTML = createHtml("templates/apps/modifier-helper.hbs", context);
                await helper._onRender(context);
                return helper;
            });
            sandbox.stub(helper, "close").resolves();
            sandbox.stub(foundryApi, "warnUser");
            await helper.render();
        });
        afterEach(() => dom.window.close());

        const changeField = (container: ParentNode, selector: string, value: string) => {
            const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
            input.value = value;
            input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
        };

        const selectFeature = async (container: ParentNode, feature: string) => {
            changeField(container, "[data-attribute=feature]", feature);
            await render.lastCall.returnValue;
        };

        for (const path of ["item.addFeature", "item.mergeFeature"]) {
            for (const additional of [false, true]) {
                it(`${path}: blocks invalid literal levels in the ${additional ? "additional" : "primary"} feature row until corrected`, async () => {
                    await selectGroup(path);
                    changeField(root, "[data-attribute=feature]", "Scharf");
                    changeValue("2");
                    if (additional) await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                    const row = additional ? root.querySelector<HTMLElement>("[data-feature-row]")! : root;
                    changeField(row, "[data-attribute=feature]", additional ? "Kritisch" : "Scharf");
                    const value = row.querySelector<HTMLInputElement>("[name=modifierValue]")!;
                    for (const invalid of ["-2", "1.5", "0"]) {
                        changeField(row, "[name=modifierValue]", invalid);
                        await finish();
                        expect(apply.called).to.equal(false);
                        expect(value.getAttribute("aria-invalid")).to.equal("true");
                        expect(dom.window.document.activeElement).to.equal(value);
                        const error = root.querySelector<HTMLElement>(
                            `[id="${value.getAttribute("aria-errormessage")}"]`
                        )!;
                        expect(error.hidden).to.equal(false);
                        expect(error.textContent).to.equal(localize("splittermond.modifierHelper.errors.featureLevel"));
                    }
                    changeField(row, "[name=modifierValue]", "3");
                    expect(value.getAttribute("aria-invalid")).to.equal("false");
                    await finish();
                    const raw = additional
                        ? `${path} feature="Scharf" +2, ${path} feature="Kritisch" +3`
                        : `${path} feature="Scharf" +3`;
                    expect(apply.calledOnceWithExactly(raw)).to.equal(true);
                });
            }

            it(`${path}: defaults repeatable improvements, updates companions, and restores their own input when editing`, async () => {
                await selectGroup(path);
                await selectFeature(root, "Verbesserter Entwaffnungsschutz");
                const value = root.querySelector<HTMLSelectElement>("[name=modifierValue]")!;
                expect(value.tagName).to.equal("SELECT");
                expect(value.value).to.equal("1");
                expect([...value.options].map((option) => option.value)).to.deep.equal(["", "1", "2"]);
                changeValue("2");
                changeField(root, "[data-attribute=item]", "Schwert");
                const expected = `${path} feature="Verbesserter Entwaffnungsschutz" item="Schwert" +2, item.addFeature feature="Entwaffnungsschutz" item="Schwert" +2`;
                expect(preview()).to.equal(expected);
                await add();
                await selectGroup("item.mergeFeature");
                await selectFeature(root, "Verbesserte Schärfe");
                changeField(root, "[data-attribute=currentLevel]", "2");
                const sharp =
                    'item.mergeFeature feature="Verbesserte Schärfe" +1, item.mergeFeature feature="Scharf" +3';
                expect(preview()).to.equal(`${expected}, ${sharp}`);
                await edit(0);
                expect(root.querySelector<HTMLInputElement>("[name=modifierValue]")!.value).to.equal("2");
                expect(root.querySelectorAll("[data-feature-row]")).to.have.length(0);
                changeValue("1");
                await edit(1);
                expect(root.querySelector<HTMLInputElement>("[data-attribute=currentLevel]")!.value).to.equal("2");
                await finish();
                expect(apply.firstCall.args[0]).to.equal(`${expected.replace(/\+2/g, "+1")}, ${sharp}`);
            });
        }

        it("keeps additional improvement companions scoped to their rows and removes them with their feature", async () => {
            await selectGroup("item.addFeature");
            await selectFeature(root, "Verbesserter Kritischer Schaden");
            await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
            await selectFeature(root.querySelector("[data-feature-row]")!, "Fertigkeitsbonus");
            const row = root.querySelector<HTMLElement>("[data-feature-row]")!;
            changeField(row, "[data-attribute=skill]", "acrobatics");
            changeField(row, "[data-attribute=emphasis]", "Balance");
            changeField(row, "[name=modifierValue]", "2");
            expect(preview()).to.equal(
                'item.addFeature feature="Verbesserter Kritischer Schaden" +1, item.addFeature feature="Kritisch" +2, item.addFeature feature="Fertigkeitsbonus" +2, actor.skills skill="acrobatics" emphasis="Balance" +2'
            );
            await ModifierHelper.DEFAULT_OPTIONS.actions.removeFeature.call(
                helper,
                new dom.window.Event("click"),
                row.querySelector<HTMLElement>("[data-action=removeFeature]")!
            );
            expect(preview()).to.equal(
                'item.addFeature feature="Verbesserter Kritischer Schaden" +1, item.addFeature feature="Kritisch" +2'
            );
            await selectFeature(root, "Wuchtig");
            expect(root.querySelector("[data-feature-adjustment]")).to.equal(null);
            expect(preview()).to.equal('item.addFeature feature="Wuchtig" +1');
        });

        it("blocks incomplete or excessive improvements and focuses their own fields", async () => {
            await selectGroup("item.addFeature");
            await selectFeature(root, "Fertigkeitsbonus");
            await finish();
            expect(apply.called).to.equal(false);
            expect(dom.window.document.activeElement).to.equal(root.querySelector("[data-feature-adjustment] summary"));
            changeField(root, "[data-feature-adjustment] [data-attribute=skill]", "acrobatics");
            changeField(root, "[data-attribute=emphasis]", "Balance");
            changeValue("4");
            await finish();
            expect(apply.called).to.equal(false);
            expect(root.querySelector("[name=modifierValue]")!.getAttribute("aria-invalid")).to.equal("true");
            expect(root.querySelector("[data-adjustment-preview]")!.textContent).to.equal(
                "Unvollständiger Modifikator"
            );
            changeValue("3");
            await finish();
            expect(apply.firstCall.args[0]).to.equal(
                'item.addFeature feature="Fertigkeitsbonus" +3, actor.skills skill="acrobatics" emphasis="Balance" +3'
            );
        });

        it("allows disabling carrier-only protection without losing its damage type across editing", async () => {
            await selectGroup("item.mergeFeature");
            await selectFeature(root, "Schutz vor Schadensarten");
            changeField(root, "[data-attribute=damageType]", "fire");
            const checkbox = root.querySelector<HTMLInputElement>("[data-adjustment-enabled]")!;
            checkbox.checked = false;
            checkbox.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
            expect(preview()).to.equal('item.mergeFeature feature="Schutz vor Schadensarten" +1');
            await add();
            await edit(0);
            expect(root.querySelector<HTMLSelectElement>("[data-attribute=damageType]")!.value).to.equal("fire");
            const restored = root.querySelector<HTMLInputElement>("[data-adjustment-enabled]")!;
            expect(restored.checked).to.equal(false);
            restored.checked = true;
            restored.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
            expect(preview()).to.equal('item.mergeFeature feature="Schutz vor Schadensarten" +1, resistance.fire +1');
        });

        it("renders a structural improvement selection once under delay and keeps intervening input", async () => {
            await selectGroup("item.addFeature");
            let release: () => void = () => {};
            const pending = new Promise<void>((resolve) => (release = resolve));
            render.callsFake(async () => {
                await pending;
                const context = await helper._prepareContext({});
                root.innerHTML = createHtml("templates/apps/modifier-helper.hbs", context);
                await helper._onRender(context);
                return helper;
            });
            const before = render.callCount;
            const feature = root.querySelector<HTMLInputElement>("[data-attribute=feature]")!;
            feature.value = "Verbesserter Kritischer Schaden";
            feature.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            feature.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
            changeField(root, "[data-attribute=item]", "Schwert");
            expect(render.callCount - before).to.equal(1);
            release();
            await render.lastCall.returnValue;
            expect(root.querySelector<HTMLInputElement>("[data-attribute=item]")!.value).to.equal("Schwert");
            expect(preview()).to.equal(
                'item.addFeature feature="Verbesserter Kritischer Schaden" item="Schwert" +1, item.addFeature feature="Kritisch" item="Schwert" +2'
            );
            const rendered = render.callCount;
            changeField(root, "[data-attribute=item]", "Dolch");
            expect(render.callCount).to.equal(rendered);
            expect(preview()).to.include('feature="Kritisch" item="Dolch" +2');
        });

        it("keeps the default improvement count across the input/change pair before a structural render completes", async () => {
            await selectGroup("item.addFeature");
            const feature = root.querySelector<HTMLInputElement>("[data-attribute=feature]")!;
            feature.value = "Fertigkeitsbonus";
            feature.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            feature.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
            await render.lastCall.returnValue;
            expect(root.querySelector<HTMLInputElement>("[name=modifierValue]")!.value).to.equal("1");
        });

        it("initializes grouped skill categories after a flat picker and preserves their state across switching back", async () => {
            await selectGroup("item.castDuration");
            await selectGroup("actor.skills");
            const skills = () => root.querySelector<HTMLElement>('[data-attribute-picker="skill"]')!;
            const headings = () => [...skills().querySelectorAll<HTMLButtonElement>("[data-category-heading]")];
            expect(headings().every((heading) => heading.getAttribute("aria-expanded") === "false")).to.equal(true);
            skills().querySelector<HTMLButtonElement>('[data-category-heading="general"]')!.click();
            await selectGroup("item.castDuration");
            expect(headings()).to.be.empty;
            await selectGroup("actor.skills");
            expect(skills().querySelector('[data-category-heading="general"]')!.getAttribute("aria-expanded")).to.equal(
                "true"
            );
            expect(skills().querySelector('[data-category-heading="magic"]')!.getAttribute("aria-expanded")).to.equal(
                "false"
            );
        });

        for (const path of ["item.addFeature", "item.mergeFeature"] as const) {
            it(`builds ${path} for unscaled features without a value in every row and preserves explicit values`, async () => {
                await selectGroup(path);
                changeField(root, "[data-attribute=feature]", "Wuchtig");
                expect(preview()).to.equal(`${path} feature="Wuchtig" +1`);
                expect(root.querySelector<HTMLInputElement>("[name=modifierValue]")!.required).to.equal(false);
                expect(root.querySelector<HTMLElement>(".modifier-helper-value")!.hidden).to.equal(true);
                expect(
                    root
                        .querySelector('[data-attribute-picker="feature"]')!
                        .parentElement!.classList.contains("modifier-helper-wide")
                ).to.equal(true);
                await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                const row = root.querySelector<HTMLElement>("[data-feature-row]")!;
                changeField(row, "[data-attribute=feature]", "Dornen");
                expect(row.querySelector<HTMLInputElement>("[name=modifierValue]")!.required).to.equal(false);
                expect(row.querySelector<HTMLElement>(".modifier-helper-value")!.hidden).to.equal(true);
                expect(preview()).to.equal(`${path} feature="Wuchtig" +1, ${path} feature="Dornen" +1`);
                changeField(row, "[data-attribute=feature]", "Scharf");
                expect(row.querySelector<HTMLInputElement>("[name=modifierValue]")!.required).to.equal(true);
                expect(row.querySelector<HTMLElement>(".modifier-helper-value")!.hidden).to.equal(false);
                expect(
                    row
                        .querySelector('[data-attribute-picker="feature"]')!
                        .parentElement!.classList.contains("modifier-helper-wide")
                ).to.equal(false);
                changeField(row, "[name=modifierValue]", "3");
                changeField(row, "[data-attribute=feature]", "Dornen");
                expect(preview()).to.include(`${path} feature="Dornen" +1`);
                expect(row.querySelector<HTMLElement>(".modifier-helper-value")!.hidden).to.equal(true);
                changeField(row, "[data-attribute=feature]", "Scharf");
                expect(row.querySelector<HTMLInputElement>("[name=modifierValue]")!.value).to.equal("3");
                changeField(row, "[name=modifierValue]", "");
                await finish();
                expect(apply.called).to.equal(false);
                expect(dom.window.document.activeElement).to.equal(row.querySelector("[name=modifierValue]"));
                changeField(row, "[data-attribute=feature]", "Dornen");
                await add();
                await edit(0);
                expect(root.querySelector<HTMLInputElement>("[name=modifierValue]")!.required).to.equal(false);
                expect(root.querySelector<HTMLElement>(".modifier-helper-value")!.hidden).to.equal(true);
                expect(root.querySelector<HTMLElement>("[data-feature-row] .modifier-helper-value")!.hidden).to.equal(
                    true
                );
                expect(
                    root.querySelector<HTMLInputElement>("[data-feature-row] [name=modifierValue]")!.required
                ).to.equal(false);
                await finish();
                expect(
                    apply.calledOnceWithExactly(`${path} feature="Wuchtig" +1, ${path} feature="Dornen" +1`)
                ).to.equal(true);
            });

            it(`builds ${path} rows with independent values and shared filters, then restores them for editing`, async () => {
                await selectGroup(path);
                changeField(root, "[data-attribute=feature]", "Scharf");
                changeValue("2");
                changeField(root, "[data-attribute=item]", "Sword, Shield");
                changeField(root, "[data-attribute=itemType]", "weapon");
                changeField(root, "[data-attribute=skill]", "blades");
                expect(root.querySelector("[data-action=addFeature]")).not.to.equal(null);
                await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                const row = root.querySelector<HTMLElement>("[data-feature-row]")!;
                const extraFeature = row.querySelector<HTMLElement>('[data-attribute-picker="feature"]')!;
                expect(extraFeature.parentElement!.querySelector(".modifier-helper-hint")).to.equal(null);
                const firstFeature = root.querySelector<HTMLElement>('[data-attribute-picker="feature"]')!;
                expect(firstFeature.parentElement!.querySelector(".modifier-helper-hint")!.textContent).not.to.equal(
                    ""
                );
                expect(dom.window.document.activeElement).to.equal(row.querySelector("summary"));
                const count = render.callCount;
                changeField(row, "[data-attribute=feature]", "Kritisch");
                changeField(row, "[name=modifierValue]", "3");
                const raw = `${path} feature="Scharf" item="Sword, Shield" itemType="weapon" skill="blades" +2, ${path} feature="Kritisch" item="Sword, Shield" itemType="weapon" skill="blades" +3`;
                expect(preview()).to.equal(raw);
                expect(render.callCount).to.equal(count);
                await add();
                await selectGroup("speed");
                changeValue("1");
                await add();
                await edit(0);
                expect(root.querySelectorAll("[data-feature-row]")).to.have.length(1);
                expect(
                    root.querySelector<HTMLInputElement>("[data-feature-row] [data-attribute=feature]")!.value
                ).to.equal("Kritisch");
                expect(root.querySelector<HTMLInputElement>("[data-feature-row] [name=modifierValue]")!.value).to.equal(
                    "3"
                );
                changeValue("4");
                await finish();
                expect(apply.calledOnceWithExactly(`${raw.replace(" +2,", " +4,")}, speed +1`)).to.equal(true);
            });

            it(`${path}: validates each feature row, focuses its visible picker and removes unfinished rows without losing other input`, async () => {
                await selectGroup(path);
                changeField(root, "[data-attribute=feature]", "Scharf");
                changeValue("2");
                await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                let row = root.querySelector<HTMLElement>("[data-feature-row]")!;
                const primary = root.querySelector<HTMLElement>('[data-attribute-picker="feature"] summary')!;
                await finish();
                expect(apply.called).to.equal(false);
                expect(dom.window.document.activeElement).to.equal(row.querySelector("summary"));
                expect(primary.getAttribute("aria-invalid")).to.equal("false");
                changeField(row, "[data-attribute=feature]", "Kritisch");
                await finish();
                expect(dom.window.document.activeElement).to.equal(row.querySelector("[name=modifierValue]"));
                changeField(row, "[name=modifierValue]", "2,3");
                expect(
                    row.querySelector<HTMLElement>(".modifier-helper-value .modifier-helper-error")!.textContent
                ).to.equal(localize("splittermond.modifierHelper.errors.valueSyntax"));
                changeField(row, "[name=modifierValue]", "3");
                await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                const rows = root.querySelectorAll<HTMLElement>("[data-feature-row]");
                row = rows[1];
                const ids = [...root.querySelectorAll<HTMLElement>("[id]")].map((element) => element.id);
                expect(new Set(ids).size).to.equal(ids.length);
                for (const element of root.querySelectorAll("[aria-describedby], [aria-errormessage]")) {
                    for (const attribute of ["aria-describedby", "aria-errormessage"])
                        for (const id of element.getAttribute(attribute)?.split(" ") ?? [])
                            expect(root.querySelector(`[id="${id}"]`), id).not.to.equal(null);
                }
                await ModifierHelper.DEFAULT_OPTIONS.actions.removeFeature.call(
                    helper,
                    new dom.window.Event("click"),
                    row.querySelector<HTMLElement>("[data-action=removeFeature]")!
                );
                expect(root.querySelectorAll("[data-feature-row]")).to.have.length(1);
                expect(dom.window.document.activeElement).to.equal(root.querySelector("[data-action=addFeature]"));
                await finish();
                expect(
                    apply.calledOnceWithExactly(`${path} feature="Scharf" +2, ${path} feature="Kritisch" +3`)
                ).to.equal(true);
            });

            it(`${path}: keeps rapid feature additions while rendering is delayed and clears them on changing modifier family`, async () => {
                await selectGroup(path);
                changeField(root, "[data-attribute=feature]", "Scharf");
                changeValue("2");
                let release: () => void = () => {};
                const pending = new Promise<void>((resolve) => (release = resolve));
                render.callsFake(async () => {
                    await pending;
                    const context = await helper._prepareContext({});
                    root.innerHTML = createHtml("templates/apps/modifier-helper.hbs", context);
                    await helper._onRender(context);
                    return helper;
                });
                const first = ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                const second = ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                release();
                await Promise.all([first, second]);
                expect(root.querySelectorAll("[data-feature-row]")).to.have.length(2);
                expect(root.querySelector<HTMLInputElement>("[name=modifierValue]")!.value).to.equal("2");
                await selectGroup(path === "item.addFeature" ? "item.mergeFeature" : "item.addFeature");
                expect(root.querySelector("[data-feature-row]")).to.equal(null);
                expect(root.querySelector("[data-action=addFeature]")).not.to.equal(null);
                await selectGroup("speed");
                expect(root.querySelector("[data-feature-row]")).to.equal(null);
                expect(root.querySelector("[data-action=addFeature]")).to.equal(null);
            });

            for (const action of ["addFeature", "removeFeature"] as const) {
                it(`${path}: completes ${action} when its focus target disappears during a modifier-family change`, async () => {
                    await selectGroup(path);
                    await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                    const removeButton = root.querySelector<HTMLElement>("[data-action=removeFeature]")!;
                    let release: () => void = () => {};
                    const pending = new Promise<void>((resolve) => (release = resolve));
                    render.callsFake(async () => {
                        await pending;
                        const context = await helper._prepareContext({});
                        root.innerHTML = createHtml("templates/apps/modifier-helper.hbs", context);
                        await helper._onRender(context);
                        return helper;
                    });
                    const updating =
                        action === "addFeature"
                            ? ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper)
                            : ModifierHelper.DEFAULT_OPTIONS.actions.removeFeature.call(
                                  helper,
                                  new dom.window.Event("click"),
                                  removeButton
                              );
                    const switching = selectGroup("speed");
                    release();
                    await Promise.all([updating, switching]);
                    expect(root.querySelector("[data-feature-row], [data-action=addFeature]")).to.equal(null);
                    changeValue("3");
                    expect(preview()).to.equal("speed +3");
                });
            }
        }

        it("stages modifiers without applying, edits an earlier entry, and submits one comma-separated list", async () => {
            await add();
            expect(apply.called).to.equal(false);
            expect(root.querySelector("[name=modifierValue]")).to.equal(null);
            expect(preview()).to.equal("defense +2");
            await selectGroup("speed");
            changeValue("3");
            await add();
            await edit(0);
            changeValue("5");
            expect(preview()).to.equal("defense +5, speed +3");
            await finish();
            expect(apply.calledOnceWithExactly("defense +5, speed +3")).to.equal(true);
        });

        it("preserves an unfinished entry until it is corrected or explicitly removed", async () => {
            await add();
            await selectGroup("speed");
            const input = root.querySelector<HTMLInputElement>("[name=modifierValue]")!;
            await edit(0);
            expect(root.querySelector("[name=modifierValue]")).to.equal(input);
            expect(input.getAttribute("aria-invalid")).to.equal("true");
            expect(apply.called).to.equal(false);
            await remove(1);
            expect(preview()).to.equal("defense +2");
            await finish();
            expect(apply.calledOnceWithExactly("defense +2")).to.equal(true);
        });

        it("keeps the edited entry aligned after removing an earlier entry", async () => {
            await add();
            await selectGroup("speed");
            changeValue("3");
            await add();
            await edit(1);
            changeValue("4");
            await remove(0);
            expect(preview()).to.equal("speed +4");
            await finish();
            expect(apply.calledOnceWithExactly("speed +4")).to.equal(true);
        });

        it("includes an unfinished new slot only when it has a selected modifier", async () => {
            await add();
            expect(root.querySelector<HTMLButtonElement>("[data-action=applyModifier]")!.disabled).to.equal(false);
            await finish();
            expect(apply.calledOnceWithExactly("defense +2")).to.equal(true);
        });

        it("retains duplicate entries as independently editable drafts", async () => {
            await add();
            await selectGroup("defense");
            changeValue("2");
            await add();
            await edit(1);
            changeValue("3");
            await finish();
            expect(apply.calledOnceWithExactly("defense +2, defense +3")).to.equal(true);
        });

        it("renders comma-containing attributes and markup as literal editable text", () => {
            const output = root.querySelector<HTMLOutputElement>("output")!;
            const raw = 'item.damage item="Blade, <strong>one</strong>" +2';
            renderModifierDrafts(output, [
                { value: raw, index: 0, active: false },
                { value: "focus.reduction K1V1", index: 1, active: true },
            ]);
            expect(output.value).to.equal(`${raw}, focus.reduction K1V1`);
            expect(output.querySelector("strong")).to.equal(null);
            expect(parseModifiers(output.value).modifiers).to.have.length(2);
        });
    });
});
