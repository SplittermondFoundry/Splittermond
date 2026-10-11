import { expect } from "chai";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import { attributeChoices } from "module/modifierHelper/catalogue";
import { buildModifier } from "module/modifierHelper/buildModifier";
import { ModifierHelper } from "module/modifierHelper/ModifierHelper";
import { createHtml } from "../../../handlebarHarness";
import { foundryApi } from "module/api/foundryApi";
import { buildFeatureAdjustment, defaultFeatureAdjustment } from "module/modifierHelper/featureAdjustments";
import { validFeatureCount } from "module/modifierHelper/featureImprovementRules";
import { source, module, definitions, localize, definition, setupModifierHelperTests } from "./testUtils";

describe("Modifier helper", () => {
    const sandbox = setupModifierHelperTests();

    it("builds the mechanical critical improvement alongside its descriptive feature", async () => {
        const helper = new ModifierHelper({
            definitions,
            initial: 'item.mergeFeature feature="Verbesserter Kritischer Schaden" item="Schwert" +1',
            multiple: true,
            validate: () => [],
            apply: () => true,
        });
        const context = await helper._prepareContext({});
        const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
        Object.defineProperty(helper, "element", { value: dom.window.document.body });
        try {
            await helper._onRender(context);
            expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(
                'item.mergeFeature feature="Verbesserter Kritischer Schaden" item="Schwert" +1, item.addFeature feature="Kritisch" item="Schwert" +2'
            );
        } finally {
            dom.window.close();
        }
    });

    describe("feature improvement effects", () => {
        const restrictions = [
            ["Gehärtet", ["armor", "shield"]],
            ["Stabil", ["armor"]],
            ["Wattiert", ["armor"]],
            ["Bequem", ["armor"]],
            ["Standfestigkeit", ["armor"]],
            ["Halterung", ["shield"]],
            ["Deckung", ["shield"]],
            ["Dornen", ["shield"]],
            ["Schildwall", ["shield"]],
            ["Verbesserter Entwaffnungsschutz", ["weapon"]],
            ["Reduzierte Waffengeschwindigkeit", ["weapon"]],
            ["Verbesserte Schärfe", ["weapon"]],
            ["Verbesserter Kritischer Schaden", ["weapon"]],
            ["Verbesserte Exaktheit", ["weapon"]],
            ["Ferndistanz", ["weapon"]],
            ["Paarwaffe", ["weapon"]],
            ["Treffsicher", ["weapon"]],
            ["Verbessertes Ablenken", ["weapon"]],
            ["Verbesserte Defensive", ["weapon", "shield"]],
        ] as const;
        for (const type of ["weapon", "armor", "shield"] as const) {
            for (const path of ["item.addFeature", "item.mergeFeature"]) {
                it(`${path}: defaults the ${type} name and filters both primary and additional feature choices`, async () => {
                    const helper = new ModifierHelper({
                        definitions,
                        initial: "",
                        multiple: true,
                        target: { name: "Testobjekt", type },
                        validate: () => [],
                        apply: () => true,
                    });
                    const dom = new JSDOM();
                    const root = dom.window.document.body;
                    Object.defineProperty(helper, "element", { value: root });
                    const render = sandbox.stub(helper, "render").callsFake(async () => {
                        const context = await helper._prepareContext({});
                        root.innerHTML = createHtml("templates/apps/modifier-helper.hbs", context);
                        await helper._onRender(context);
                        return helper;
                    });
                    try {
                        await helper.render();
                        root.querySelector<HTMLElement>(`[data-modifier-path="${path}"]`)!.click();
                        await render.lastCall.returnValue;
                        expect(root.querySelector<HTMLInputElement>("[data-attribute=item]")!.value).to.equal(
                            "Testobjekt"
                        );
                        await ModifierHelper.DEFAULT_OPTIONS.actions.addFeature.call(helper);
                        const pickers = [...root.querySelectorAll('[data-attribute-picker="feature"]')];
                        expect(pickers).to.have.length(2);
                        for (const picker of pickers) {
                            const choices = [...picker.querySelectorAll<HTMLElement>("[data-picker-value]")].map(
                                (option) => option.dataset.pickerValue
                            );
                            for (const [feature, types] of restrictions)
                                expect(choices.includes(feature), `${type}: ${feature}`).to.equal(
                                    types.some((allowed) => allowed === type)
                                );
                            expect(choices).to.include("Kälteschutz");
                            expect(choices).not.to.include("Behinderung");
                        }
                        const item = root.querySelector<HTMLInputElement>("[data-attribute=item]")!;
                        item.value = "";
                        item.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
                        await helper.render();
                        expect(root.querySelector<HTMLInputElement>("[data-attribute=item]")!.value).to.equal("");
                    } finally {
                        dom.window.close();
                    }
                });
            }
        }
        it("preserves existing unfiltered and legacy feature input without narrowing it to the current item", async () => {
            for (const feature of ["Behinderung", "Gehärtet", "Reduzierte Last"]) {
                const helper = new ModifierHelper({
                    definitions,
                    initial: `item.addFeature feature="${feature}" +1`,
                    target: { name: "Schwert", type: "weapon" },
                    validate: () => [],
                    apply: () => true,
                });
                const context = await helper._prepareContext({});
                expect(
                    context.fields
                        .find((field) => field.key === "feature")!
                        .choices.some((choice) => choice.selected && choice.value === feature)
                ).to.equal(true);
                expect(context.fields.find((field) => field.key === "item")!.value).to.equal("");
                expect(context.preview).to.equal(`item.addFeature feature="${feature}" +1`);
            }
        });
        it("shows only the relevant manual-property warnings and omits the shield defensive prerequisite", async () => {
            for (const feature of ["Gehärtet", "Stabil", "Standfestigkeit", "Wattiert"]) {
                const helper = new ModifierHelper({
                    definitions,
                    initial: `item.addFeature feature="${feature}" +1`,
                    multiple: true,
                    validate: () => [],
                    apply: () => true,
                });
                const context = await helper._prepareContext({});
                expect(context.adjustment?.automatic).to.equal(false);
                const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
                try {
                    const hint = dom.window.document.querySelector("[data-feature-adjustment]")!;
                    expect(localize(context.adjustment!.hint)).to.include("Gegenstandseigenschaften manuell");
                    expect(hint.textContent).to.include(context.adjustment!.hint);
                    expect(hint.querySelector("input")).to.equal(null);
                } finally {
                    dom.window.close();
                }
            }
            for (const type of ["weapon", "shield"] as const) {
                const helper = new ModifierHelper({
                    definitions,
                    initial: 'item.addFeature feature="Verbesserte Defensive" +1',
                    target: { name: "Objekt", type },
                    validate: () => [],
                    apply: () => true,
                });
                const context = await helper._prepareContext({});
                expect(localize(context.adjustment!.hint).includes("Defensiv")).to.equal(type === "weapon");
            }
        });
        for (const path of ["item.addFeature", "item.mergeFeature"]) {
            for (const [feature, maximum] of [
                ["Kälteschutz", 2],
                ["Verbesserter Entwaffnungsschutz", 2],
                ["Fertigkeitsbonus", 3],
                ["Schutz vor Schadensarten", 3],
            ] as const) {
                it(`offers bounded feature levels for ${feature} in ${path}`, async () => {
                    const helper = new ModifierHelper({
                        definitions,
                        initial: `${path} feature="${feature}" +1`,
                        multiple: true,
                        validate: () => [],
                        apply: () => true,
                    });
                    const dom = new JSDOM(
                        createHtml("templates/apps/modifier-helper.hbs", await helper._prepareContext({}))
                    );
                    try {
                        const value =
                            dom.window.document.querySelector<HTMLSelectElement>("select[name=modifierValue]");
                        expect(value).not.to.equal(null);
                        expect([...value!.options].map((option) => option.value)).to.deep.equal([
                            "",
                            ...Array.from({ length: maximum }, (_, index) => String(index + 1)),
                        ]);
                        expect(value!.value).to.equal("1");
                    } finally {
                        dom.window.close();
                    }
                });
            }
        }
        it("omits non-feature property improvements from new feature suggestions", () => {
            const choices = attributeChoices(definition("item.addFeature"), "feature").map(({ value }) => value);
            for (const name of [
                "Behinderung",
                "Erhöhte Schadensreduktion",
                "Erhöhter Waffenschaden",
                "Reduzierte Behinderung",
                "Reduzierter Tick-Zuschlag",
                "Reduzierte Last",
                "Erhöhte Härte",
            ])
                expect(choices, name).not.to.include(name);
        });
        it("retains an unsupported old feature level visibly but requires a supported choice before applying", async () => {
            const apply = sinon.spy((_raw: string) => true);
            const helper = new ModifierHelper({
                definitions,
                initial: 'item.addFeature feature="Kälteschutz" +4',
                multiple: true,
                validate: () => [],
                apply,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            sandbox.stub(helper, "close").resolves();
            sandbox.stub(foundryApi, "warnUser");
            try {
                await helper._onRender(context);
                const value = helper.element.querySelector<HTMLSelectElement>("[name=modifierValue]")!;
                expect(value.value).to.equal("4");
                expect(value.selectedOptions[0].disabled).to.equal(true);
                await ModifierHelper.DEFAULT_OPTIONS.actions.applyModifier.call(helper);
                expect(apply.called).to.equal(false);
                value.value = "2";
                value.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
                await ModifierHelper.DEFAULT_OPTIONS.actions.applyModifier.call(helper);
                expect(apply.firstCall.args[0]).to.equal('item.addFeature feature="Kälteschutz" +2, handicap +2');
            } finally {
                dom.window.close();
            }
        });
        const cases = [
            [
                "Verbesserte Defensive",
                "1",
                'item.addFeature feature="Defensiv" item="Schwert" itemType="weapon" skill="blades" +1',
            ],
            [
                "Verbesserte Exaktheit",
                "1",
                'item.addFeature feature="Exakt" item="Schwert" itemType="weapon" skill="blades" +1',
            ],
            [
                "Verbesserte Schärfe",
                "1",
                'item.mergeFeature feature="Scharf" item="Schwert" itemType="weapon" skill="blades" +2',
            ],
            [
                "Verbesserter Entwaffnungsschutz",
                "2",
                'item.addFeature feature="Entwaffnungsschutz" item="Schwert" itemType="weapon" skill="blades" +2',
            ],
            [
                "Verbesserter Kritischer Schaden",
                "1",
                'item.addFeature feature="Kritisch" item="Schwert" itemType="weapon" skill="blades" +2',
            ],
            [
                "Verbessertes Ablenken",
                "1",
                'item.addFeature feature="Ablenkend" item="Schwert" itemType="weapon" skill="blades" +1',
            ],
            [
                "Reduzierte Waffengeschwindigkeit",
                "1",
                'item.weaponspeed item="Schwert" itemType="weapon" skill="blades" -1',
            ],
            ["Kälteschutz", "2", "handicap +2"],
            ["Fertigkeitsbonus", "3", 'actor.skills skill="acrobatics" emphasis="Balance" +3'],
            ["Schutz vor Schadensarten", "3", "resistance.fire +3"],
        ];
        for (const [feature, value, expected] of cases) {
            it(`builds an accepted mechanical effect for ${feature} without copying inapplicable object filters`, () => {
                const input = defaultFeatureAdjustment(true);
                input.attributes = {
                    ...input.attributes,
                    skill: "acrobatics",
                    emphasis: "Balance",
                    damageType: "fire",
                };
                const result = buildFeatureAdjustment(
                    { value, attributes: { feature, item: "Schwert", itemType: "weapon", skill: "blades" } },
                    input,
                    definitions
                );
                expect(result).to.equal(expected);
                expect(module.addModifier(source, result!, "innate").diagnostics ?? []).to.be.empty;
                input.enabled = false;
                expect(buildFeatureAdjustment({ value, attributes: { feature } }, input, definitions)).to.equal("");
            });
        }
        for (const feature of ["Gehärtet", "Stabil", "Standfestigkeit", "Wattiert", "Wuchtig", "Extension feature"]) {
            it(`does not invent a mechanical replacement for ${feature}`, () => {
                expect(
                    buildFeatureAdjustment(
                        { value: "1", attributes: { feature } },
                        defaultFeatureAdjustment(true),
                        definitions
                    )
                ).to.equal("");
            });
        }
        for (const [feature, maximum] of [
            ["Verbesserter Entwaffnungsschutz", 2],
            ["Kälteschutz", 2],
            ["Fertigkeitsbonus", 3],
            ["Schutz vor Schadensarten", 3],
        ] as const) {
            it(`accepts supported counts and rejects invalid or excessive counts for ${feature}`, () => {
                for (const count of ["", "0", "-1", "1.5", "nonsense", "${attributes.strength.value}"])
                    expect(validFeatureCount(feature, count), count).to.equal(false);
                expect(validFeatureCount(feature, "1")).to.equal(true);
                expect(validFeatureCount(feature, "2")).to.equal(true);
                expect(validFeatureCount(feature, String(maximum))).to.equal(true);
                expect(validFeatureCount(feature, String(maximum + 1))).to.equal(false);
            });
        }
        for (const [die, current, target] of [
            ["6", "0", 2],
            ["6", "1", 2],
            ["6", "2", 3],
            ["10", "3", 4],
            ["10", "4", 5],
        ] as const) {
            it(`sets sharpness ${current} to ${target} for W${die} without the add/merge minimum-three trap`, () => {
                const input = defaultFeatureAdjustment(true);
                input.attributes = { currentLevel: current, die };
                expect(
                    buildFeatureAdjustment(
                        { value: "1", attributes: { feature: "Verbesserte Schärfe" } },
                        input,
                        definitions
                    )
                ).to.equal(`item.mergeFeature feature="Scharf" +${target}`);
            });
        }
        for (const [die, current] of [
            ["6", "3"],
            ["10", "5"],
            ["6", "-1"],
            ["6", "1.5"],
            ["6", ""],
            ["8", "1"],
        ]) {
            it(`rejects unsupported sharpness ${current} for W${die}`, () => {
                const input = defaultFeatureAdjustment(true);
                input.attributes = { currentLevel: current, die };
                const error = sinon.spy();
                expect(
                    buildFeatureAdjustment(
                        { value: "1", attributes: { feature: "Verbesserte Schärfe" } },
                        input,
                        definitions,
                        error
                    )
                ).to.equal(null);
                expect(error.firstCall.args[0]).to.equal("currentLevel");
            });
        }
        for (const attributes of [{}, { skill: "acrobatics" }, { emphasis: "Balance" }]) {
            it(`requires both skill and emphasis for Fertigkeitsbonus: ${JSON.stringify(attributes)}`, () => {
                const input = defaultFeatureAdjustment(true);
                Object.assign(input.attributes, attributes);
                expect(
                    buildFeatureAdjustment(
                        { value: "1", attributes: { feature: "Fertigkeitsbonus" } },
                        input,
                        definitions
                    )
                ).to.equal(null);
            });
        }
        it("requires a damage type for protection and refuses an unregistered mechanical path", () => {
            const input = defaultFeatureAdjustment(true);
            expect(
                buildFeatureAdjustment(
                    { value: "1", attributes: { feature: "Schutz vor Schadensarten" } },
                    input,
                    definitions
                )
            ).to.equal(null);
            expect(
                buildFeatureAdjustment(
                    { value: "1", attributes: { feature: "Verbesserter Kritischer Schaden" } },
                    input,
                    definitions.filter((entry) => entry.path !== "item.addFeature")
                )
            ).to.equal(null);
        });
        it("keeps the single-effect contract while showing prerequisites and manual limitations", async () => {
            for (const feature of ["Verbesserte Defensive", "Gehärtet", "Kälteschutz"]) {
                const helper = new ModifierHelper({
                    definitions,
                    initial: `item.addFeature feature="${feature}" +1`,
                    validate: () => [],
                    apply: () => true,
                });
                const context = await helper._prepareContext({});
                const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
                Object.defineProperty(helper, "element", { value: dom.window.document.body });
                try {
                    await helper._onRender(context);
                    expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(
                        `item.addFeature feature="${feature}" +1`
                    );
                    expect(context.adjustment?.hint).not.to.equal(undefined);
                    const checkbox = helper.element.querySelector<HTMLInputElement>("[data-adjustment-enabled]");
                    if (checkbox) {
                        expect(checkbox.disabled).to.equal(true);
                        expect(checkbox.checked).to.equal(false);
                    }
                } finally {
                    dom.window.close();
                }
            }
        });
    });

    for (const path of ["item.addFeature", "item.mergeFeature"]) {
        for (const [feature, hidden] of [
            ["Wuchtig", true],
            ["Scharf", false],
            ["Fremdmerkmal", false],
        ] as const) {
            it(`restores ${path} with ${feature}, hides only unscaled value controls and retains the value for scaled choices`, async () => {
                const initial = `${path} feature="${feature}" +3`;
                const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
                const context = await helper._prepareContext({});
                const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
                Object.defineProperty(helper, "element", { value: dom.window.document.body });
                try {
                    expect(helper.element.querySelector<HTMLElement>(".modifier-helper-value")!.hidden).to.equal(
                        hidden
                    );
                    await helper._onRender(context);
                    expect(helper.element.querySelector<HTMLElement>(".modifier-helper-value")!.hidden).to.equal(
                        hidden
                    );
                    expect(helper.element.querySelector<HTMLInputElement>("[name=modifierValue]")!.value).to.equal("3");
                    expect(helper.element.querySelector<HTMLOutputElement>("output")!.value).to.equal(
                        hidden ? `${path} feature="${feature}" +1` : initial
                    );
                } finally {
                    dom.window.close();
                }
            });
        }
        for (const feature of ["Wuchtig", "Dornen"]) {
            it(`uses +1 for ${path} with ${feature} regardless of the unused value field`, () => {
                const entry = definition(path);
                const raw = buildModifier(entry, { value: "", attributes: { feature } });
                expect(raw).to.equal(`${path} feature="${feature}" +1`);
                expect(module.addModifier(source, raw!, "innate").diagnostics ?? []).to.be.empty;
                for (const value of ["3", "0", "2,3"])
                    expect(buildModifier(entry, { value, attributes: { feature } })).to.equal(raw);
            });
        }
        for (const feature of ["Scharf", "Fremdmerkmal"]) {
            it(`still requires an explicit value for ${path} with ${feature}`, () => {
                expect(buildModifier(definition(path), { value: "", attributes: { feature } })).to.equal(null);
            });
        }
    }
});
