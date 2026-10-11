import { expect } from "chai";
import { JSDOM } from "jsdom";
import { initializeModifiers } from "module/modifiers";
import { makeConfig } from "module/modifiers/ModifierConfig";
import { modifierCatalogue, attributeChoices, modifierDescription } from "module/modifierHelper/catalogue";
import { buildModifier, readModifierInput } from "module/modifierHelper/buildModifier";
import { ModifierHelper } from "module/modifierHelper/ModifierHelper";
import {
    canonicalDefinition,
    modifierGroups,
    modifierPathSteps,
    modifierCategories,
} from "module/modifierHelper/modifierGroups";
import { serialize } from "module/modifiers/expressions/scalar/serialization";
import { skillGroups } from "module/config/skillGroups";
import { createHtml } from "../../../handlebarHarness";
import { BarebonesModifierHandler } from "module/actor/modifiers/BarebonesModifierHandler";
import { damageTypes } from "module/config/damageTypes";
import { source, module, definitions, definition, sampleValue, setupModifierHelperTests } from "./testUtils";

describe("Modifier helper", () => {
    const sandbox = setupModifierHelperTests();

    for (const entry of definitions) {
        it(`describes, builds and restores the registered modifier ${entry.path}`, async () => {
            expect(entry.description, entry.path).to.be.a("string");
            expect(modifierDescription(entry)).not.to.include("splittermond.");
            const attributes = Object.fromEntries(
                entry.requiredAttributes.map((key) => [key, attributeChoices(entry, key)[0]?.value ?? "test"])
            );
            const raw = buildModifier(entry, { value: sampleValue(entry), attributes });
            expect(raw, entry.path).not.to.be.null;
            const result = module.addModifier(source, raw!, "innate");
            expect(result.hasErrors, raw!).to.equal(false);
            expect(result.modifiers.length + result.costModifiers.length, raw!).to.be.greaterThan(0);
            expect(result.costModifiers.length > 0).to.equal(entry.cost);
            const canonical = canonicalDefinition(entry, definitions);
            const group = modifierGroups(definitions).find((candidate) =>
                candidate.entries.some((leaf) => leaf.definition === canonical)
            )!;
            const leaf = group.entries.find((candidate) => candidate.definition === canonical)!;
            const steps = modifierPathSteps(group, leaf.path);
            expect(steps.every((step) => step.choices.filter((choice) => choice.selected).length === 1)).to.equal(true);
            if (steps.length)
                expect(steps[steps.length - 1].choices.find((choice) => choice.selected)?.value).to.equal(leaf.path);
            const helper = new ModifierHelper({ definitions, initial: raw!, validate: () => [], apply: () => true });
            const context = await helper._prepareContext({});
            expect(context.selectedPath).to.equal(group.path);
            expect(context.preview).to.equal(buildModifier(canonical, { value: sampleValue(entry), attributes }));
        });

        for (const key of [...entry.requiredAttributes, ...entry.optionalAttributes]) {
            const choices = attributeChoices(entry, key);
            if (!choices.length) continue;
            it(`offers accepted ${key} choices for ${entry.path}`, () => {
                for (const choice of choices) {
                    const attributes = Object.fromEntries(
                        entry.requiredAttributes.map((required) => [
                            required,
                            attributeChoices(entry, required)[0]?.value ?? "test",
                        ])
                    );
                    attributes[key] = choice.value;
                    const raw = buildModifier(entry, { value: sampleValue(entry), attributes });
                    expect(raw, `${entry.path} ${key}=${choice.value}`).not.to.be.null;
                    const result = module.addModifier(source, raw!, "innate");
                    expect(result.hasErrors, raw!).to.equal(false);
                }
            });
        }
    }

    it("discovers later handler registrations and nested attributes without a helper entry", () => {
        const added = initializeModifiers();
        const Handler = BarebonesModifierHandler({
            topLevelPath: "extension",
            hideInHelper: true,
            subSegments: {
                nested: {
                    requiredAttributes: ["newRequired"],
                    optionalAttributes: ["newOptional"],
                    requiresValue: false,
                },
            },
        });
        added.modifierRegistry.addHandler("extension", Handler);
        const discovered = modifierCatalogue(
            added.modifierRegistry.getConfigurations(() => {}, source, null),
            []
        );
        expect(discovered.map((entry) => entry.path)).to.deep.equal(["extension.nested"]);
        expect(discovered[0].requiredAttributes).to.deep.equal(["newRequired"]);
        expect(discovered[0].optionalAttributes).to.deep.equal(["newOptional"]);
        expect(discovered[0].requiresValue).to.equal(false);
    });

    it("does not inherit parent attributes onto a subpath", () => {
        const entries = modifierCatalogue(
            [makeConfig({ topLevelPath: "test", requiredAttributes: ["parentOnly"], subSegments: { child: {} } })],
            []
        );
        expect(entries[1].requiredAttributes).to.deep.equal([]);
    });

    describe("progressive path selection", () => {
        for (const [path, initial, field] of [
            ["check.require", 'check.require rollType="standard"', "rollType"],
            ["check.result", 'check.result category="success" +1', "category"],
        ]) {
            it(`offers ${path} directly under Other without a check parent or variant step`, async () => {
                const groups = modifierGroups(definitions);
                const group = groups.find((entry) => entry.path === path);
                expect(group, path).not.to.equal(undefined);
                expect(group!.category).to.equal("other");
                expect(groups.some((entry) => entry.path === "check")).to.equal(false);
                const helper = new ModifierHelper({ definitions, initial, validate: () => [], apply: () => true });
                const context = await helper._prepareContext({});
                expect(context.selectedPath).to.equal(path);
                expect(context.pathSteps).to.be.empty;
                expect(context.fields.find((entry) => entry.key === field)).to.include({
                    required: true,
                    select: true,
                });
                expect(context.requiresValue).to.equal(path === "check.result");
                expect(context.preview).to.equal(initial);
            });
        }

        for (const [path, category] of [
            ["actor.skills", "general"],
            ["actor.skills.general", "general"],
            ["actor.skills.social", "general"],
            ["actor.skills.magic", "magic"],
            ["actor.skills.fighting", "fighting"],
        ]) {
            it(`offers ${path} directly in the ${category} category without a variant step`, async () => {
                const groups = modifierGroups(definitions);
                const group = groups.find((entry) => entry.path === path);
                expect(group, path).not.to.equal(undefined);
                expect(group!.category).to.equal(category);
                expect(group!.entries.map((entry) => entry.path)).to.deep.equal([path]);
                expect(modifierPathSteps(group!, path)).to.be.empty;
                const helper = new ModifierHelper({
                    definitions,
                    initial: `${path.replace(/^actor\./, "")} +2`,
                    validate: () => [],
                    apply: () => true,
                });
                const restored = await helper._prepareContext({});
                expect(restored.selectedPath).to.equal(path);
                expect(restored.preview).to.equal(`${path} +2`);
            });
        }

        it("places both attribute filters before the skill filter in the rendered actor.skills form", async () => {
            const helper = new ModifierHelper({
                definitions,
                initial: 'actor.skills skill="acrobatics" attribute1="agility" attribute2="strength" +2',
                validate: () => [],
                apply: () => true,
            });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            try {
                const fields = [...dom.window.document.querySelectorAll<HTMLSelectElement>("[data-attribute]")];
                expect(fields.map((field) => field.dataset.attribute)).to.deep.equal([
                    "attribute1",
                    "attribute2",
                    "skill",
                    "emphasis",
                ]);
                expect(fields.map((field) => field.value)).to.deep.equal(["agility", "strength", "acrobatics", ""]);
            } finally {
                dom.window.close();
            }
        });

        it("lists item functions directly while retaining cast-duration variants", () => {
            const groups = modifierGroups(definitions);
            expect(groups.map((group) => group.path)).to.include.members([
                "item.damage",
                "item.addFeature",
                "item.mergeFeature",
                "item.castDuration",
                "item.weaponspeed",
                "item.defenseTickCost",
            ]);
            expect(groups.map((group) => group.path)).not.to.include("item");
            const duration = groups.find((group) => group.path === "item.castDuration")!;
            expect(duration.category).to.equal("other");
            expect(
                modifierPathSteps(duration, "item.castDuration")[0].choices.map((choice) => choice.value)
            ).to.deep.equal(["item.castDuration", "item.castDuration.multiplier"]);
            expect(
                modifierPathSteps(
                    groups.find((group) => group.path === "item.damage")!,
                    "item.damage"
                )
            ).to.be.empty;
        });

        it("offers families instead of suffixes or duplicate aliases", () => {
            expect(definitions.map((entry) => entry.path)).not.to.include.members(["item", "focus", "check"]);
            const paths = modifierGroups(definitions).map((group) => group.path);
            expect(paths).to.include.members(["actor.woundmalus", "focuspoints", "focus", "handicap"]);
            expect(paths).not.to.include.members([
                "woundmalus",
                "actor.focuspoints",
                "handicap.mod",
                "handicap.armor",
                "focus.reduction",
                "item",
            ]);
        });

        it("requires a wound variant instead of offering the ineffective base value", async () => {
            const helper = new ModifierHelper({ definitions, initial: "", validate: () => [], apply: () => true });
            const context = await helper._prepareContext({});
            const dom = new JSDOM(createHtml("templates/apps/modifier-helper.hbs", context));
            Object.defineProperty(helper, "element", { value: dom.window.document.body });
            sandbox.stub(helper, "render").resolves(helper);
            try {
                await helper._onRender(context);
                helper.element.querySelector<HTMLButtonElement>('[data-category-heading="other"]')!.click();
                helper.element.querySelector<HTMLElement>('[data-modifier-path="actor.woundmalus"]')!.click();
                const selected = await helper._prepareContext({});
                expect(selected.selectedPath).to.equal("actor.woundmalus");
                expect(selected.pathSteps[0].value).to.equal("");
                expect(selected.pathSteps[0].label).to.equal("Bitte auswählen");
                expect(selected.pathSteps[0].choices.map((choice) => choice.value)).to.deep.equal([
                    "actor.woundmalus.levelmod",
                    "actor.woundmalus.mod",
                    "actor.woundmalus.nbrLevels",
                ]);
                expect(selected.pathSteps[0].choices.some((choice) => choice.selected)).to.equal(false);
                expect(selected.requiresValue).to.equal(false);
                expect(selected.preview).to.equal("");
                for (const path of ["woundmalus", "actor.woundmalus"]) {
                    expect(definitions.some((entry) => entry.path === path)).to.equal(false);
                    expect(module.addModifier(source, `${path} +1`, "innate").hasErrors).to.equal(false);
                }
            } finally {
                dom.window.close();
            }
        });

        for (const entry of definitions.filter((entry) => entry.helperAlias)) {
            it(`preserves the handler result when replacing alias ${entry.path}`, () => {
                const canonical = canonicalDefinition(entry, definitions);
                expect(canonical.path.toLowerCase()).to.equal(entry.helperAlias!.toLowerCase());
                const process = (path: string) =>
                    module
                        .addModifier(source, `${path} +2`, "innate")
                        .modifiers.map(({ modifier, implementation }) => ({
                            implementation,
                            groupId: modifier.groupId,
                            attributes: modifier.attributes,
                            selectable: modifier.selectable,
                            value: serialize(modifier.value),
                        }));
                const original = process(entry.path);
                expect(original).not.to.be.empty;
                expect(process(canonical.path)).to.deep.equal(original);
            });
        }

        it("derives all skill categories from the existing system configuration", () => {
            const groups = modifierGroups(definitions);
            for (const category of modifierCategories.filter((entry) => entry !== "other")) {
                expect(
                    groups
                        .filter((group) => group.category === category)
                        .map((group) => group.path)
                        .filter((path) => !path.startsWith("actor.skills"))
                        .sort()
                ).to.deep.equal([...skillGroups[category]].sort());
            }
            expect(groups.find((group) => group.path === "handicap")?.category).to.equal("other");
        });

        it("discovers new nested variants without maintaining a second list", () => {
            const entries = modifierCatalogue(
                [
                    makeConfig({
                        topLevelPath: "extension",
                        hideInHelper: true,
                        subSegments: { nested: { subSegments: { future: { requiredAttributes: ["newField"] } } } },
                    }),
                ],
                []
            );
            const group = modifierGroups(entries)[0];
            expect(group.path).to.equal("extension");
            expect(
                modifierPathSteps(group, "extension.nested.future").map(
                    (step) => step.choices.find((choice) => choice.selected)?.value
                )
            ).to.deep.equal(["extension.nested", "extension.nested.future"]);
            expect(
                group.entries.find((entry) => entry.path === "extension.nested.future")?.definition.requiredAttributes
            ).to.deep.equal(["newField"]);
        });

        it("discovers future item functions and their nested variants as separate families", () => {
            const entries = modifierCatalogue(
                [
                    makeConfig({
                        topLevelPath: "item",
                        hideInHelper: true,
                        subSegments: { future: { subSegments: { multiplier: {} } } },
                    }),
                ],
                []
            );
            const [group] = modifierGroups(entries);
            expect(group.path).to.equal("item.future");
            expect(group.category).to.equal("other");
            expect(
                modifierPathSteps(group, "item.future.multiplier")[0].choices.map((choice) => choice.value)
            ).to.deep.equal(["item.future", "item.future.multiplier"]);
        });

        it("keeps an alias visible if its target is not registered", () => {
            const entries = modifierCatalogue([makeConfig({ topLevelPath: "extension", helperAlias: "missing" })], []);
            expect(modifierGroups(entries)[0].entries[0].definition).to.equal(entries[0]);
        });
    });

    for (const family of ["resistance", "weakness"]) {
        it(`groups ${family} damage types into one entry with every registered choice`, () => {
            expect(
                definitions.filter((entry) => entry.path.startsWith(family)).map((entry) => entry.path)
            ).to.deep.equal([family]);
            expect(attributeChoices(definition(family), "damageType").map((choice) => choice.value)).to.deep.equal(
                damageTypes
            );
            expect(modifierDescription(definition(family))).not.to.include(family);
        });

        for (const damageType of damageTypes) {
            it(`builds and restores ${family}.${damageType} through the grouped selection`, () => {
                const entry = definition(family);
                const raw = buildModifier(entry, { value: "2", attributes: { damageType } });
                expect(raw).to.equal(`${family}.${damageType} +2`);
                expect(module.addModifier(source, raw!, "innate").hasErrors).to.equal(false);
                const restored = readModifierInput(raw!, definitions)!;
                expect(restored.definition.path).to.equal(family);
                expect(restored.input.attributes).to.deep.equal({ damageType });
                expect(buildModifier(restored.definition, restored.input)).to.equal(raw);
            });
        }

        it(`requires a registered damage type for ${family}`, () => {
            for (const damageType of ["", "unknown", "cold +2, defense"]) {
                expect(buildModifier(definition(family), { value: "2", attributes: { damageType } })).to.equal(null);
            }
        });
    }

    it("discovers new grouped variants from handler metadata rather than a fixed helper list", () => {
        const entries = modifierCatalogue(
            [
                makeConfig({
                    topLevelPath: "extension.newType",
                    helperGroup: {
                        path: "extension",
                        attribute: "kind",
                        choice: { value: "newType", label: "New type" },
                    },
                }),
            ],
            []
        );
        expect(entries.map((entry) => entry.path)).to.deep.equal(["extension"]);
        expect(buildModifier(entries[0], { value: "2", attributes: { kind: "newType" } })).to.equal(
            "extension.newType +2"
        );
    });

    it("uses the most specific registration regardless of registration order", () => {
        const entries = modifierCatalogue(
            [
                makeConfig({ topLevelPath: "test.child", requiredAttributes: ["specific"] }),
                makeConfig({ topLevelPath: "test", subSegments: { child: { optionalAttributes: ["general"] } } }),
            ],
            []
        );
        expect(entries.find((entry) => entry.path === "test.child")?.requiredAttributes).to.deep.equal(["specific"]);
    });

    it("describes newly registered paths even without a translation", () => {
        expect(
            modifierDescription({ ...definition("defense"), description: "splittermond.missingDescription" })
        ).not.to.include("splittermond.");
    });
});
