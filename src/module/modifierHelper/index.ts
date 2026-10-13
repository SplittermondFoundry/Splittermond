import type { ScalarRegistry, CostRegistry, ModifierType } from "module/modifiers";
import type { IAddModifier } from "module/actor/addModifierAdapter";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import { ModifierHelper } from "./ModifierHelper";
import { modifierCatalogue } from "./catalogue";
import { foundryApi } from "module/api/foundryApi";

interface ModifierModule {
    modifierRegistry: ScalarRegistry;
    costModifierRegistry: CostRegistry;
    addModifier: IAddModifier;
}

let modifierModule: ModifierModule | undefined;

export function initializeModifierHelper(module: ModifierModule) {
    modifierModule = module;
}

export function openModifierHelper(
    source: IModifierSource,
    type: ModifierType,
    getInput: () => HTMLInputElement | null,
    options: { append?: boolean; submitOnChange?: boolean; item?: { name: string; type: string } | null } = {}
): ModifierHelper | null {
    const { append = false, submitOnChange = true } = options;
    const item = options.item;
    const input = getInput();
    if (!modifierModule || !input || input.disabled || input.readOnly) return null;
    const { modifierRegistry, costModifierRegistry, addModifier } = modifierModule;
    const definitions = modifierCatalogue(
        modifierRegistry.getConfigurations(() => {}, source, type),
        costModifierRegistry.getConfigurations(() => {}, source, type)
    );
    if (!definitions.length) return null;
    const helper = new ModifierHelper({
        definitions,
        initial: append ? "" : input.value,
        multiple: append,
        target:
            item && (item.type === "weapon" || item.type === "armor" || item.type === "shield")
                ? { name: item.name, type: item.type }
                : undefined,
        validate: (raw) => {
            const result = addModifier(
                { name: source.name, actor: source.actor, uuid: source.uuid, isOwner: false },
                raw,
                type
            );
            if (result.hasErrors) {
                return result.diagnostics?.length
                    ? result.diagnostics
                    : [{ message: foundryApi.localize("splittermond.modifierHelper.invalid") }];
            }
            return result.modifiers.length + result.costModifiers.length > 0
                ? []
                : [{ attribute: "value", message: foundryApi.localize("splittermond.modifierHelper.noEffect") }];
        },
        apply: (raw) => {
            const current = getInput();
            if (!current?.isConnected || current.disabled || current.readOnly) return false;
            current.value = append && current.value.trim() ? `${current.value.trim().replace(/,$/, "")}, ${raw}` : raw;
            current.dispatchEvent(new Event("input", { bubbles: true }));
            if (submitOnChange) current.dispatchEvent(new Event("change", { bubbles: true }));
            current.focus();
            return true;
        },
    });
    helper.render(true);
    return helper;
}
