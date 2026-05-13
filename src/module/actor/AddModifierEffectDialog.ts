import { FoundryDialog } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";
import type SplittermondActor from "module/actor/actor";
import { addModifier } from "module/actor/addModifierAdapter";
import { buildScalarEffectData, buildCostEffectData } from "module/activeEffect/effectBuilder";
import type { IModifierSource } from "module/modifiers/IModifierSource";

export class AddModifierEffectDialog extends FoundryDialog {
    static DEFAULT_OPTIONS = {
        window: { title: "splittermond.addModifierEffect" },
        position: { width: 400 },
        classes: ["splittermond", "dialog"],
    };

    constructor(private readonly actor: SplittermondActor) {
        super({
            content: `<form class="standard-form">
                <div class="form-group">
                    <label>${foundryApi.localize("splittermond.modifier")}</label>
                    <input name="modifierString" type="text" placeholder="skills +2" autofocus/>
                </div>
            </form>`,
            buttons: [
                {
                    label: foundryApi.localize("splittermond.ok"),
                    action: "confirm",
                    callback: (_e: Event, button: HTMLButtonElement) => this.#onConfirm(button),
                },
                {
                    label: foundryApi.localize("splittermond.cancel"),
                    action: "close",
                },
            ],
        });
    }

    async #onConfirm(button: HTMLButtonElement): Promise<void> {
        const form = button.closest("form") as HTMLFormElement;
        const modifierString = (form.elements.namedItem("modifierString") as HTMLInputElement).value.trim();

        if (!modifierString) return;

        const itemProxy: IModifierSource = {
            name: modifierString,
            actor: this.actor,
            uuid: this.actor.uuid,
            isOwner: this.actor.isOwner,
        };

        const { modifiers, costModifiers } = addModifier(itemProxy, modifierString, null, 1);

        const effectDataArray = [
            ...modifiers.map(({ modifier, rawFragment }) =>
                buildScalarEffectData(modifier, rawFragment, this.actor.uuid)
            ),
            ...costModifiers.map(({ modifier, rawFragment }) =>
                buildCostEffectData(modifier, rawFragment, this.actor.uuid)
            ),
        ];

        if (effectDataArray.length > 0) {
            await this.actor.createEmbeddedDocuments("ActiveEffect", effectDataArray);
        }
    }
}
