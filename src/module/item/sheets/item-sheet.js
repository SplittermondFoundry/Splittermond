import {foundryApi} from "../../api/foundryApi";

export default class SplittermondItemSheet extends ItemSheet {
    static get defaultOptions() {
        return foundryApi.mergeObject(super.defaultOptions, {
            template: "systems/splittermond/templates/sheets/item/item-sheet.hbs",
            classes: ["splittermond", "sheet", "item"],
            tabs: [{navSelector: ".sheet-navigation", contentSelector: "main", initial: "description"}],
            scrollY: [".tab[data-tab='properties']"]
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

        var displayProperties = (config.displayOptions.itemSheet)[item.type] || (config.displayOptions.itemSheet)["default"];
        options.width = displayProperties.width;
        options.height = displayProperties.height;
        super(item, options);
        this.propertyResolver = propertyResolver;
        this.localizer = localizer;
        this.itemSheetProperties =config.itemSheetProperties[this.item.type] || [];
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
        data.itemProperties = this._getItemProperties();
        data.statBlock = this._getStatBlock();
        data.typeLabel = "splittermond." + data.data.type;

        return this.textEditor.enrichHTML(data.data.system.description)
            .then(description => ({...data, description}));
    }

    /**
     * @returns {!SplittermondItemSheetProperties}
     * @private
     */
    _getItemProperties() {
        /**
         * @type SplittermondItemSheetProperties
         */
        let sheetProperties = duplicate(this.itemSheetProperties);
        sheetProperties.forEach(grp => {
            grp.properties.forEach(async /** @type {InputItemProperty|ItemSheetPropertyDisplayProperty}*/prop => {
                prop.value = this.propertyResolver.getProperty(this.item, prop.field);
                if (prop.value === undefined) {
                    prop.value = "undefined";
                }
                if(prop.value === null) {
                    prop.value = "null";
                }
                prop.placeholderText = prop.placeholderText ?? prop.label;
                if (prop.help) {
                    prop.help = await this.textEditor.enrichHTML(this.localizer.localize(prop.help));
                }
            });
        });

        return sheetProperties;
    }

    _getStatBlock() {
        return [];
    }

    activateListeners(html) {
        html.find('input.autoexpand').on('input', function () {
            let dummyElement = $('<span id="autoexpanddummy"/>').hide();
            $(this).after(dummyElement);
            dummyElement.text($(this).val() || $(this).text() || $(this).attr('placeholder'));
            $(this).css({
                width: dummyElement.width()
            });
            dummyElement.remove();
        }).trigger('input');

        html.find('[data-action="inc-value"]').click((event) => {
            const query = $(event.currentTarget).closestData('input-query');
            let value = parseInt($(html).find(query).val()) || 0;
            $(html).find(query).val(value + 1).change();
        });

        html.find('[data-action="dec-value"]').click((event) => {
            const query = $(event.currentTarget).closestData('input-query');
            let value = parseInt($(html).find(query).val()) || 0;
            $(html).find(query).val(value - 1).change();
        });


        super.activateListeners(html);
    }

    roll() {

    }
}