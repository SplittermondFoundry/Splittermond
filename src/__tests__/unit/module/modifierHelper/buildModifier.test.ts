import { expect } from "chai";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import { buildModifier, readModifierInput } from "module/modifierHelper/buildModifier";
import { ModifierHelper } from "module/modifierHelper/ModifierHelper";
import { createHtml } from "../../../handlebarHarness";
import { foundryApi } from "module/api/foundryApi";
import { parseModifiers } from "module/modifiers/parsing";
import { parseFeatures } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { syncEvaluate } from "module/modifiers/expressions/scalar";
import { source, module, definitions, localize, definition, setupModifierHelperTests } from "./testUtils";

describe("Modifier helper", () => {
    const sandbox = setupModifierHelperTests();

    for (const [raw, attribute] of [
        ['item.damage item="Test" spellType="fire" +2', "spellType"],
        ['item.damage skill="acrobatics" spellType="fire" +2', "skill"],
        ['check.require skill="acrobatics"', "rollType"],
        ["defense nonsense", "value"],
    ]) {
        it(`identifies the invalid field ${attribute} without notifying the owner`, () => {
            const report = sandbox.stub(foundryApi, "reportError");
            const result = module.addModifier(source, raw, "innate");
            expect(result.hasErrors).to.equal(true);
            expect(result).to.have.nested.property("diagnostics[0].attribute", attribute);
            expect(report.called).to.equal(false);
        });
    }

    it("preserves commas, spaces and an embedded quote in a text attribute", () => {
        const text = 'Schwert "Nord", alt';
        const raw = buildModifier(definition("item.damage"), { value: "2", attributes: { item: text } });
        expect(raw).not.to.be.null;
        const parsed = parseModifiers(raw!);
        expect(parsed.errors).to.deep.equal([]);
        expect(parsed.modifiers).to.have.length(1);
        expect(parsed.modifiers[0].attributes.item).to.equal(text);
    });

    for (const path of ["item.addFeature", "item.mergeFeature"]) {
        for (const value of ["-2", "1.5", "-0.5", "0"]) {
            it(`rejects the unsupported literal feature level ${path} ${value}`, () => {
                const error = sinon.spy();
                expect(buildModifier(definition(path), { value, attributes: { feature: "Scharf" } }, error)).to.equal(
                    null
                );
                expect(
                    error.calledOnceWithExactly("value", "splittermond.modifierHelper.errors.featureLevel")
                ).to.equal(true);
                expect(localize(error.firstCall.args[1])).not.to.include("splittermond.");
            });
        }

        for (const value of ["1", "2", "+3", "3.0"]) {
            it(`retains the literal feature level ${path} ${value} through the feature consumer`, () => {
                const raw = buildModifier(definition(path), { value, attributes: { feature: "Scharf" } });
                expect(raw).not.to.equal(null);
                const result = module.addModifier(source, raw!, "innate");
                expect(result.hasErrors).to.equal(false);
                const modifier = result.modifiers[0].modifier;
                expect(parseFeatures(`${modifier.attributes.feature} ${syncEvaluate(modifier.value)}`)).to.deep.equal([
                    { name: "Scharf", value: Number(value) },
                ]);
            });
        }

        it(`preserves a deferred feature reference for ${path}`, () => {
            const value = "${attributes.strength.value}";
            const raw = buildModifier(definition(path), { value, attributes: { feature: "Scharf" } });
            expect(raw).to.equal(`${path} feature="Scharf" ${value}`);
            expect(module.addModifier(source, raw!, "innate").hasErrors).to.equal(false);
        });
    }

    for (const value of ["1.5", "-0.5", "+2.25", "1e-1"]) {
        it(`rejects fractional magic fumble table steps: ${value}`, () => {
            const error = sinon.spy();
            expect(buildModifier(definition("lowerfumbleresult"), { value, attributes: {} }, error)).to.equal(null);
            expect(error.calledOnceWithExactly("value", "splittermond.modifierHelper.errors.fumbleLevels")).to.equal(
                true
            );
            expect(localize(error.firstCall.args[1])).not.to.include("splittermond.");
        });
    }

    for (const value of ["1", "-2", "+3", "3.0", "${attributes.strength.value}", "1W6"]) {
        it(`preserves supported magic fumble values: ${value}`, () => {
            const raw = buildModifier(definition("lowerfumbleresult"), { value, attributes: { skill: "arcanelore" } });
            expect(raw).not.to.equal(null);
            expect(module.addModifier(source, raw!, "innate").hasErrors).to.equal(false);
        });
    }

    for (const value of ["", "2, defense 99", "2 skill=acrobatics", '"2" emphasis="hidden"']) {
        it(`rejects missing values or injected modifiers: ${value}`, () => {
            expect(buildModifier(definition("defense"), { value, attributes: {} })).to.equal(null);
        });
    }

    for (const item of ["both \" and '", "key=value", "two\nlines", "123"]) {
        it(`rejects attributes which cannot round-trip through the parser: ${JSON.stringify(item)}`, () => {
            expect(buildModifier(definition("item.damage"), { value: "2", attributes: { item } })).to.equal(null);
        });
    }

    for (const [path, value, attributes, attribute] of [
        ["resistance", "2", {}, "damageType"],
        ["check.require", "", {}, "rollType"],
        ["defense", "", {}, "value"],
        ["defense", "2, defense 99", {}, "value"],
        ["focus.reduction", "K1V5", {}, "value"],
        ["lowerfumbleresult", "1.5", {}, "value"],
        ["item.damage", "2", { item: "123" }, "item"],
    ] as const) {
        it(`locates an unrepresentable ${path} input in the ${attribute} field`, () => {
            const error = sinon.spy();
            expect(buildModifier(definition(path), { value, attributes }, error)).to.equal(null);
            expect(error.calledOnce).to.equal(true);
            expect(error.firstCall.args[0]).to.equal(attribute);
            expect(localize(error.firstCall.args[1])).not.to.include("splittermond.");
        });
    }

    it("requires mandatory attributes and omits the value for check.require", () => {
        expect(buildModifier(definition("check.require"), { value: "2", attributes: {} })).to.equal(null);
        const raw = buildModifier(definition("check.require"), {
            value: "ignored",
            attributes: { rollType: "standard" },
        });
        expect(parseModifiers(raw!).modifiers[0].attributes).to.deep.equal({ rollType: "standard" });
    });

    for (const [path, value, expected] of [
        ["defense", "2", "defense +2"],
        ["defense", "-2", "defense -2"],
        ["defense", "-0.5", "defense -0.5"],
        ["speed.multiplier", "0.5", "speed.multiplier 0.5"],
        ["focus.reduction", "K1V1", "focus.reduction K1V1"],
        ["item.damage", "2W6+1", "item.damage 2W6+1"],
    ]) {
        it(`uses the familiar trailing value notation for ${path} ${value}`, () => {
            const raw = buildModifier(definition(path), { value, attributes: {} });
            expect(raw).to.equal(expected);
            expect(module.addModifier(source, raw!, "innate").hasErrors).to.equal(false);
        });
    }

    for (const initial of [
        "defense +2",
        "item.damage 2W6+1",
        "defense ${attributes.strength.value}",
        "focus.reduction K1V1",
    ]) {
        it(`uses one value control for ${initial} without a mode switch`, async () => {
            const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            try {
                const input = dom.window.document.querySelector<HTMLInputElement>("[name=modifierValue]")!;
                expect(input.type).to.equal("text");
                expect(input.value).to.equal(context.value);
                expect(dom.window.document.querySelector("[name=valueMode]")).to.equal(null);
                expect(module.addModifier(source, context.preview, "innate").hasErrors).to.equal(false);
            } finally {
                dom.window.close();
            }
        });
    }

    describe("wound level choices", () => {
        for (const value of ["1", "3", "5", "+3", "3.0"]) {
            it(`restores ${value} in a fixed choice control and builds all supported counts`, async () => {
                const helper = new ModifierHelper({
                    definitions,
                    initial: `actor.woundMalus.nbrLevels ${value}`,
                    validate: () => [],
                    apply: () => true,
                });
                const context = await helper._prepareContext({});
                const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
                Object.defineProperty(helper, "element", { value: dom.window.document.body });
                try {
                    await helper._onRender(context);
                    const select = helper.element.querySelector<HTMLSelectElement>("select[name=modifierValue]")!;
                    expect(select, "fixed value selection").not.to.equal(null);
                    expect(helper.element.querySelector("input[name=modifierValue]")).to.equal(null);
                    expect(
                        [...select.options]
                            .filter((option) => option.value && !option.disabled)
                            .map((option) => option.value)
                    ).to.deep.equal(["1", "3", "5"]);
                    expect(select.value).to.equal(String(Number(value)));
                    expect(select.querySelector('[value="1"]')!.textContent).to.include("Zerbrechlich");
                    expect(select.querySelector('[value="3"]')!.textContent).to.include("Schwächlich");
                    for (const count of ["1", "3", "5"]) {
                        select.value = count;
                        select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
                        const raw = helper.element.querySelector<HTMLOutputElement>("output")!.value;
                        expect(raw).to.equal(`actor.woundmalus.nbrLevels +${count}`);
                        expect(module.addModifier(source, raw, "innate").hasErrors).to.equal(false);
                    }
                } finally {
                    dom.window.close();
                }
            });
        }

        for (const value of ["0", "2", "4", "-1", "3.5", "1+2", "${attributes.strength.value}"]) {
            it(`rejects unsupported helper input ${value} on both aliases`, () => {
                for (const path of ["woundmalus.nbrLevels", "actor.woundmalus.nbrLevels"]) {
                    const errors = sinon.spy();
                    expect(buildModifier(definition(path), { value, attributes: {} }, errors)).to.equal(null);
                    expect(errors.calledWith("value", "splittermond.modifierHelper.errors.valueChoice")).to.equal(true);
                }
            });
        }

        it("preserves an unsupported existing value visibly and blocks applying until a valid count is chosen", async () => {
            const apply = sinon.spy((_raw: string) => true);
            const helper = new ModifierHelper({
                definitions,
                initial: "woundmalus.nbrLevels 2",
                validate: () => [],
                apply,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(helper, "close").resolves();
            try {
                await helper._onRender(context);
                const select = helper.element.querySelector<HTMLSelectElement>("select[name=modifierValue]")!;
                expect(select, "fixed value selection").not.to.equal(null);
                expect(select.value).to.equal("2");
                expect(select.selectedOptions[0].disabled).to.equal(true);
                expect(select.getAttribute("aria-invalid")).to.equal("true");
                await ModifierHelper.DEFAULT_OPTIONS.actions.applyModifier.call(helper);
                expect(apply.called).to.equal(false);
                select.value = "3";
                select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
                expect(select.getAttribute("aria-invalid")).to.equal("false");
                await ModifierHelper.DEFAULT_OPTIONS.actions.applyModifier.call(helper);
                expect(apply.calledOnceWithExactly("actor.woundmalus.nbrLevels +3")).to.equal(true);
            } finally {
                dom.window.close();
            }
        });
    });

    for (const value of ["nonsense", "K1V5", "K0", "1V3"]) {
        it(`rejects malformed cost input instead of silently producing zero: ${value}`, () => {
            expect(buildModifier(definition("focus.reduction"), { value, attributes: {} })).to.equal(null);
        });
    }

    it("restores scalar, dice, cost and reference inputs for editing", () => {
        for (const value of ["-2", "2W6+1", "${attributes.strength.value}"]) {
            const entry = definition("item.damage");
            const raw = buildModifier(entry, { value, attributes: { item: "Test sword" } })!;
            const restored = readModifierInput(raw, definitions)!;
            expect(restored.definition.path).to.equal("item.damage");
            expect(restored.input.attributes.item).to.equal("Test sword");
            const rebuilt = buildModifier(entry, restored.input);
            expect(rebuilt).not.to.equal(null);
            expect(parseModifiers(rebuilt).errors).to.deep.equal([]);
        }
        expect(readModifierInput('focus.reduction skill="firemagic" value=K1V1', definitions)?.input.value).to.equal(
            "K1V1"
        );
        expect(readModifierInput("defense +2, speed +1", definitions)).to.equal(null);
    });
});
