import { parseFeatures } from "../dataModel/propertyModels/ItemFeaturesModel";
import {
    ApplicationRenderContext,
    SplittermondBaseItemSheet,
    TEMPLATE_BASE_PATH,
} from "module/data/SplittermondApplication";
import { foundryApi } from "module/api/foundryApi.js";
import { autoExpandInputs, changeValue } from "module/util/commonHtmlHandlers.js";
import { splittermond } from "module/config/index.js";
import { getMasteryAvailabilityParser, getSpellAvailabilityParser } from "module/item/availabilityParser";
import { addModifierEffects } from "module/activeEffect/effectBuilder";
import type { ItemType } from "module/config/itemTypes";
import { SplittermondActiveEffect } from "module/activeEffect";
import { SplittermondActiveEffectCreationDialog } from "module/activeEffect/sheets/SplittermondActiveEffectCreationDialog";
import { getAddModifier } from "module/item/item";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import type { ModifierType } from "module/modifiers";
import type { AddModifierResult } from "module/modifiers/modifierAddition";
import type { HandlebarsRenderOptions } from "module/api/Application";
import ApplicationRenderOptions = foundry.applications.types.ApplicationRenderOptions;

interface ItemSheetData {
    cssClass: string;
    editable: any;
    document: any;
    data: any;
    limited: any;
    options: any;
    owner: any;
    title: string;
    type: string;
}

interface SplittermondItemSheetData extends ItemSheetData {
    itemProperties: any;
    statBlock: any;
    typeLabel: string;
    item?: any;
}

interface Localizer {
    localize: (key: string) => string;
}

interface InputItemProperty {
    field: string;
    value?: any;
    template?: string;
    placeholderText?: string;
    label?: string;
    help?: string;
}

interface ItemSheetPropertyDisplayProperty extends InputItemProperty {}

interface PropertyGroup {
    properties: (InputItemProperty | ItemSheetPropertyDisplayProperty)[];
}

type SplittermondItemSheetProperties = PropertyGroup[];

interface StatBlockEntry {
    label: string;
    value: string;
}

