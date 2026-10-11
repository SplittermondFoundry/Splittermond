import {
    SplittermondApplication,
    TEMPLATE_BASE_PATH,
    type ApplicationContextOptions,
    type ApplicationRenderContext,
} from "module/data/SplittermondApplication";
import { foundryApi } from "module/api/foundryApi";
import { modifierDescription, type ModifierDefinition } from "./catalogue";
import { attributeField } from "./attributeField";
import { buildModifier, readModifierInput, type ModifierInput } from "./buildModifier";
import type { ModifierHelperContext } from "./templateInterface";
import { activateModifierPicker, activatePicker, activateAttributePicker, fitModifierPicker } from "./modifierPicker";
import { renderModifierDrafts } from "./modifierDrafts";
import { activateFeatureSuggestions } from "./featureSuggestions";
import { isUnscaledFeature } from "./featureValue";
import { buildFeatureAdjustment, defaultFeatureAdjustment, type FeatureAdjustmentInput } from "./featureAdjustments";
import { featureAdjustment, validFeatureCount } from "./featureImprovementRules";
import { featureAdjustmentContext, featureValueContext } from "./featureAdjustmentContext";
import type { FeatureTarget } from "./featureChoices";
import type { ModifierDiagnostic } from "module/modifiers/parsing/ParseErrors";
import {
    canonicalDefinition,
    groupDescription,
    modifierCategoryHeadings,
    modifierGroups,
    modifierPathSteps,
    modifierSortModes,
    type ModifierGroup,
    type ModifierSortMode,
} from "./modifierGroups";

export interface ModifierHelperOptions {
    definitions: ModifierDefinition[];
    initial: string;
    multiple?: boolean;
    target?: FeatureTarget;
    validate: (raw: string) => readonly ModifierDiagnostic[];
    apply: (raw: string) => boolean;
}

interface FeatureRow {
    id: number;
    feature: string;
    value: string;
}

interface FeatureAdjustmentState {
    feature: string;
    input: FeatureAdjustmentInput;
}

interface ModifierDraft {
    fragments: string[];
    definition: ModifierDefinition;
    input: ModifierInput;
    features: FeatureRow[];
    adjustments: [string, FeatureAdjustmentState][];
}

