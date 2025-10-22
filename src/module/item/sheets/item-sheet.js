import { parseFeatures } from "../dataModel/propertyModels/ItemFeaturesModel";
import { SplittermondBaseItemSheet } from "module/data/SplittermondApplication.js";
import { foundryApi } from "module/api/foundryApi.js";

export default class SplittermondItemSheet extends SplittermondBaseItemSheet {
    /** @type {Partial<ApplicationOptions>} */
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
                { id: "description", group: "primary", label: "splittermond.description" },
                { id: "properties", group: "primary", label: "splittermond.properties" },
            ],
            initial: "description",
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
        description: {
            template: "systems/splittermond/templates/sheets/description.hbs",
        },
        properties: {
            template: "systems/splittermond/templates/sheets/item/properties.hbs",
            classes: ["scrollable", "scrollable-margin-mitigation"],
        },
    };

    /**
     * @param {document: SplittermondItem} options
     * @param {{getProperty:(object, string)=> unknown}} propertyResolver
     * @param {{localize:(string)=>string}} localizer
     * @param config
     * @param {enrichHTML:(string)=>Promise<string>} textEditor
     */
    constructor(
        options = {},
        propertyResolver = foundry.utils,
        localizer = foundryApi,
        config = CONFIG.splittermond,
        textEditor = foundry.applications.ux.TextEditor.implementation
    ) {
        const item = options.document;
        var displayProperties =
            config.displayOptions.itemSheet[item.type] || config.displayOptions.itemSheet["default"];
        options.position = {
            width: displayProperties.width,
            height: displayProperties.height,
            ...(options.position ?? {}),
        };
        super(options);
        this.propertyResolver = propertyResolver;
        this.localizer = localizer;
        this.itemSheetProperties = config.itemSheetProperties[this.item.type] || [];
        this.textEditor = textEditor;
    }

    /**
     * @typedef SplittermondItemSheetData
     * @type {ItemSheetData & { itemProperties: any, statBlock: any, typeLabel: string}}
     */

    /**
     * @override
     * @param {options: HandlebarsRenderOptions} options
     * @returns {Promise<ApplicationRenderContext & SplittermondItemSheetData>}
     * @protected
     */
    async _prepareContext(options) {
        /**
         * @typedef ItemSheetData
         * @type {{cssClass:string, editable:any, document: ClientDocument, data: any, limited: any, options: any, owner: any,title: string, type: string}}
         */
        const data = await super._prepareContext(options);
        data.itemProperties = await this._getItemProperties();
        data.typeLabel = "splittermond." + this.item.type;
        data.item = this.item;

        return data;
    }

    /**
     * @returns {!SplittermondItemSheetProperties}
     * @private
     */
    async _getItemProperties() {
        /**
         * @type SplittermondItemSheetProperties
         */
        const promisesToAwait = [];
        let sheetProperties = duplicate(this.itemSheetProperties);
        sheetProperties.forEach((grp) => {
            grp.properties.forEach(async (/** @type {InputItemProperty|ItemSheetPropertyDisplayProperty}*/ prop) => {
                prop.value = this.propertyResolver.getProperty(this.item, prop.field);
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
                    const promisedHelp = this.textEditor.enrichHTML(this.localizer.localize(prop.help));
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

    _getStatBlock() {
        return [];
    }

    async _preparePartContext(partId, context, options) {
        const data = await super._preparePartContext(partId, context, options);
        switch (partId) {
            case "description":
                return await this.#prepareDescriptionPart(data);
            case "statBlock":
                return await this.#prepareStatBlockPart(data);
        }
        return data;
    }

    async #prepareDescriptionPart(context) {
        context.description = await this.textEditor.enrichHTML(this.document.system.description, {
            secrets: this.document.isOwner,
            relativeTo: this.document,
        });
        context.editable = context.editable ?? false;
        return context;
    }

    async #prepareStatBlockPart(context) {
        context.statBlock = this._getStatBlock();
        return context;
    }

    /**
     * @param {ApplicationRenderContext} context
     * @param {HandlebarsRenderOptions} options
     * @return {Promise<void>}
     * @protected
     */
    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element); //Deprecated: use this.element directly
        html.find("input.autoexpand")
            .on("input", function () {
                let dummyElement = $('<span id="autoexpanddummy"/>').hide();
                $(this).after(dummyElement);
                dummyElement.text($(this).val() || $(this).text() || $(this).attr("placeholder"));
                $(this).css({
                    width: dummyElement.width(),
                });
                dummyElement.remove();
            })
            .trigger("input");
    }

    /**
     * @param {Event}__
     * @param {HTMLElement} target
     * @private
     */
    static #increaseValue(__, target) {
        SplittermondItemSheet.#changeValue((input) => input + 1).for(target);
    }

    /**
     * @param {Event} __
     * @param {HTMLElement} target
     * @private
     */
    static #decreaseValue(__, target) {
        SplittermondItemSheet.#changeValue((input) => input - 1).for(target);
    }

    /**
     * @param {(a:number)=>number}operation
     * @private
     */
    static #changeValue(operation) {
        return {
            /** @param {HTMLElement} target*/
            for(target) {
                const matchingInput = target.parentElement.querySelector("input");
                const newValue = operation(matchingInput?.valueAsNumber);
                matchingInput.value = isNaN(newValue) ? matchingInput.value : `${newValue}`;
                matchingInput?.dispatchEvent(new Event("input", { bubbles: true }));
                matchingInput?.dispatchEvent(new Event("change", { bubbles: true }));
            },
        };
    }

    roll() {}

    _prepareSubmitData(event, form, formData, updateObject) {
        const featureAddress = "system.features.innateFeatures";
        let submitObject = {};
        if (featureAddress in formData.object) {
            const attackFeatures = formData.object[featureAddress];
            delete formData.object[featureAddress];
            /**@type {?name:string, system:Partial<DataModelConstructorInput<WeaponDataModel>>} */
            const mappedFormData = {
                system: {
                    features: {
                        internalFeatureList: parseFeatures(attackFeatures),
                    },
                },
            };
            submitObject = foundryApi.utils.mergeObject(updateObject, mappedFormData);
        }
        return super._prepareSubmitData(event, form, formData, submitObject);
    }
}
