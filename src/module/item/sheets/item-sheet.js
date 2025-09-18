import { foundryApi } from "../../api/foundryApi";
import { parseFeatures } from "../dataModel/propertyModels/ItemFeaturesModel";

export default class SplittermondItemSheet extends foundry.appv1.sheets.ItemSheet {
    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            template: "systems/splittermond/templates/sheets/item/item-sheet.hbs",
            classes: ["splittermond", "sheet", "item"],
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: "main", initial: "description" }],
            scrollY: [".tab[data-tab='properties']"],
        });
    }

    /**
     * @param {!SplittermondItem} item
     * @param options
     * @param {{getProperty:(object, string)=> unknown}} propertyResolver
     * @param {{localize:(string)=>string}} localizer
     * @param config
     * @param {enrichHTML:(string)=>Promise<string>} textEditor
     */
    constructor(
        item,
        options = {},
        propertyResolver = foundry.utils,
        localizer = game.i18n,
        config = CONFIG.splittermond,
        textEditor = TextEditor
    ) {
        var displayProperties =
            config.displayOptions.itemSheet[item.type] || config.displayOptions.itemSheet["default"];
        options.width = displayProperties.width;
        options.height = displayProperties.height;
        super(item, options);
        this.propertyResolver = propertyResolver;
        this.localizer = localizer;
        this.itemSheetProperties = config.itemSheetProperties[this.item.type] || [];
        this.textEditor = textEditor;
    }

    /**
     * @override
     * @typedef SplittermondItemSheetData
     * @type {ItemSheetData & { itemProperties: any, statBlock: any, typeLabel: string}}
     * @public
     * @returns SplittermondItemSheetData
     */
    async getData() {
        /**
         * @typedef ItemSheetData
         * @type {{cssClass:string, editable:any, document: ClientDocument, data: any, limited: any, options: any, owner: any,title: string, type: string}}
         */
        const data = super.getData();
        data.itemProperties = await this._getItemProperties();
        data.statBlock = this._getStatBlock();
        data.typeLabel = "splittermond." + data.data.type;

        return this.textEditor
            .enrichHTML(data.data.system.description)
            .then((description) => ({ ...data, description }));
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

    activateListeners(html) {
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

        html.find('[data-action="inc-value"]').click((event) => {
            const query = $(event.currentTarget).closestData("input-query");
            let value = parseInt($(html).find(query).val()) || 0;
            $(html)
                .find(query)
                .val(value + 1)
                .change();
        });

        html.find('[data-action="dec-value"]').click((event) => {
            const query = $(event.currentTarget).closestData("input-query");
            let value = parseInt($(html).find(query).val()) || 0;
            $(html)
                .find(query)
                .val(value - 1)
                .change();
        });

        super.activateListeners(html);
    }

    roll() {}

    _updateObject(event, formData) {
        if (formData["system.features.innateFeatures"] !== undefined) {
            formData["system.features.internalFeatureList"] = parseFeatures(formData["system.features.innateFeatures"]);
            delete formData["system.features.innateFeatures"];
        }
        return super._updateObject(event, formData);
    }
}