export default class SplittermondItemSheet extends SplittermondBaseItemSheet {
    static DEFAULT_OPTIONS = {
        form: {
            submitOnChange: true,
        },
        actions: {
            "dec-value": SplittermondItemSheet.#decreaseValue,
            "inc-value": SplittermondItemSheet.#increaseValue,
            "add-effect": SplittermondItemSheet.#addEffect,
            "open-effect-dialog": SplittermondItemSheet.#openEffectDialog,
            "delete-effect": SplittermondItemSheet.#deleteEffect,
            "toggle-effect": SplittermondItemSheet.#toggleEffect,
            "edit-effect": SplittermondItemSheet.#editEffect,
        },
        tag: "form",
        classes: ["splittermond", "sheet", "item"],
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "editor", group: "primary", label: "splittermond.description" },
                { id: "properties", group: "primary", label: "splittermond.properties" },
                { id: "effects", group: "primary", label: "splittermond.effects" },
            ],
            initial: "editor",
        },
    };

    static PARTS = {
        header: {
            template: `${TEMPLATE_BASE_PATH}/sheets/item/header.hbs`,
        },
        statBlock: {
            template: `${TEMPLATE_BASE_PATH}/sheets/item/stat-block.hbs`,
        },
        tabs: {
            template: "templates/generic/tab-navigation.hbs",
        },
        editor: {
            template: `${TEMPLATE_BASE_PATH}/sheets/editor.hbs`,
        },
        properties: {
            template: `${TEMPLATE_BASE_PATH}/sheets/item/properties.hbs`,
            scrollable: [""],
            classes: ["scrollable", "scrollable-margin-mitigation"],
        },
        effects: {
            template: `${TEMPLATE_BASE_PATH}/sheets/item/effects.hbs`,
            scrollable: [""],
            classes: ["scrollable", "scrollable-margin-mitigation"],
        },
    };

    protected readonly localizer: Localizer;
    private itemSheetProperties: any[];
    private availabilityParser: AvailabilityParser;

    constructor(
        options: any = {},
        private resolveProperty = foundryApi.utils.resolveProperty,
        localizer: Localizer = foundryApi,
        config: any = splittermond,
        private htmlEnricher = foundryApi.utils.enrichHtml,
        availabilityParser: AvailabilityParser | null = null
    ) {
        const item = options.document;
        const displayProperties =
            config.displayOptions.itemSheet[item.type] || config.displayOptions.itemSheet["default"];
        options.position = {
            width: displayProperties.width,
            height: displayProperties.height,
            ...(options.position ?? {}),
        };
        super(options);
        this.localizer = localizer;
        this.itemSheetProperties = config.itemSheetProperties[this.item.type] || [];
        this.availabilityParser = this.resolveParser(availabilityParser, this.item.type);
    }

    protected async _prepareContext(options: any): Promise<ApplicationRenderContext & SplittermondItemSheetData> {
        const data = (await super._prepareContext(options)) as any;
        data.itemProperties = await this._getItemProperties();
        data.typeLabel = "splittermond." + this.item.type;
        data.item = this.item;

        return data;
    }

    private async _getItemProperties(): Promise<SplittermondItemSheetProperties> {
        const promisesToAwait: Promise<string>[] = [];
        const sheetProperties: SplittermondItemSheetProperties = foundryApi.utils.deepClone(this.itemSheetProperties);
        sheetProperties.forEach((grp) => {
            grp.properties.forEach(async (prop: InputItemProperty | ItemSheetPropertyDisplayProperty) => {
                prop.value = this.resolveProperty(this.item, prop.field);
                /*
                 * These type guards exist because our multiselects cannot handle an undefined or null option well.
                 * However,Foundry seems to like to use null for nullable boolean values. If that is the case
                 * This guard will convert all falsy to truthy values.
                 */
                if (prop.template === "select" && prop.value === undefined) {
                    prop.value = "undefined";
                }
                if (prop.template === "select" && prop.value === null) {
                    prop.value = "null";
                }
                prop.placeholderText = prop.placeholderText ?? prop.label;
                if (prop.help) {
                    const promisedHelp = this.htmlEnricher(this.localizer.localize(prop.help));
                    //Push promises first. Else, they will have ceased to exist.
                    promisesToAwait.push(promisedHelp);
                    prop.help = await promisedHelp;
                }
            });
        });
        //We await the promises in the foreach function, but we don't return properties there, so the outermost function
        //has no way of knowing that stuff needs to be awaited. Thus, we await the promises here and return the properties
        await Promise.all(promisesToAwait);
        return sheetProperties;
    }

    protected _getStatBlock(): StatBlockEntry[] {
        return [];
    }

    async _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: Partial<HandlebarsRenderOptions>
    ): Promise<any> {
        const data = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "editor":
                return await this.#prepareEditorPart(data);
            case "statBlock":
                return await this.#prepareStatBlockPart(data);
            case "effects":
                return await this.#prepareEffectsPart(data);
        }
        return data;
    }

    async #prepareEditorPart(context: ApplicationRenderContext): Promise<ApplicationRenderContext> {
        context.editor = {
            value: this.item.system.description ?? "",
            target: "system.description",
            content: await this.htmlEnricher(this.document.system.description ?? "", {
                secrets: this.document.isOwner,
                relativeTo: this.document,
            }),
        };
        context.editable = context.editable ?? false;
        return context;
    }

    async #prepareStatBlockPart(context: ApplicationRenderContext): Promise<ApplicationRenderContext> {
        context.statBlock = this._getStatBlock();
        return context;
    }

    async #prepareEffectsPart(context: ApplicationRenderContext): Promise<ApplicationRenderContext> {
        const effects = this.item.effects.map((e: any) => ({
            id: e.id,
            name: e.name,
            disabled: e.disabled,
        }));
        context.effects = effects;
        context.modifierHelpText = await this.htmlEnricher(this.localizer.localize("splittermond.modificatorHelpText"));
        return context;
    }

    /* async _onDragStart(event: DragEvent): Promise<void> {
        const target = event.target instanceof HTMLElement ? event.target : null;
        const effectId = target?.closest<HTMLElement>("[data-effect-id]")?.dataset.effectId;
        if (effectId) {
            const effect = this.item.effects.get(effectId);
            if (effect) {
                event.dataTransfer?.setData("text/plain", JSON.stringify({ type: "ActiveEffect", uuid: effect.uuid }));
                return;
            }
        }
        return super._onDragStart(event);
    }*/

    protected async _onRender(context: ApplicationRenderContext, options: ApplicationRenderOptions): Promise<void> {
        await super._onRender(context, options);
        autoExpandInputs(this.element);

        const modifierInput = this.element.querySelector<HTMLInputElement>(".effect-modifier-input");
        if (modifierInput) {
            modifierInput.addEventListener("keydown", (event: KeyboardEvent) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    const addButton = this.element.querySelector<HTMLButtonElement>("[data-action='add-effect']");
                    addButton?.click();
                }
            });
        }
    }

    static #increaseValue(_event: Event, target: HTMLElement): void {
        changeValue((input: number) => input + 1).for(target);
    }

    static #decreaseValue(_event: Event, target: HTMLElement): void {
        changeValue((input: number) => input - 1).for(target);
    }

    static async #addEffect(this: SplittermondItemSheet, _event: Event, _target: HTMLElement): Promise<void> {
        const input = this.element.querySelector<HTMLInputElement>(".effect-modifier-input");
        if (!input) return;
        const modifierString = input.value.trim();
        if (!modifierString) return;
        const modifierFn = getAddModifier() as
            ((item: IModifierSource, str: string, type: ModifierType, multiplier: number) => AddModifierResult) | null;
        if (!modifierFn) return;
        await addModifierEffects(modifierFn, this.item, modifierString);
        input.value = "";
        this.render();
    }

    static async #deleteEffect(this: SplittermondItemSheet, _event: Event, target: HTMLElement): Promise<void> {
        const card = target.closest<HTMLElement>("[data-effect-id]");
        const effectId = card?.dataset.effectId;
        if (!effectId) return;
        await this.item.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
        this.render();
    }

    static async #toggleEffect(this: SplittermondItemSheet, _event: Event, target: HTMLElement): Promise<void> {
        const card = target.closest<HTMLElement>("[data-effect-id]");
        const effectId = card?.dataset.effectId;
        if (!effectId) return;
        const effect = this.item.effects.get(effectId);
        if (!effect) return;
        await effect.update({ disabled: !effect.disabled });
        this.render();
    }

    static async #editEffect(this: SplittermondItemSheet, _event: Event, target: HTMLElement): Promise<void> {
        const card = target.closest<HTMLElement>("[data-effect-id]");
        const effectId = card?.dataset.effectId;
        if (!effectId) return;
        const effect = this.item.effects.get(effectId);
        effect?.sheet?.render({ force: true });
    }

    static async #openEffectDialog(this: SplittermondItemSheet): Promise<void> {
        await SplittermondActiveEffectCreationDialog.show(SplittermondActiveEffect, {}, { parent: this.item });
    }

    roll(): void {}

    _prepareSubmitData(event: SubmitEvent, form: HTMLFormElement, formData: any, updateObject: object = {}): object {
        const featureAddress = "system.features.innateFeatures";
        let submitObject: any = {};
        if (featureAddress in formData.object) {
            const attackFeatures = formData.object[featureAddress];
            delete formData.object[featureAddress];
            const mappedFormData = {
                system: {
                    features: {
                        internalFeatureList: parseFeatures(attackFeatures),
                    },
                },
            };
            submitObject = foundryApi.utils.mergeObject(updateObject, mappedFormData);
        }
        if ("availableIn" in formData.object) {
            formData.object["system.availableIn"] = this.availabilityParser.toInternalRepresentation(
                formData.object.availableIn
            );
            delete formData.availableIn;
        }
        return super._prepareSubmitData(event, form, formData, submitObject);
    }

    private resolveParser(userSet: AvailabilityParser | null, itemType: ItemType) {
        if (userSet) return userSet;
        return itemType === "spell"
            ? getSpellAvailabilityParser(foundryApi, splittermond.skillGroups.magic)
            : getMasteryAvailabilityParser(foundryApi, splittermond.skillGroups.all);
    }
}

type AvailabilityParser =
    ReturnType<typeof getSpellAvailabilityParser> | ReturnType<typeof getMasteryAvailabilityParser>;