export class ModifierHelper extends SplittermondApplication {
    private static nextId = 0;

    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: ["splittermond", "modifier-helper"],
        form: { submitOnChange: false, closeOnSubmit: false, handler: ModifierHelper.applyModifier },
        window: { title: "splittermond.modifierHelper.title", resizable: true },
        position: { width: 760, height: 860 },
        actions: {
            applyModifier: ModifierHelper.applyModifier,
            addModifier: ModifierHelper.addModifier,
            editModifier: ModifierHelper.editModifier,
            removeModifier: ModifierHelper.removeModifier,
            addFeature: ModifierHelper.addFeature,
            removeFeature: ModifierHelper.removeFeature,
            cancel: ModifierHelper.cancel,
        },
    };

    static PARTS = {
        content: { template: `${TEMPLATE_BASE_PATH}/apps/modifier-helper.hbs`, scrollable: [".modifier-helper-body"] },
    };

    private readonly groups: ModifierGroup[];
    private group: ModifierGroup | undefined;
    private selectedPath = "";
    private sortMode: ModifierSortMode = "category";
    private readonly collapsedCategories = new Set(modifierCategoryHeadings.map(({ value }) => value));
    private readonly collapsedAttributeCategories = new Map<string, Set<string>>();
    private pickerDisposers: (() => void)[] = [];
    private input: ModifierInput = { value: "", attributes: {} };
    private readonly drafts: ModifierDraft[] = [];
    private featureRows: FeatureRow[] = [];
    private featureAdjustments = new Map<string, FeatureAdjustmentState>();
    private renderedFeatures = "";
    private nextFeatureId = 0;
    private editingIndex: number | undefined;
    private search = "";
    private showRequiredErrors = false;
    private readonly listPrefix = `modifier-helper-${ModifierHelper.nextId++}`;

    constructor(private readonly helperOptions: ModifierHelperOptions) {
        super();
        const existing = readModifierInput(helperOptions.initial, helperOptions.definitions);
        this.groups = modifierGroups(helperOptions.definitions);
        if (existing) this.restore(existing);
    }

    private restore(existing: NonNullable<ReturnType<typeof readModifierInput>>) {
        const definition = canonicalDefinition(existing.definition, this.helperOptions.definitions);
        this.group = this.groups.find((group) => group.entries.some((entry) => entry.definition === definition))!;
        this.selectedPath = this.group.entries.find((entry) => entry.definition === definition)!.path;
        this.input = existing.input;
        this.setDefaultAttributes(false);
        this.featureRows = [];
        this.featureAdjustments.clear();
    }

    private setDefaultAttributes(useItemName = true) {
        if (this.selected?.path === "item.castDuration" && this.input.attributes.unit === undefined)
            this.input.attributes.unit = "T";
        if (
            useItemName &&
            this.selected?.path.match(/^item\.(addFeature|mergeFeature)$/) &&
            this.helperOptions.target &&
            this.input.attributes.item === undefined
        )
            this.input.attributes.item = this.helperOptions.target.name;
    }

    private get selected(): ModifierDefinition | undefined {
        return this.group?.entries.find((entry) => entry.path === this.selectedPath)?.definition;
    }

    private get canAddFeature(): boolean {
        return (
            !!this.helperOptions.multiple &&
            (this.selected?.path === "item.addFeature" || this.selected?.path === "item.mergeFeature")
        );
    }

    override async _prepareContext(
        options: ApplicationContextOptions
    ): Promise<ApplicationRenderContext & ModifierHelperContext> {
        const context = await super._prepareContext(options);
        const selected = this.selected;
        this.syncFeatureAdjustments();
        this.renderedFeatures = this.featureLayout();
        const required = selected?.requiredAttributes ?? [];
        const fields = [...new Set([...required, ...(selected?.optionalAttributes ?? [])])]
            .filter(
                (key) =>
                    required.includes(key) || !selected?.helperAttributes?.[key]?.hidden || !!this.input.attributes[key]
            )
            .map((key) =>
                attributeField(
                    selected!,
                    key,
                    this.input.attributes[key] ?? "",
                    `${this.listPrefix}-${key}`,
                    this.helperOptions.target
                )
            );
        const castDuration = selected?.path.startsWith("item.castDuration");
        if (castDuration) {
            const order = ["unit", "skill", "item", "itemType"];
            fields.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
            fields.forEach((field) => {
                field.wide = field.key !== "unit";
                field.valueAfter = field.key === "unit";
            });
        }
        const description = this.group ? groupDescription(this.group) : "";
        const variantDescription = selected ? modifierDescription(selected) : "";
        const value = this.input.value.trim();
        const normalizedValue = value && Number.isFinite(Number(value)) ? String(Number(value)) : value;
        const featureValue = featureValueContext(this.input.attributes.feature, normalizedValue);
        const valueChoices = (
            featureValue.valueChoices.length ? featureValue.valueChoices : (selected?.valueChoices ?? [])
        ).map(({ value, label }) => {
            const localized = foundryApi.localize(label);
            return { value, label: localized === label ? value : localized, selected: value === normalizedValue };
        });
        return {
            ...context,
            search: this.search,
            selectedPath: this.group?.path ?? "",
            selectionErrorId: `${this.listPrefix}-selection-error`,
            modifiers: this.groups.map((group) => ({
                path: group.path,
                description: groupDescription(group),
                selected: group === this.group,
                category: group.category,
                search: group.search,
            })),
            categories: modifierCategoryHeadings.map(({ value, parent }) => ({
                value,
                parent,
                label: `splittermond.modifierHelper.categories.${value}`,
            })),
            sortModes: modifierSortModes.map((value) => ({
                value,
                label: `splittermond.modifierHelper.sortModes.${value}`,
                selected: value === this.sortMode,
            })),
            pathSteps: (this.group ? modifierPathSteps(this.group, this.selectedPath) : []).map((step, index) => {
                const choice = step.choices.find((choice) => choice.selected);
                return {
                    ...step,
                    value: choice?.value ?? "",
                    label: choice?.label ?? foundryApi.localize("splittermond.modifierHelper.chooseVariant"),
                    errorId: `${this.listPrefix}-step-${index}-error`,
                };
            }),
            description,
            variantDescription: variantDescription === description ? "" : variantDescription,
            requiresValue: selected?.requiresValue ?? false,
            valueHidden: isUnscaledFeature(selected, this.input.attributes.feature),
            valueFirst:
                ["item.damage", "item.defenseTickCost", "item.weaponspeed", "lowerfumbleresult"].includes(
                    selected?.path ?? ""
                ) ||
                (!!castDuration && !fields.some((field) => field.valueAfter)),
            valueWithAttribute: fields.some((field) => field.valueAfter),
            canAddFeature: this.canAddFeature,
            adjustment: this.adjustmentContext("primary", this.input.attributes.feature),
            featureRows: this.featureRows.map((row) => ({
                id: row.id,
                field: {
                    ...attributeField(
                        selected!,
                        "feature",
                        row.feature,
                        `${this.listPrefix}-feature-${row.id}`,
                        this.helperOptions.target
                    ),
                    hint: "",
                },
                value: row.value,
                ...featureValueContext(row.feature, row.value),
                adjustment: this.adjustmentContext(String(row.id), row.feature),
                valueHidden: isUnscaledFeature(selected, row.feature),
                valueErrorId: `${this.listPrefix}-feature-${row.id}-value-error`,
                valueHintId: `${this.listPrefix}-feature-${row.id}-value-hint`,
            })),
            valueErrorId: `${this.listPrefix}-value-error`,
            valueHintId: `${this.listPrefix}-value-hint`,
            value: valueChoices.length ? normalizedValue : this.input.value,
            valueChoices,
            unsupportedValue: !!valueChoices.length && !!value && !valueChoices.some((choice) => choice.selected),
            valuePlaceholder: selected?.cost
                ? "K1V1"
                : selected?.path === "item.damage"
                  ? foundryApi.localize("splittermond.modifierHelper.damageValueExample")
                  : "2",
            valueLabel: selected?.cost ? "splittermond.modifierHelper.costValue" : featureValue.valueLabel,
            multiple: this.helperOptions.multiple ?? false,
            hasResult: !!this.group || this.drafts.length > 0,
            fields,
            preview: selected ? (buildModifier(selected, this.input) ?? "") : "",
        };
    }

    override async _onRender(context: ApplicationRenderContext, options?: object): Promise<void> {
        await super._onRender(context, options);
        this.disposePickers();
        this.pickerDisposers.push(
            activateModifierPicker(
                this.element,
                async (path) => {
                    if (path === this.group?.path) return;
                    this.group = this.groups.find((entry) => entry.path === path)!;
                    this.selectedPath = this.group.path;
                    this.input = { value: "", attributes: {} };
                    this.setDefaultAttributes();
                    this.featureRows = [];
                    this.featureAdjustments.clear();
                    this.showRequiredErrors = false;
                    await this.render();
                    this.element.querySelector<HTMLElement>(".modifier-helper-body")!.scrollTop = 0;
                    this.element.querySelector<HTMLElement>(".modifier-picker summary")!.focus();
                },
                (query) => (this.search = query),
                (mode) => (this.sortMode = mode),
                this.collapsedCategories
            )
        );
        this.element.querySelectorAll<HTMLDetailsElement>(".modifier-variant-picker").forEach((picker) => {
            const parent = picker.querySelector<HTMLElement>("[data-path-parent]")!.dataset.pathParent!;
            this.pickerDisposers.push(
                activatePicker(picker, async (path) => {
                    this.updatePreview();
                    this.selectedPath = path;
                    const allowed = [
                        ...(this.selected?.requiredAttributes ?? []),
                        ...(this.selected?.optionalAttributes ?? []),
                    ];
                    this.input.attributes = Object.fromEntries(
                        Object.entries(this.input.attributes).filter(([key]) => allowed.includes(key))
                    );
                    this.setDefaultAttributes();
                    await this.render();
                    this.element.querySelector<HTMLElement>(`[data-path-parent="${parent}"]`)!.focus();
                })
            );
        });
        this.element.querySelectorAll<HTMLDetailsElement>(".modifier-attribute-picker").forEach((picker) => {
            const input = picker.parentElement!.querySelector<HTMLInputElement>("[data-attribute]")!;
            const key = input.dataset.attribute!;
            if (picker.querySelector("[data-category-heading]") && !this.collapsedAttributeCategories.has(key))
                this.collapsedAttributeCategories.set(
                    key,
                    new Set(
                        [...picker.querySelectorAll<HTMLElement>("[data-category-heading]")].map(
                            (heading) => heading.dataset.categoryHeading!
                        )
                    )
                );
            this.pickerDisposers.push(
                activateAttributePicker(
                    picker,
                    (value) => {
                        input.value = value;
                        this.updatePreview();
                    },
                    this.collapsedAttributeCategories.get(key)
                )
            );
        });
        this.element.querySelector(".modifier-helper-body")!.addEventListener("scroll", () => this.fitPickers());
        this.element.querySelectorAll<HTMLElement>(".modifier-feature-combobox").forEach((picker) => {
            this.pickerDisposers.push(activateFeatureSuggestions(picker, () => this.updatePreview()));
        });
        this.element
            .querySelectorAll<HTMLInputElement | HTMLSelectElement>(
                "[data-attribute], [name=modifierValue], [data-adjustment-enabled]"
            )
            .forEach((input) => {
                input.addEventListener("input", () => this.updatePreview());
                input.addEventListener("change", () => this.updatePreview());
            });
        this.updatePreview();
    }

    protected override _onPosition(position: SplittermondApplication["position"]) {
        super._onPosition(position);
        this.fitPickers();
    }

    private fitPickers() {
        this.element
            .querySelectorAll<HTMLElement>(".modifier-picker[open], .modifier-feature-combobox.is-open")
            .forEach(fitModifierPicker);
    }

    private disposePickers() {
        this.pickerDisposers.forEach((dispose) => dispose());
        this.pickerDisposers = [];
    }

    override close(options?: object) {
        this.disposePickers();
        return super.close(options);
    }

    private updatePreview() {
        this.input.value =
            this.element.querySelector<HTMLInputElement | HTMLSelectElement>("[name=modifierValue]")?.value ??
            this.input.value;
        this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-attribute]").forEach((input) => {
            if (!input.closest("[data-feature-row], [data-feature-adjustment]"))
                this.input.attributes[input.dataset.attribute!] = input.value;
        });
        for (const row of this.featureRows) {
            const element = this.element.querySelector<HTMLElement>(`[data-feature-row="${row.id}"]`);
            // A second structural action may arrive before the previous row render finishes.
            if (!element) continue;
            row.feature = element.querySelector<HTMLInputElement>("[data-attribute=feature]")!.value;
            row.value = element.querySelector<HTMLInputElement | HTMLSelectElement>("[name=modifierValue]")!.value;
        }
        this.element.querySelectorAll<HTMLElement>("[data-feature-adjustment]").forEach((element) => {
            const adjustment = this.featureAdjustments.get(element.dataset.featureAdjustment!)?.input;
            if (!adjustment) return;
            const enabled = element.querySelector<HTMLInputElement>("[data-adjustment-enabled]");
            if (enabled) adjustment.enabled = enabled.checked;
            element.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-attribute]").forEach((input) => {
                adjustment.attributes[input.dataset.attribute!] = input.value;
            });
        });
        this.syncFeatureAdjustments(true);
        this.updateFeatureValueVisibility();
        const errors: ModifierDiagnostic[] = [];
        const fragments = this.buildCurrent(errors);
        const raw = fragments.length && fragments.every((fragment) => fragment !== null) ? fragments.join(", ") : null;
        if (!this.selected && (this.group || !this.drafts.length))
            errors.push({
                attribute: "path",
                message: foundryApi.localize(
                    `splittermond.modifierHelper.errors.${this.group ? "variant" : "modifier"}`
                ),
            });
        const output = this.element.querySelector<HTMLOutputElement>("output");
        if (output) {
            if (this.helperOptions.multiple) {
                const entries = this.drafts.map((value, index) => ({
                    value: index === this.editingIndex ? raw : value.fragments.join(", "),
                    index,
                    active: index === this.editingIndex,
                }));
                if (this.group && this.editingIndex === undefined)
                    entries.push({ value: raw, index: this.drafts.length, active: true });
                renderModifierDrafts(output, entries);
            } else output.value = raw ?? "";
        }
        this.displayErrors(errors);
        const hint = this.element.querySelector<HTMLElement>("[data-value-hint]");
        if (hint) {
            const fixedDamageWithFeatures =
                this.selected?.path.toLowerCase() === "item.damage" &&
                this.input.attributes.features?.trim() &&
                this.input.value.trim() &&
                Number.isFinite(Number(this.input.value));
            hint.textContent = fixedDamageWithFeatures
                ? foundryApi.localize("splittermond.modifierHelper.fixedDamageFeatures")
                : "";
            hint.hidden = !hint.textContent;
        }
        this.fitPickers();
        if (this.renderedFeatures !== this.featureLayout()) {
            this.renderedFeatures = this.featureLayout();
            const focusedRow =
                this.element.ownerDocument.activeElement?.closest<HTMLElement>("[data-feature-row]")?.dataset
                    .featureRow;
            void this.render().then(() => {
                const row =
                    focusedRow === undefined
                        ? this.element
                        : this.element.querySelector(`[data-feature-row="${focusedRow}"]`);
                row?.querySelector<HTMLElement>('[data-attribute-picker="feature"] summary')?.focus();
            });
        }
        return { raw, errors, fragments: fragments.filter((fragment) => fragment !== null) };
    }

    private buildCurrent(errors: ModifierDiagnostic[]): (string | null)[] {
        if (!this.selected) return [];
        const inputs = [
            { input: this.input, id: undefined },
            ...this.featureRows.map((row) => ({
                input: { value: row.value, attributes: { ...this.input.attributes, feature: row.feature } },
                id: String(row.id),
            })),
        ];
        return inputs.flatMap(({ input, id }) => {
            const report = (error: ModifierDiagnostic) =>
                errors.push({ ...error, attribute: this.featureAttribute(error.attribute, id) });
            const raw = buildModifier(this.selected!, input, (attribute, messageKey) => {
                report({ attribute, message: foundryApi.localize(messageKey) });
            });
            if (raw) this.helperOptions.validate(raw).forEach(report);
            const adjustment = this.featureAdjustments.get(id ?? "primary")?.input;
            if (!adjustment) return [raw];
            const countValid = validFeatureCount(input.attributes.feature, input.value);
            if (!countValid) {
                report({
                    attribute: "value",
                    message: foundryApi.localize("splittermond.modifierHelper.adjustments.invalidCount"),
                });
            }
            const companion = countValid
                ? buildFeatureAdjustment(input, adjustment, this.helperOptions.definitions, (attribute, key) => {
                      errors.push({
                          attribute: `adjustment-${id ?? "primary"}-${attribute}`,
                          message: foundryApi.localize(key),
                      });
                  })
                : null;
            if (companion)
                this.helperOptions
                    .validate(companion)
                    .forEach((error) => errors.push({ ...error, attribute: `adjustment-${id ?? "primary"}-enabled` }));
            const element = this.element.querySelector<HTMLElement>(`[data-feature-adjustment="${id ?? "primary"}"]`);
            const preview = element?.querySelector<HTMLElement>("[data-adjustment-preview]");
            if (preview)
                preview.textContent = companion || foundryApi.localize("splittermond.modifierHelper.incomplete");
            element
                ?.querySelector<HTMLElement>("[data-adjustment-fields]")
                ?.toggleAttribute("hidden", !adjustment.enabled);
            return companion === "" ? [raw] : [raw, companion];
        });
    }

    private featureLayout() {
        if (!this.selected?.path.match(/^item\.(addFeature|mergeFeature)$/)) return "";
        return [this.input.attributes.feature, ...this.featureRows.map((row) => row.feature)]
            .map((feature) => (featureAdjustment(feature) ? feature : ""))
            .join("|");
    }

    private syncFeatureAdjustments(writeDefaults = false) {
        if (!this.selected?.path.match(/^item\.(addFeature|mergeFeature)$/)) return;
        const rows = [
            { id: "primary", feature: this.input.attributes.feature ?? "", input: this.input },
            ...this.featureRows.map((row) => ({ id: String(row.id), feature: row.feature, input: row })),
        ];
        for (const row of rows) {
            const previous = this.featureAdjustments.get(row.id);
            if (previous?.feature === row.feature) continue;
            this.featureAdjustments.set(row.id, {
                feature: row.feature,
                input: defaultFeatureAdjustment(!!this.helperOptions.multiple),
            });
            if (featureAdjustment(row.feature)?.countMax && (!row.input.value || previous !== undefined)) {
                row.input.value = "1";
                // A following change event must read the same default while the new fields are rendering.
                if (writeDefaults) {
                    const element =
                        row.id === "primary"
                            ? this.element
                            : this.element.querySelector(`[data-feature-row="${row.id}"]`);
                    const value = element?.querySelector<HTMLInputElement | HTMLSelectElement>("[name=modifierValue]");
                    if (value) value.value = row.input.value;
                }
            }
        }
    }

    private adjustmentContext(id: string, feature: string | undefined) {
        const input = this.featureAdjustments.get(id)?.input;
        return input
            ? featureAdjustmentContext(
                  feature,
                  input,
                  this.helperOptions.definitions,
                  `${this.listPrefix}-adjustment-${id}`,
                  id,
                  !!this.helperOptions.multiple,
                  this.helperOptions.target
              )
            : undefined;
    }

    private updateFeatureValueVisibility() {
        if (!this.element.querySelector("[data-attribute=feature]")) return;
        this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[name=modifierValue]").forEach((input) => {
            const row = input.closest<HTMLElement>("[data-feature-row]");
            const feature = (row ?? this.element).querySelector<HTMLInputElement>("[data-attribute=feature]")!;
            const hidden = isUnscaledFeature(this.selected, feature.value);
            input.required = !hidden;
            const field = input.closest<HTMLElement>(".modifier-helper-value")!;
            field.hidden = hidden;
            feature.closest<HTMLElement>(".modifier-helper-control")!.classList.toggle("modifier-helper-wide", hidden);
        });
    }

    private featureAttribute(attribute: string | undefined, rowId: string | undefined) {
        return rowId !== undefined && (attribute === "feature" || attribute === "value")
            ? `feature-${rowId}-${attribute}`
            : attribute;
    }

    private displayErrors(errors: readonly ModifierDiagnostic[]) {
        const controls = [
            ...[
                ...this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
                    "[data-attribute], [name=modifierValue], [data-adjustment-enabled]"
                ),
            ].map((input) => ({
                control:
                    input
                        .closest(".modifier-helper-control")
                        ?.querySelector<HTMLElement>(".modifier-attribute-picker summary") ?? input,
                attribute: input.closest<HTMLElement>("[data-feature-adjustment]")
                    ? `adjustment-${input.closest<HTMLElement>("[data-feature-adjustment]")!.dataset.featureAdjustment}-${input.dataset.attribute ?? "enabled"}`
                    : this.featureAttribute(
                          input.dataset.attribute ?? "value",
                          input.closest<HTMLElement>("[data-feature-row]")?.dataset.featureRow
                      ),
                value: input.value,
            })),
            ...[...this.element.querySelectorAll<HTMLElement>("[data-path-value]")].map((control) => ({
                control,
                attribute: "path",
                value: control.dataset.pathValue!,
            })),
        ];
        controls.forEach(({ control, attribute, value }) => {
            const messages = [
                ...new Set(
                    errors
                        .filter(
                            (error) =>
                                error.attribute === attribute &&
                                (this.showRequiredErrors || value.trim()) &&
                                (attribute !== "path" || !value)
                        )
                        .map((error) => error.message)
                ),
            ];
            control.setAttribute("aria-invalid", String(messages.length > 0));
            const message = this.element.ownerDocument.getElementById(control.getAttribute("aria-errormessage")!)!;
            message.textContent = messages.join(" ");
            message.hidden = !messages.length;
        });
        const general = this.element.querySelector<HTMLElement>("[data-error-general]")!;
        general.textContent = [
            ...new Set(
                errors
                    .filter(
                        (error) => !error.attribute || !controls.some(({ attribute }) => attribute === error.attribute)
                    )
                    .map((error) => error.message)
            ),
        ].join(" ");
        general.hidden = !general.textContent;
    }

    private acceptCurrent(): boolean {
        this.showRequiredErrors = true;
        const { raw, errors, fragments } = this.updatePreview();
        if (errors.length || (!raw && !this.drafts.length)) {
            this.element.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
            foundryApi.warnUser("splittermond.modifierHelper.invalid");
            return false;
        }
        if (raw) {
            const index = this.editingIndex ?? this.drafts.length;
            this.drafts[index] = {
                fragments,
                definition: this.selected!,
                input: structuredClone(this.input),
                features: structuredClone(this.featureRows),
                adjustments: structuredClone([...this.featureAdjustments]),
            };
            this.editingIndex = index;
        }
        return true;
    }

    private resetDraft() {
        this.group = undefined;
        this.selectedPath = "";
        this.input = { value: "", attributes: {} };
        this.featureRows = [];
        this.featureAdjustments.clear();
        this.editingIndex = undefined;
        this.showRequiredErrors = false;
        this.search = "";
    }

    private async renderDraft() {
        await this.render();
        this.element.querySelector<HTMLElement>(".modifier-helper-body")!.scrollTop = 0;
        this.element.querySelector<HTMLElement>(".modifier-picker-main summary")!.focus();
    }

    private static async addModifier(this: ModifierHelper) {
        if (!this.helperOptions.multiple || !this.group || !this.acceptCurrent()) return;
        this.resetDraft();
        await this.renderDraft();
    }

    private static async addFeature(this: ModifierHelper) {
        if (!this.canAddFeature) return;
        this.updatePreview();
        const id = this.nextFeatureId++;
        this.featureRows.push({ id, feature: "", value: "" });
        await this.render();
        this.element.querySelector<HTMLElement>(`[data-feature-row="${id}"] summary`)?.focus();
    }

    private static async removeFeature(this: ModifierHelper, _event: Event, target: HTMLElement) {
        if (!this.canAddFeature) return;
        this.updatePreview();
        const id = Number(target.dataset.featureId);
        this.featureRows = this.featureRows.filter((row) => row.id !== id);
        this.featureAdjustments.delete(String(id));
        await this.render();
        this.element.querySelector<HTMLElement>("[data-action=addFeature]")?.focus();
    }

    private static async editModifier(this: ModifierHelper, _event: Event, target: HTMLElement) {
        if (!this.helperOptions.multiple) return;
        const index = Number(target.dataset.index);
        if (index === this.editingIndex || !this.acceptCurrent()) return;
        const draft = this.drafts[index];
        this.restore({ definition: draft.definition, input: structuredClone(draft.input) });
        this.featureRows = structuredClone(draft.features);
        this.featureAdjustments = new Map(structuredClone(draft.adjustments));
        this.editingIndex = index;
        this.showRequiredErrors = false;
        await this.renderDraft();
    }

    private static async removeModifier(this: ModifierHelper, _event: Event, target: HTMLElement) {
        if (!this.helperOptions.multiple) return;
        this.updatePreview();
        const index = Number(target.dataset.index);
        if (index === this.editingIndex || index === this.drafts.length) this.resetDraft();
        else if (this.editingIndex !== undefined && index < this.editingIndex) this.editingIndex--;
        this.drafts.splice(index, 1);
        await this.renderDraft();
    }

    private static async applyModifier(this: ModifierHelper) {
        if (!this.acceptCurrent()) return;
        if (!this.helperOptions.apply(this.drafts.flatMap((draft) => draft.fragments).join(", "))) {
            foundryApi.warnUser("splittermond.modifierHelper.closedTarget");
            return;
        }
        await this.close();
    }

    private static async cancel(this: ModifierHelper) {
        await this.close();
    }
}
