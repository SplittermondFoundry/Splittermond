import { type ApplicationFormConfiguration, FoundryActiveEffectConfig } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";
import { addModifier } from "module/actor/addModifierAdapter";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import type { ModifierType } from "module/modifiers";
import type { AddModifierResult } from "module/modifiers/modifierAddition";
import { buildCostEffectData, buildScalarEffectData, isGenerated } from "module/activeEffect/effectBuilder";
import { modifierTypeForItemType, modifierTypeForEffectType } from "module/activeEffect/modifierTypeResolver";
import { ACTION_EFFECT_TYPES, type EffectType } from "module/activeEffect/dataModel/effectTypes";

const actionEffectTypes: ReadonlySet<EffectType> = new Set(ACTION_EFFECT_TYPES);

import { type ApplicationRenderContext, TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import type { SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";
import type { DurationMode } from "module/activeEffect/SplittermondActiveEffect";
import { type DurationUnit } from "module/config/activeEffect";
import { splittermond } from "module/config";
type ActiveEffectDocument = SplittermondActiveEffect;

const DURATION_MODE_PATH = "flags.splittermond.durationMode" as const;
const DURATION_VALUE_PATH = "duration.value" as const;
const DURATION_UNITS_PATH = "duration.units" as const;
const DURATION_EXPIRY_PATH = "duration.expiry" as const;
const TICK_EXPIRY = "roundEnd" as const;

export const DURATION_MODE_CHOICES = {
    timed: "splittermond.activeEffect.duration.timed",
    channelled: "splittermond.activeEffect.duration.channelled",
    permanent: "splittermond.activeEffect.duration.permanent",
} as const satisfies Record<DurationMode, string>;
const DURATION_UNIT_CHOICES = splittermond.activeEffect.duration.unitChoices;

function prepareDurationContext(
    context: ApplicationRenderContext,
    document: ActiveEffectDocument
): ApplicationRenderContext {
    const durationMode = document.durationMode;
    const duration = document.duration ?? {};
    const durationUnits = readDurationUnits(duration.units);

    context.durationMode = durationMode;
    context.durationModeChoices = DURATION_MODE_CHOICES;
    context.durationUnitChoices = DURATION_UNIT_CHOICES;
    context.durationUnits = durationUnits;
    context.durationValue = readTimedDurationValue(duration.value);
    context.durationExpiry = durationUnits === "rounds" ? TICK_EXPIRY : "";

    context.isExpired = durationMode === "timed" && document.duration.expired;

    const durationStatus = resolveDurationStatus(document);
    context.isCombatTime = durationStatus.isCombatTime;
    context.durationStart = durationStatus.startLabel;
    context.durationRemaining = durationStatus.remainingLabel;
    context.durationTimeTypeKey = durationStatus.timeTypeKey;
    return context;
}

function resolveDurationStatus(document: ActiveEffectDocument): {
    isCombatTime: boolean;
    startLabel: string | null;
    remainingLabel: string | null;
    timeTypeKey: string;
} {
    if (document.durationMode !== "timed") {
        return {
            isCombatTime: false,
            startLabel: null,
            remainingLabel: null,
            timeTypeKey: "splittermond.activeEffect.duration.timeTypeNone",
        };
    }

    const isCombatTime = document.duration.units === "rounds" || document.duration.units === "turns";

    if (isCombatTime) {
        const startRound = document.start.round;
        const startLabel = typeof startRound === "number" && Number.isFinite(startRound) ? String(startRound) : null;
        return {
            isCombatTime: true,
            startLabel,
            remainingLabel: document.duration.label || null,
            timeTypeKey: "splittermond.activeEffect.duration.timeTypeCombat",
        };
    }

    const startTime = document.start.time;
    const startLabel = typeof startTime === "number" && Number.isFinite(startTime) ? String(startTime) : null;
    return {
        isCombatTime: false,
        startLabel,
        remainingLabel: document.duration.label || null,
        timeTypeKey: "splittermond.activeEffect.duration.timeTypeWorld",
    };
}

function processDurationFormData(submitData: Record<string, unknown>): void {
    const durationMode = readDurationMode(readPath(submitData, DURATION_MODE_PATH));
    setPath(submitData, DURATION_MODE_PATH, durationMode);

    if (durationMode !== "timed") {
        setPath(submitData, DURATION_VALUE_PATH, null);
        setPath(submitData, DURATION_UNITS_PATH, "seconds");
        setPath(submitData, DURATION_EXPIRY_PATH, null);
        return;
    }

    const durationUnits = readDurationUnits(readPath(submitData, DURATION_UNITS_PATH));
    setPath(submitData, DURATION_VALUE_PATH, readTimedDurationValue(readPath(submitData, DURATION_VALUE_PATH)));
    setPath(submitData, DURATION_UNITS_PATH, durationUnits);
    setPath(submitData, DURATION_EXPIRY_PATH, durationUnits === "rounds" ? TICK_EXPIRY : null);
}

function readDurationMode(value: unknown): DurationMode {
    if (value === "timed" || value === "channelled" || value === "permanent") return value;
    return "permanent";
}

function readDurationUnits(value: unknown): DurationUnit {
    if (typeof value !== "string") return "rounds";
    return value in DURATION_UNIT_CHOICES ? (value as DurationUnit) : "rounds";
}

function readTimedDurationValue(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "string") {
        const parsedValue = Number(value);
        if (Number.isFinite(parsedValue) && parsedValue > 0) return parsedValue;
    }
    return 1;
}

function readPath(source: object, path: string): unknown {
    return foundryApi.utils.resolveProperty(source, path);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split(".");
    let current: Record<string, unknown> = target;
    for (const key of keys.slice(0, -1)) {
        const next = current[key];
        if (typeof next !== "object" || next === null || Array.isArray(next)) {
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
    }
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
}

export class BaseActiveEffectConfig extends FoundryActiveEffectConfig {
    static DEFAULT_OPTIONS = {
        classes: ["splittermond"],
        form: {
            submitOnChange: true,
            closeOnSubmit: false,
        },
        position: {
            width: 562,
        },
    };

    static PARTS = {
        ...(FoundryActiveEffectConfig.PARTS ?? {}),
        duration: {
            template: `${TEMPLATE_BASE_PATH}/sheets/active-effect/duration.hbs`,
        },
    };

    get document(): ActiveEffectDocument {
        return super.document as ActiveEffectDocument;
    }

    async _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options?: object
    ): Promise<ApplicationRenderContext> {
        const partContext = await super._preparePartContext(partId, context, options ?? {});
        if (partId !== "duration") return partContext;
        return prepareDurationContext(partContext, this.document);
    }

    _processFormData(event: Event, form: HTMLFormElement, formData: { object: Record<string, unknown> }): object {
        const submitData = super._processFormData(event, form, formData) as Record<string, unknown>;
        processDurationFormData(submitData);
        return submitData;
    }
}

export class SplittermondActiveEffectConfig extends FoundryActiveEffectConfig {
    static DEFAULT_OPTIONS = {
        classes: ["splittermond"],
        form: {
            submitOnChange: true,
            closeOnSubmit: false,
        },
        position: {
            width: 562,
        },
    };
    static PARTS = {
        ...(FoundryActiveEffectConfig.PARTS ?? {}),
        duration: {
            template: `${TEMPLATE_BASE_PATH}/sheets/active-effect/duration.hbs`,
        },
        changes: {
            template: `${TEMPLATE_BASE_PATH}/sheets/active-effect/effects.hbs`,
        },
    };

    get document(): ActiveEffectDocument {
        return super.document as ActiveEffectDocument;
    }

    protected async _onSubmitForm(formConfig: ApplicationFormConfiguration, event: Event | SubmitEvent): Promise<void> {
        if (isGenerated(this.document)) {
            event.preventDefault();
            return;
        }
        const warningKey = this.#getTypeMismatchWarningKey(event.currentTarget);
        if (warningKey) {
            event.preventDefault();
            foundryApi.warnUser(warningKey);
            return;
        }
        await super._onSubmitForm(formConfig, event);
    }

    async _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options?: object
    ): Promise<ApplicationRenderContext> {
        const partContext = await super._preparePartContext(partId, context, options ?? {});
        if (isGenerated(this.document)) {
            partContext.editable = false;
        }
        if (partId === "duration") return prepareDurationContext(partContext, this.document);
        if (partId !== "changes") return partContext;
        return this.#prepareEffectsContext(partContext);
    }

    async #prepareEffectsContext(context: ApplicationRenderContext): Promise<ApplicationRenderContext> {
        const effect = this.document;
        const effectType = effect.type;
        if (this.#isModifierType(effectType)) {
            const rawInput = effect.getFlag("splittermond", "rawInput");
            context.effectsType = "modifier";
            context.rawInput = (typeof rawInput === "string" && rawInput.trim()) || "";
            context.modifierHelpText = await foundryApi.utils.enrichHtml(
                foundryApi.localize("splittermond.activeEffect.effects.modifierHelpText"),
                {
                    secrets: this.document.isOwner,
                    relativeTo: this.document,
                }
            );
            return context;
        }

        context.effectsType = "base";
        return context;
    }

    _processFormData(event: Event, form: HTMLFormElement, formData: { object: Record<string, unknown> }): object {
        const submitData = super._processFormData(event, form, formData) as Record<string, unknown>;
        processDurationFormData(submitData);
        return this.#processModifierFormData(submitData);
    }

    #processModifierFormData(submitData: Record<string, unknown>): Record<string, unknown> {
        if (!this.#isModifierType(this.document.type)) return submitData;
        const rawInput = this.#readString(submitData, "splittermondRawInput");
        delete submitData.splittermondRawInput;
        if (!rawInput) return submitData;
        const parsed = this.#parse(rawInput);
        const taggedModifier = parsed.modifiers[0] ?? null;
        const taggedCostModifier = parsed.costModifiers[0] ?? null;
        const effectData = taggedModifier
            ? buildScalarEffectData(taggedModifier, this.document.uuid)
            : taggedCostModifier
              ? buildCostEffectData(taggedCostModifier.modifier, taggedCostModifier.rawFragment, this.document.uuid)
              : null;
        if (!effectData) return submitData;
        submitData.type = effectData.type;
        submitData.system = effectData.system;
        submitData.flags = foundryApi.utils.mergeObject((submitData.flags as object) ?? {}, {
            splittermond: {
                rawInput,
            },
        });
        return submitData;
    }

    #parse(rawInput: string): AddModifierResult {
        return addModifier(this.#buildModifierSource(rawInput), rawInput, this.getModifierType());
    }

    private getModifierType(): ModifierType | null {
        const item = this.document.item;
        if (item) {
            return modifierTypeForItemType(item.type);
        }
        return modifierTypeForEffectType(this.document.type);
    }

    #buildModifierSource(name: string): IModifierSource {
        const parent = this.document.parent;
        return {
            name,
            actor: parent?.documentName === "Actor" ? (parent as unknown as IModifierSource["actor"]) : null,
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
            if (parsed.modifiers.length + parsed.costModifiers.length > 1) {
                return "splittermond.activeEffect.error.singleModifierOnly";
            }
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
        return actionEffectTypes.has(effectType as EffectType);
    }
}
