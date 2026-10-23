import { foundryApi } from "module/api/foundryApi";

interface ModifierDraft {
    value: string | null;
    index: number;
    active: boolean;
}

export function renderModifierDrafts(output: HTMLOutputElement, drafts: readonly ModifierDraft[]) {
    const document = output.ownerDocument;
    const fragments = drafts.map((draft) => {
        const fragment = document.createElement("span");
        fragment.className = "modifier-helper-fragment";
        fragment.classList.toggle("active", draft.active);
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "modifier-helper-edit";
        edit.dataset.action = "editModifier";
        edit.dataset.index = String(draft.index);
        edit.dataset.tooltip = foundryApi.localize("splittermond.modifierHelper.edit");
        edit.textContent = draft.value ?? foundryApi.localize("splittermond.modifierHelper.incomplete");
        edit.disabled = draft.active;
        fragment.append(edit);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "modifier-helper-remove";
        remove.dataset.action = "removeModifier";
        remove.dataset.index = String(draft.index);
        remove.dataset.tooltip = foundryApi.localize("splittermond.modifierHelper.remove");
        remove.setAttribute("aria-label", remove.dataset.tooltip);
        const icon = document.createElement("i");
        icon.className = "fa fa-trash";
        icon.setAttribute("aria-hidden", "true");
        remove.append(icon);
        fragment.append(remove);
        return fragment;
    });
    output.replaceChildren(
        ...fragments.flatMap((fragment, index) => (index ? [document.createTextNode(", "), fragment] : [fragment]))
    );
}
