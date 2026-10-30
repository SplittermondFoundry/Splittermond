import SplittermondItemSheet from "./item-sheet";
import { parseCastDuration } from "module/item/dataModel/propertyModels/CastDurationModel.js";
import type SplittermondSpellItem from "module/item/spell";
import { enhancedSpellProperties, type EnhancedSpellProperty } from "module/item/dataModel/EnhancedSpellValues";
import { parseFeatures } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import type { PropertyGroup } from "./propertyTypes";

export default class SplittermondSpellSheet extends SplittermondItemSheet {
    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: ["splittermond", "sheet", "item", "spell"],
    };

    get item(): SplittermondSpellItem {
        return super.item as SplittermondSpellItem;
    }

    protected override async _getItemProperties(): Promise<PropertyGroup[]> {
        const groups = await super._getItemProperties();
        for (const group of groups) {
            for (const property of group.properties) {
                const comparison = property.comparison;
                if (!comparison) continue;
                const key = enhancedSpellProperties.find((key) => comparison.field === spellInputField(key, true));
                if (!key) continue;
                const inherited = this.item.system.enhanced[key] === null;
                if (comparison.template === "select") {
                    comparison.choices = { "": "splittermond.spellValues.inherit", ...comparison.choices };
                }
                if (inherited) comparison.value = comparison.template === "select" ? "" : property.value;
                comparison.inherited = inherited;
            }
        }
        return groups;
    }

    _getStatBlock() {
        return [
            {
                label: "splittermond.difficulty",
                value: this.item.difficulty,
            },
            {
                label: "splittermond.focusCosts",
                value: this.item.costs,
            },
            {
                label: "splittermond.castDuration",
                value: this.item.castDuration,
            },
            {
                label: "splittermond.range",
                value: this.item.range,
            },
        ];
    }

    _prepareSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        formData: { object: Record<string, unknown> },
        updateObject: object = {}
    ): object {
        const target = event.target;
        const changedField = target && "name" in target ? target.name : null;
        for (const key of enhancedSpellProperties) {
            const field = spellInputField(key, true);
            // submitOnChange includes every named input, including displayed inherited values.
            if (changedField !== field && !hasEditedValue(form, field)) {
                if (this.item.system.enhanced[key] === null) delete formData.object[field];
                continue;
            }
            const value = formData.object[field];
            if (typeof value !== "string") continue;
            const normalField = spellInputField(key);
            const normalValue = String(
                formData.object[normalField] ??
                    form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${normalField}']`)?.value ??
                    ""
            );
            if (value.trim() === "" || value.trim() === normalValue.trim()) {
                delete formData.object[field];
                formData.object[`system.enhanced.${key}`] = null;
            }
        }
        const features = formData.object["system.enhanced.features.innateFeatures"];
        if (typeof features === "string") {
            formData.object["system.enhanced.features.internalFeatureList"] = parseFeatures(features);
            delete formData.object["system.enhanced.features.innateFeatures"];
        }
        if (formData.object["system.castDuration.innateDuration"] !== undefined) {
            const duration = formData.object["system.castDuration.innateDuration"];
            formData.object["system.castDuration"] = parseCastDuration(typeof duration === "string" ? duration : "");
            delete formData.object["system.castDuration.innateDuration"];
        }
        return super._prepareSubmitData(event, form, formData, updateObject);
    }
}

function spellInputField(key: EnhancedSpellProperty, enhanced = false): string {
    const suffix =
        key === "damage" ? ".stringInput" : key === "features" ? ".innateFeatures" : enhanced ? ".value" : "";
    return `system.${enhanced ? "enhanced." : ""}${key}${suffix}`;
}

function hasEditedValue(form: HTMLFormElement, field: string): boolean {
    // Enter can submit the form before the focused input emits its change event.
    const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${field}']`);
    if (!input) return false;
    const initialValue =
        "defaultValue" in input
            ? input.defaultValue
            : ([...input.options].find((option) => option.defaultSelected)?.value ?? input.options[0]?.value ?? "");
    return input.value !== initialValue;
}
