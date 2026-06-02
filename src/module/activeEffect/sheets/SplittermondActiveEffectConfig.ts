import {type ApplicationFormConfiguration, FoundryActiveEffectConfig} from "module/api/Application";
import {foundryApi} from "module/api/foundryApi";
import {addModifier} from "module/actor/addModifierAdapter";
import type {IModifierSource} from "module/modifiers/IModifierSource";
import type {ModifierType} from "module/modifiers";
import type {AddModifierResult} from "module/modifiers/modifierAddition";
import {MODIFIER_TYPES} from "module/activeEffect/dataModel/effectTypes";
import {buildCostEffectData, buildScalarEffectData} from "module/activeEffect/effectBuilder";
import {type ApplicationRenderContext, TEMPLATE_BASE_PATH} from "module/data/SplittermondApplication";

type ActiveEffectDocument = FoundryDocument & {
    type: string;
    uuid: string;
    system: Record<string, unknown>;
    parent?: FoundryDocument;
    getFlag: (scope: string, key: string) => unknown;
};

export class BaseActiveEffectConfig extends FoundryActiveEffectConfig {
    static DEFAULT_OPTIONS= {
        classes: ["splittermond"],
        position: {
            width: 562
        }
    }

}

export class SplittermondActiveEffectConfig extends FoundryActiveEffectConfig {
    static DEFAULT_OPTIONS= {
        classes: ["splittermond"],
        position: {
            width: 562
        }
    }
    static PARTS = {
        ...(FoundryActiveEffectConfig.PARTS ?? {}),
        changes: {
            template: `${TEMPLATE_BASE_PATH}/sheets/active-effect/effects.hbs`,
        },
    };

    get document(): ActiveEffectDocument {
        return super.document as ActiveEffectDocument;
    }

    protected async _onSubmitForm(
        formConfig: ApplicationFormConfiguration,
        event: Event | SubmitEvent,
    ): Promise<void> {
        const warningKey = this.#getTypeMismatchWarningKey(event.currentTarget);
        if (warningKey) {
            event.preventDefault();
            foundryApi.warnUser(warningKey);
            return;
        }
        await super._onSubmitForm(formConfig, event);
    }

    async _preparePartContext(partId: string, context: ApplicationRenderContext, options?: object): Promise<ApplicationRenderContext> {
        const partContext = (await super._preparePartContext(partId, context, options ?? {}));
        if (partId !== "changes") return partContext;
        return this.#prepareEffectsContext(partContext);
    }

    async #prepareEffectsContext(context: ApplicationRenderContext): Promise<ApplicationRenderContext> {
        const effect = this.document;
        const effectType = effect.type;
        if (this.#isModifierType(effectType)) {
            const rawInput = effect.getFlag("splittermond", "rawInput");
            context.effectsType = "modifier";
            context.rawInput = (typeof rawInput === "string" && rawInput.trim()) || effect.name || "";
            context.modifierHelpText = await foundryApi.utils.enrichHtml(
                foundryApi.localize("splittermond.activeEffect.effects.modifierHelpText"),
                {
                    secrets: this.document.isOwner,
                    relativeTo: this.document,
                },
            );
            return context;
        }

        if (effectType === "costModifier") {
            context.effectsType = "costModifier";
            context.costFormula = `${effect.system.label ?? ""}`;
            const skill = effect.system.skill;
            context.costSkill = typeof skill === "string" ? skill : "";
            return context;
        }

        context.effectsType = "base";
        return context;
    }

    _processFormData(event: Event, form: HTMLFormElement, formData: { object: Record<string, unknown> }): object {
        const submitData = super._processFormData(event, form, formData) as Record<string, unknown>;
        if (this.#isModifierType(this.document.type)) {
            const rawInput = this.#readString(submitData, "splittermondRawInput");
            delete submitData.splittermondRawInput;
            if (!rawInput) return submitData;
            const parsed = this.#parse(rawInput);
            const taggedModifier = parsed.modifiers[0] ?? null;
            if (!taggedModifier) return submitData;
            const effectData = buildScalarEffectData(taggedModifier.modifier, taggedModifier.rawFragment, this.document.uuid);
            submitData.type = effectData.type;
            submitData.system = effectData.system;
            submitData.flags = foundryApi.utils.mergeObject((submitData.flags as object) ?? {}, {
                splittermond: {
                    rawInput,
                },
            });
            return submitData;
        }

        if (this.document.type === "costModifier") {
            const label = this.#readString(submitData, "splittermondCostFormula");
            const skill = this.#readString(submitData, "splittermondCostSkill");
            delete submitData.splittermondCostFormula;
            delete submitData.splittermondCostSkill;
            if (!label) return submitData;
            const parsed = this.#parse(label);
            const taggedCostModifier = parsed.costModifiers[0] ?? null;
            if (!taggedCostModifier) return submitData;
            const effectData = buildCostEffectData(taggedCostModifier.modifier, taggedCostModifier.rawFragment, this.document.uuid);
            const system = {
                ...effectData.system,
                skill: skill || null,
            };
            submitData.type = effectData.type;
            submitData.system = system;
            submitData.flags = foundryApi.utils.mergeObject((submitData.flags as object) ?? {}, {
                splittermond: {
                    rawInput: label,
                },
            });
        }

        return submitData;
    }

    #parse(rawInput: string): AddModifierResult {
        return addModifier(this.#buildModifierSource(rawInput), rawInput, null as unknown as ModifierType, 1);
    }

    #buildModifierSource(name: string): IModifierSource {
        const parent = this.document.parent;
        return {
            name,
            actor: parent?.documentName === "Actor"
                ? (parent as unknown as IModifierSource["actor"])
                : null,
            uuid: this.document.uuid,
            isOwner: true,
        };
    }

    #getTypeMismatchWarningKey(submitTarget: EventTarget | null): string | null {
        if (!(submitTarget instanceof HTMLFormElement)) return null;
        if (this.#isModifierType(this.document.type)) {
            const rawInput = this.#readInputValue(submitTarget, "splittermondRawInput");
            if (!rawInput) return null;
            const parsed = this.#parse(rawInput);
            const hasScalar = parsed.modifiers.length > 0;
            const hasCost = parsed.costModifiers.length > 0;
            if ((parsed.modifiers.length + parsed.costModifiers.length) > 1) {
                return "splittermond.activeEffect.error.singleModifierOnly";
            }
            if (!hasScalar && hasCost) return "splittermond.activeEffect.error.wrongModifierType";
        }else if (this.document.type === "costModifier") {
            const label = this.#readInputValue(submitTarget, "splittermondCostFormula");
            if (!label) return null;
            const parsed = this.#parse(label);
            const hasCost = parsed.costModifiers.length > 0;
            const hasScalar = parsed.modifiers.length > 0;
            if ((parsed.modifiers.length + parsed.costModifiers.length) > 1) {
                return "splittermond.activeEffect.error.singleCostModifierOnly";
            }
            if (!hasCost && hasScalar) return "splittermond.activeEffect.error.wrongCostModifierType";
        }
        return null;
    }

    #readInputValue(form: HTMLFormElement, inputName: string): string {
        const input = form.elements.namedItem(inputName);
        if (!(input instanceof HTMLInputElement)) return "";
        return input.value.trim();
    }

    #readString(data: Record<string, unknown>, key: string): string {
        const value = data[key];
        return typeof value === "string" ? value.trim() : "";
    }

    #isModifierType(effectType: string): boolean {
        return MODIFIER_TYPES.includes(effectType as (typeof MODIFIER_TYPES)[number]);
    }
}
