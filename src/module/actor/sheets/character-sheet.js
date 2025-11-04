import SplittermondSpeciesWizard from "../../apps/wizards/species.ts";
import SplittermondActorSheet from "./actor-sheet.js";
import { foundryApi } from "../../api/foundryApi";

export default class SplittermondCharacterSheet extends SplittermondActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["splittermond", "sheet", "actor"],
        position: { width: 750 },
        overlays: ["#health", "#focus"],
        tag: "form",
        form: {
            submitOnChange: true,
        },
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "editor", group: "primary", label: "splittermond.biography" },
                { id: "general", group: "primary", label: "splittermond.general" },
                { id: "skills", group: "primary", label: "splittermond.skills" },
                { id: "spells", group: "primary", label: "splittermond.spells" },
                { id: "fight", group: "primary", label: "splittermond.fight" },
                { id: "inventory", group: "primary", label: "splittermond.inventory" },
                { id: "status", group: "primary", label: "splittermond.status" },
            ],
            initial: "general",
        },
    };

    static PARTS = {
        header: {
            template: "systems/splittermond/templates/sheets/actor/parts/character-header.hbs",
        },
        stats: super.STATS_TAB,
        tabs: super.NAVIGATION,
        editor: super.BIOGRAPHY_TAB,
        general: {
            template: "systems/splittermond/templates/sheets/actor/parts/character-general-tab.hbs",
            classes: ["scrollable"],
        },
        skills: {
            template: "systems/splittermond/templates/sheets/actor/parts/character-skills-tab.hbs",
            templates: [
                `systems/splittermond/templates/sheets/actor/parts/attribute-input.hbs`,
                `systems/splittermond/templates/sheets/actor/parts/mastery-list.hbs`,
            ],
            classes: ["scrollable"],
        },
        spells: super.SPELLS_TAB,
        fight: super.FIGHT_TAB,
        inventory: super.INVENTORY_TAB,
        status: super.STATUS_TAB,
    };

    async _prepareContext() {
        const sheetData = await super._prepareContext();

        sheetData.hasRestActions = true;
        sheetData.system.experience.heroLevelName = foundryApi.localize(
            `splittermond.heroLevels.${sheetData.system.experience.heroLevel}`
        );

        sheetData.items.filter((item) => item.type === "strength").forEach((i) => (i.multiple = i.system.quantity > 1));

        sheetData.combatTabs = {
            tabs: [
                { id: "attack", group: "fight-action-type", label: "splittermond.attack" },
                { id: "defense", group: "fight-action-type", label: "splittermond.activeDefense" },
            ],
            initial: "attack",
        };

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

    async _onRender(context, options) {
        await super._onRender(context, options);

        this.element.querySelectorAll('.attribute input[name$="value"]').forEach((el) => {
            el.addEventListener("change", this._onChangeAttribute.bind(this));
        });

        this.element.querySelectorAll('.attribute input[name$="start"]').forEach((el) => {
            el.addEventListener("change", (event) => {
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
        });
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
