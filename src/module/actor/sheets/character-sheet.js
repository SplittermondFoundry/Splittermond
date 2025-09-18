import SplittermondSpeciesWizard from "../../apps/wizards/species.ts";
import SplittermondActorSheet from "./actor-sheet.js";
import { foundryApi } from "../../api/foundryApi";

export default class SplittermondCharacterSheet extends SplittermondActorSheet {
    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            template: "systems/splittermond/templates/sheets/actor/character-sheet.hbs",
            classes: ["splittermond", "sheet", "actor"],
            tabs: [
                { navSelector: ".sheet-navigation[data-group='primary']", contentSelector: "main", initial: "general" },
                {
                    navSelector: ".subnav[data-group='fight-action-type']",
                    contentSelector: "section div.tab-list",
                    initial: "attack",
                },
            ],
            scrollY: [
                ,
                ".tab[data-tab='general']",
                ".list.skills",
                ".list.masteries",
                ".tab[data-tab='spells']",
                ".tab[data-tab='inventory']",
                ".tab[data-tab='status']",
            ],
            overlays: ["#health", "#focus"],
            width: 750,
        });
    }

    async getData() {
        const sheetData = await super.getData();

        sheetData.data.system.experience.heroLevelName = game.i18n.localize(
            `splittermond.heroLevels.${sheetData.actor.system.experience.heroLevel}`
        );

        sheetData.items.forEach((i) => {
            if (i.type === "strength") {
                i.multiple = i.system.quantity > 1;
            }
        });

        return sheetData;
    }

    async _onDropItemCreate(itemData) {
        if (itemData.type === "species") {
            let wizard = new SplittermondSpeciesWizard(this.actor, itemData);
            wizard.render(true);
            return;
        }

        if (itemData.type === "moonsign") {
            const moonsignIds = this.actor.items.filter((i) => i.type === "moonsign")?.map((i) => i.id);
            if (moonsignIds.length > 0) {
                const deleted = await this.actor.deleteEmbeddedDocuments("Item", moonsignIds);
            }
        }

        if (
            [
                "mastery",
                "strength",
                "weakness",
                "resource",
                "spell",
                "weapon",
                "equipment",
                "shield",
                "armor",
                "moonsign",
                "culturelore",
                "statuseffect",
                "spelleffect",
            ].includes(itemData.type)
        ) {
            return super._onDropItemCreate(itemData);
        }
    }

    activateListeners(html) {
        html.find('.attribute input[name$="value"]').change(this._onChangeAttribute.bind(this));
        html.find('.attribute input[name$="start"]').change((event) => {
            event.preventDefault();
            const input = event.currentTarget;
            const value = parseInt(input.value);
            const attrBaseName = input.name.split(".")[2];
            const speciesValue = parseInt(
                getProperty(this.actor.toObject(), `system.attributes.${attrBaseName}.species`)
            );
            this.actor.update({
                [`system.attributes.${attrBaseName}.initial`]: value - speciesValue,
            });
        });

        super.activateListeners(html);
    }

    _onChangeAttribute(event) {
        event.preventDefault();

        const input = event.currentTarget;
        const value = parseInt(input.value);
        const attrBaseName = input.name.split(".")[2];
        const initialValue = parseInt(getProperty(this.actor.toObject(), `system.attributes.${attrBaseName}.initial`));
        const speciesValue = parseInt(getProperty(this.actor.toObject(), `system.attributes.${attrBaseName}.species`));
        this.actor.update({
            [`system.attributes.${attrBaseName}.advances`]: value - initialValue - speciesValue,
        });
    }
}
