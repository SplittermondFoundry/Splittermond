import SplittermondItemEffectsSheet from "./item-effects-sheet";
import { foundryApi } from "module/api/foundryApi";
import { isMacro } from "module/api/Macro";
import type { ApplicationFormConfiguration } from "module/api/Application";
import type { StatusEffectDataModelType } from "module/item/dataModel/StatusEffectDataModel";

interface MacroDropPayload {
    type: string;
    uuid: string;
}

const MACRO_UUID_FIELD = "system.combatEvent.macroRef.uuid";
const MACRO_NAME_FIELD = "system.combatEvent.macroRef.name";

function isFormElement(value: EventTarget | null): value is HTMLFormElement {
    return !!value && typeof (value as HTMLFormElement).querySelector === "function";
}

export default class StatusEffectItemSheet extends SplittermondItemEffectsSheet {
    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: ["splittermond", "sheet", "item", "statuseffect"],
    };

    async _onDrop(event: DragEvent): Promise<void> {
        const raw = event.dataTransfer?.getData("text/plain");
        let data: MacroDropPayload | null = null;
        try {
            data = raw ? (JSON.parse(raw) as MacroDropPayload) : null;
        } catch {
            return super._onDrop(event);
        }
        if (!data || data.type !== "Macro") {
            return super._onDrop(event);
        }
        const macro = await foundryApi.utils.fromUUID(data.uuid);
        await this.item.update({
            "system.combatEvent.macroRef.uuid": data.uuid,
            "system.combatEvent.macroRef.name": isMacro(macro) ? macro.name : null,
        });
    }

    protected async _onSubmitForm(formConfig: ApplicationFormConfiguration, event: Event | SubmitEvent): Promise<void> {
        const form = isFormElement(event.currentTarget) ? event.currentTarget : null;
        const system = this.item.system as Partial<StatusEffectDataModelType>;
        const previousUuid = system.combatEvent?.macroRef?.uuid ?? null;
        const submittedUuid = form ? this.#readField(form, MACRO_UUID_FIELD) : null;
        if (submittedUuid === previousUuid) {
            await super._onSubmitForm(formConfig, event);
            return;
        }
        const macro = submittedUuid ? await foundryApi.utils.fromUUID(submittedUuid) : null;
        const resolvedName = isMacro(macro) ? macro.name : null;
        await super._onSubmitForm(formConfig, event);
        await this.item.update({ [MACRO_NAME_FIELD]: resolvedName });
    }

    #readField(form: HTMLFormElement, name: string): string {
        const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        return input?.value ?? "";
    }
}
