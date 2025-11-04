import { parseFeatures } from "../dataModel/propertyModels/ItemFeaturesModel";
import { ApplicationRenderContext, SplittermondBaseItemSheet } from "module/data/SplittermondApplication.js";
import { foundryApi } from "module/api/foundryApi.js";
import { autoExpandInputs, changeValue } from "module/util/commonHtmlHandlers.js";
import { splittermond } from "module/config/index.js";
import { getSpellAvailabilityParser } from "module/item/availabilityParser";

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
        },
        tag: "form",
        classes: ["splittermond", "sheet", "item"],
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "editor", group: "primary", label: "splittermond.description" },
                { id: "properties", group: "primary", label: "splittermond.properties" },
            ],
            initial: "editor",
        },
    };

    static PARTS = {
        header: {
            template: "systems/splittermond/templates/sheets/item/header.hbs",
        },
        statBlock: {
            template: "systems/splittermond/templates/sheets/item/stat-block.hbs",
        },
        tabs: {
            template: "templates/generic/tab-navigation.hbs",
        },
        editor: {
            template: "systems/splittermond/templates/sheets/editor.hbs",
        },
        properties: {
            template: "systems/splittermond/templates/sheets/item/properties.hbs",
            classes: ["scrollable", "scrollable-margin-mitigation"],
        },
    };

    protected readonly localizer: Localizer;
    private itemSheetProperties: any[];

    constructor(
        options: any = {},
        private resolveProperty = foundryApi.utils.resolveProperty,
        localizer: Localizer = foundryApi,
        config: any = splittermond,
        private htmlEnricher = foundryApi.utils.enrichHtml,
        private availabilityParser = getSpellAvailabilityParser(foundryApi, splittermond.skillGroups.magic)
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

    async _preparePartContext(partId: string, context: any, options: any): Promise<any> {
        const data = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "editor":
                return await this.#prepareEditorPart(data);
            case "statBlock":
                return await this.#prepareStatBlockPart(data);
        }
        return data;
    }

    async #prepareEditorPart(context: any): Promise<any> {
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

    async #prepareStatBlockPart(context: any): Promise<any> {
        context.statBlock = this._getStatBlock();
        return context;
    }

    protected async _onRender(context: ApplicationRenderContext, options: any): Promise<void> {
        await super._onRender(context, options);
        autoExpandInputs(this.element);
    }

    static #increaseValue(_event: Event, target: HTMLElement): void {
        changeValue((input: number) => input + 1).for(target);
    }

    static #decreaseValue(_event: Event, target: HTMLElement): void {
        changeValue((input: number) => input - 1).for(target);
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
}
