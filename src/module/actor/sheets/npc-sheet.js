import SplittermondActorSheet from "./actor-sheet.js";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { isMember } from "module/util/util.js";
import { splittermond } from "module/config/index.js";

export default class SplittermondNPCSheet extends SplittermondActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["splittermond", "sheet", "actor", "npc"],
        window: { submitOnClose: false },
        overlays: ["#health", "focus"],
        form: {
            submitOnChange: true,
        },
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "editor", group: "primary", label: "splittermond.biography" },
                { id: "general", group: "primary", label: "splittermond.general" },
                { id: "spells", group: "primary", label: "splittermond.spells" },
                { id: "inventory", group: "primary", label: "splittermond.inventory" },
                { id: "status", group: "primary", label: "splittermond.status" },
            ],
            initial: "general",
        },
    };

    static PARTS = {
        header: {
            template: `${TEMPLATE_BASE_PATH}/sheets/actor/npc-header.hbs`,
        },
        stats: super.STATS_TAB,
        tabs: super.NAVIGATION,
        editor: super.BIOGRAPHY_TAB,
        general: {
            template: `${TEMPLATE_BASE_PATH}/sheets/actor/npc-general-tab.hbs`,
            templates: [
                `${TEMPLATE_BASE_PATH}/sheets/actor/parts/attribute-input.hbs`,
                `${TEMPLATE_BASE_PATH}/sheets/actor/parts/mastery-list.hbs`,
                `${TEMPLATE_BASE_PATH}/sheets/actor/parts/combat-actions.hbs`,
            ],
            classes: ["scrollable"],
        },
        spells: super.SPELLS_TAB,
        inventory: super.INVENTORY_TAB,
        status: super.STATUS_TAB,
    };
    async _prepareContext() {
        const sheetData = await super._prepareContext();

        sheetData.hasRestActions = false;

        return sheetData;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        this.element.querySelectorAll('input[name^="derivedAttributes"]').forEach((el) => {
            el.addEventListener("change", this._onChangeDerivedAttribute.bind(this));
        });

        this.element.querySelectorAll('input[name="damageReduction"]').forEach((el) => {
            el.addEventListener("change", this._onChangeDamageReduction.bind(this));
        });

        this.element.querySelectorAll('input[name^="system.skills"][name$="value"]').forEach((el) => {
            el.addEventListener("change", this._onChangeSkill.bind(this));
        });
    }
    _onChangeDerivedAttribute(event) {
        event.preventDefault();
        event.stopPropagation();

        const input = event.currentTarget;
        const value = parseInt(input.value);
        const attrBaseName = input.name.split(".")[1];
        if (value - parseInt(this.actor.derivedValues[attrBaseName].value || 0) == 0 || input.value == "") {
            this.actor.update({
                [`system.derivedAttributes.${attrBaseName}.value`]: 0,
            });
        } else {
            this.actor.update({
                [`system.derivedAttributes.${attrBaseName}.value`]:
                    value -
                    parseInt(this.actor.derivedValues[attrBaseName].value || 0) +
                    parseInt(this.actor.derivedValues[attrBaseName].baseValue || 0),
            });
        }
    }

    _onChangeDamageReduction(event) {
        event.preventDefault();
        event.stopPropagation();

        const input = event.currentTarget;
        const value = parseInt(input.value);
        const newValue =
            value - parseInt(this.actor.damageReduction || 0) + parseInt(this.actor.system.damageReduction.value || 0);
        this.actor.update({
            [`system.damageReduction.value`]: newValue,
        });
    }

    _onChangeSkill(event) {
        event.preventDefault();
        event.stopPropagation();

        const input = event.currentTarget;
        const skillBaseName = input.name.split(".")[2];
        if (input.value) {
            const value = parseInt(input.value);

            const newValue =
                value - this.actor.skills[skillBaseName].value + parseInt(this.actor.skills[skillBaseName].points || 0);
            this.actor.update({
                [`system.skills.${skillBaseName}.points`]: newValue,
                [`system.skills.${skillBaseName}.value`]: 0,
            });
        } else {
            this.actor.update({
                [`system.skills.${skillBaseName}.points`]: 0,
            });
        }
    }

    _hasValidItemType(itemType) {
        return isMember(splittermond.itemTypes.npc.droppable, itemType);
    }
}
