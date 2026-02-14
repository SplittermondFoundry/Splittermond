import { initializeDisplayPreparation } from "./itemDisplayPreparation";
import { FoundryApplication, FoundryDragDrop } from "../../api/Application";
import { foundryApi } from "../../api/foundryApi";
import { splittermond } from "../../config";
import { itemRetriever } from "../../data/EntityRetriever";
import SplittermondItem from "../../item/item";
import { CompendiumPacks } from "../../api/foundryTypes";
import { closestData } from "../../data/ClosestDataMixin";
import { SplittermondApplication, TEMPLATE_BASE_PATH } from "../../data/SplittermondApplication";

type ItemIndexEntity = {
    type: string;
    folder: string;
    img: string;
    name: string;
    uuid: string;
    id: string;
    system: any;
    [key: string]: any;
};

type FilterSkills = { [key: string]: string };

interface BrowserContext {
    spellFilter: { skills: FilterSkills };
    masteryFilter: { skills: FilterSkills };
    weaponFilter: { skills: FilterSkills };
    items: Record<string, ItemIndexEntity[]>;
    [key: string]: any;
}

export type ApplicationOptions = ConstructorParameters<typeof FoundryApplication>[0];

export default class SplittermondCompendiumBrowser extends SplittermondApplication {
    static TABS = {
        primary: {
            tabs: [
                { id: "spell", group: "primary", label: "splittermond.spells" },
                { id: "mastery", group: "primary", label: "splittermond.masteries" },
                { id: "weapon", group: "primary", label: "splittermond.weapons" },
                { id: "armor", group: "primary", label: "splittermond.armors" },
                { id: "shield", group: "primary", label: "splittermond.shields" },
                { id: "npc", group: "primary", label: "splittermond.npc" },
            ],
            initial: "spell",
        },
    };
    static PARTS = {
        tabs: {
            template: `${TEMPLATE_BASE_PATH}/apps/compendium-browser/parts/tabs.hbs`,
        },
        spell: {
            template: `${TEMPLATE_BASE_PATH}/apps/compendium-browser/parts/spell.hbs`,
        },
        mastery: {
            template: `${TEMPLATE_BASE_PATH}/apps/compendium-browser/parts/mastery.hbs`,
        },
        weapon: {
            template: `${TEMPLATE_BASE_PATH}/apps/compendium-browser/parts/weapon.hbs`,
        },
        armor: {
            template: `${TEMPLATE_BASE_PATH}/apps/compendium-browser/parts/armor.hbs`,
        },
        shield: {
            template: `${TEMPLATE_BASE_PATH}/apps/compendium-browser/parts/shield.hbs`,
        },
        npc: {
            template: `${TEMPLATE_BASE_PATH}/apps/compendium-browser/parts/npc.hbs`,
        },
    };

    private dragDrop: FoundryDragDrop[];
    private _produceDisplayableItems: ((...args: any[]) => any) | undefined;

    constructor(options: ApplicationOptions = {}) {
        super({
            tag: "form",
            position: {
                width: 600,
                top: 70,
                left: 120,
                height: 700,
            },
            form: {
                submitOnChange: false,
            },
            classes: ["splittermond", "compendium-browser"],
            window: {
                resizable: true,
                title: "Compendium Browser",
            },
            dragDrop: [{ dragSelector: ".list > ol > li" }],
            id: "compendium-browser",
            ...options,
        });
        this.dragDrop = this.createDragDropHandlers();
        this._produceDisplayableItems = undefined;
    }

    private produceDisplayableItems() {
        if (!this._produceDisplayableItems) {
            this._produceDisplayableItems = initializeDisplayPreparation(
                { localize: foundryApi.localize },
                [...splittermond.skillGroups.magic],
                [...splittermond.skillGroups.all]
            );
        }
        return this._produceDisplayableItems;
    }

    private createDragDropHandlers(): FoundryDragDrop[] {
        return (this.options.dragDrop as Record<string, unknown>[]).map((d) => {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            };
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: null,
                drop: null,
            };
            return new FoundryDragDrop(d);
        });
    }

    async _prepareContext(options: any): Promise<BrowserContext> {
        const getDataTimerStart = performance.now();
        const data = (await super._prepareContext(options)) as BrowserContext;
        data.spellFilter = {
            skills: foundryApi.utils.deepClone(splittermond.spellSkillsOption),
        };

        data.masteryFilter = {
            skills: foundryApi.utils.deepClone(splittermond.masterySkillsOption),
        };

        data.weaponFilter = {
            skills: foundryApi.utils.deepClone(splittermond.fightingSkillOptions),
        };

        delete data.spellFilter.skills.arcanelore;
        data.spellFilter.skills.none = "splittermond.skillLabel.none";
        data.weaponFilter.skills.none = "splittermond.skillLabel.none";

        const allItems = this.recordCompendiaItemsInCategories(foundryApi.collections.packs)
            .then((record) => this.appendWorldItemsToRecord(record, itemRetriever.items))
            .then(this.sortCategories);
        return new Promise(async (resolve, __) => {
            data.items = await allItems;

            const npcTypes: FilterSkills = { none: "Alle Typen" };
            if (data.items.npc) {
                const uniqueTypes = new Set<string>();
                data.items.npc.forEach((npc: ItemIndexEntity) => {
                    if (npc.system?.type && typeof npc.system.type === "string") {
                        npc.system.type.split(",").forEach((t: string) => {
                            const trimmed = t.trim();
                            if (trimmed && trimmed !== "-") uniqueTypes.add(trimmed);
                        });
                    }
                });
                [...uniqueTypes].sort().forEach((t) => { npcTypes[t] = t; });
            }
            data.npcFilter = { types: npcTypes };

            console.debug(`Splittermond | Compendium Browser getData took ${performance.now() - getDataTimerStart} ms`);
            resolve(data);
        });
    }

    recordCompendiaItemsInCategories(compendia: CompendiumPacks): Promise<Record<string, ItemIndexEntity[]>> {
        let allItems: Record<string, ItemIndexEntity[]> = {};

        const wellFormedPacks = compendia
            .filter((pack) => {
                const wellFormedMetadata = "id" in pack.metadata && "label" in pack.metadata;
                if (!wellFormedMetadata) {
                    console.warn(
                        `Splittermond | Pack ${pack.metadata.name} does not have well-formed metadata. It will be ignored.`
                    );
                }
                return wellFormedMetadata;
            });

        const itemIndices = wellFormedPacks
            .filter((pack) => pack.documentName === "Item")
            .map((pack) => ({
                metadata: { id: pack.metadata.id, label: pack.metadata.label },
                index: pack.getIndex({
                    fields: [
                        "system.availableIn",
                        "system.skill",
                        "system.skillLevel",
                        "system.features",
                        "system.level",
                        "system.spellType",
                        "system.secondaryAttack.skill",
                        "system.damage",
                        "system.defenseBonus",
                        "system.damageReduction",
                        "system.handicap",
                    ],
                }),
            }));

        const actorIndices = wellFormedPacks
            .filter((pack) => pack.documentName === "Actor")
            .map((pack) => ({
                metadata: { id: pack.metadata.id, label: pack.metadata.label },
                index: pack.getIndex({
                    fields: [
                        "system.type",
                        "system.level",
                    ],
                }),
            }));

        const allIndices = [...itemIndices, ...actorIndices];

        return Promise.all(
            allIndices.map((compendiumBrowserCompendium) =>
                this.produceDisplayableItems()(
                    compendiumBrowserCompendium.metadata,
                    compendiumBrowserCompendium.index,
                    allItems
                )
            )
        ).then(() => allItems);
    }

    appendWorldItemsToRecord(
        record: Record<string, ItemIndexEntity[]>,
        items: Collection<SplittermondItem>
    ): Record<string, ItemIndexEntity[]> {
        items.forEach((item: SplittermondItem) => {
            if (!(item.type in record)) {
                record[item.type] = [];
            }
            record[item.type].push(item);
        });
        return record;
    }

    sortCategories(record: Record<string, ItemIndexEntity[]>): Record<string, ItemIndexEntity[]> {
        Object.keys(record).forEach((k) => {
            record[k].sort((a, b) => (a.name < b.name ? -1 : 1));
        });
        return record;
    }

    async _onRender(context: any, options: any): Promise<void> {
        await super._onRender(context, options);

        this.dragDrop.forEach((d) => d.bind(this.element));

        this.element
            .querySelectorAll(".list li")
            .forEach((el) => el.addEventListener("click", async (e) => this.listElementClickHandler(e)));

        this.element.querySelectorAll('[data-tab="spell"] input, [data-tab="spell"] select').forEach((el) =>
            el.addEventListener("change", () => {
                this._onSearchFilterSpell();
            })
        );
        this.element.querySelectorAll('[data-tab="mastery"] input, [data-tab="mastery"] select').forEach((el) =>
            el.addEventListener("change", () => {
                this._onSearchFilterMastery();
            })
        );
        this.element.querySelectorAll('[data-tab="weapon"] input, [data-tab="weapon"] select').forEach((el) =>
            el.addEventListener("change", () => {
                this._onSearchFilterWeapon();
            })
        );
        this.element.querySelectorAll('[data-tab="armor"] input, [data-tab="armor"] select').forEach((el) =>
            el.addEventListener("change", () => {
                this._onSearchFilterArmor();
            })
        );
        this.element.querySelectorAll('[data-tab="shield"] input, [data-tab="shield"] select').forEach((el) =>
            el.addEventListener("change", () => {
                this._onSearchFilterShield();
            })
        );
        this.element.querySelectorAll('[data-tab="npc"] input, [data-tab="npc"] select').forEach((el) =>
            el.addEventListener("change", () => {
                this._onSearchFilterNpc();
            })
        );
    }

    async render(options: Parameters<InstanceType<typeof FoundryApplication>["render"]>[0] = {}): Promise<this> {
        const renderResult = await super.render(options);
        // Initialize the spell section so that everything is visible.
        this._onSearchFilterSpell();
        this.element.querySelector('a[data-tab="spell"]')?.classList.add("active");
        this.element.querySelector('section[data-tab="spell"]')?.classList.add("active");
        return renderResult;
    }

    private async listElementClickHandler(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        const itemId = closestData(e.currentTarget as HTMLElement /*we know this*/, "item-id");
        if (!itemId) {
            console.warn("Splittermond | No item ID found in clicked compendium browser list element.");
            return;
        }
        const item = await foundryApi.utils.fromUUID(itemId);
        if (!item) {
            foundryApi.warnUser("splittermond.application.compendiumBrowser.noItem");
            return;
        }
        let sheet = item.sheet;
        sheet?.render(true);
    }

    _canDragStart(selector: string) {
        const selectedElement = this.element.querySelector(selector) as HTMLElement;
        const itemId = closestData(selectedElement, "item-id");
        return itemId !== undefined;
    }

    _canDragDrop(): boolean {
        return false;
    }

    _onDragStart(event: DragEvent): void {
        const li = event.currentTarget as HTMLElement;
        const docType = li.dataset.docType || "Item";
        event.dataTransfer?.setData(
            "text/plain",
            JSON.stringify({
                type: docType,
                uuid: li.dataset.itemId,
            })
        );
    }

    _onSearchFilterSpell(): void {
        const currentSection = this.element.querySelector('section.tab[data-tab="spell"]') as HTMLElement;
        const { nameFilter, skillFilter, displayWorldItems } = this.getCommonFilters(currentSection);
        const allowedLevels = this.getAllowedLevels(currentSection);

        filterItems(currentSection, (el) => {
            const availabilities = this.getAvailablities(el);

            const nameMatches = nameFilter.test(el.querySelector("label")?.textContent ?? "");
            const shouldDisplayWorldItem = displayWorldItems || !!el.dataset.itemId?.startsWith("Compendium");
            const skillAndLevelMatches =
                allowedLevels.includes(parseInt(el.dataset.level ?? "")) &&
                (el.dataset.skill === skillFilter || skillFilter === "none");
            const availabilitiesMatch = availabilities.some(
                (a) => allowedLevels.includes(a.level) && (a.skill === skillFilter || skillFilter === "none")
            );

            return nameMatches && shouldDisplayWorldItem && (skillAndLevelMatches || availabilitiesMatch);
        });
    }

    _onSearchFilterMastery(): void {
        const currentSection = this.element.querySelector('section.tab[data-tab="mastery"]') as HTMLElement;
        const { nameFilter, skillFilter, displayWorldItems } = this.getCommonFilters(currentSection);
        const allowedLevels = this.getAllowedLevels(currentSection);

        filterItems(currentSection, (el) => {
            const availabilities = this.getAvailablities(el);

            const nameMatches = nameFilter.test(el.querySelector("label")?.textContent ?? "");
            const shouldDisplayWorldItem = displayWorldItems || !!el.dataset.itemId?.startsWith("Compendium");
            const levelsMatch = allowedLevels.includes(parseInt(el.dataset.level ?? ""));
            const availabilitiesMatch = availabilities.some((a) => a.skill === skillFilter || skillFilter === "none");

            const skillsMatch = el.dataset.skill === skillFilter || skillFilter === "none" || availabilitiesMatch;
            return nameMatches && shouldDisplayWorldItem && levelsMatch && skillsMatch;
        });
    }

    _onSearchFilterWeapon(): void {
        const currentSection = this.element.querySelector('section.tab[data-tab="weapon"]') as HTMLElement;
        const { nameFilter, skillFilter, displayWorldItems } = this.getCommonFilters(currentSection);

        filterItems(currentSection, (el) => {
            const name = el.querySelector("label")!.textContent!;
            const itemData = el.dataset;
            let features = `${itemData.features} ${itemData.secondaryFeatures}`;
            let damage = `${itemData.damage} ${itemData.seconaryDamage}`;

            const nameMatches = nameFilter.test(`${name} ${features} ${damage}`);
            const shouldDisplayWorldItem = displayWorldItems || !!itemData.itemId?.startsWith("Compendium");

            const skillsMatch =
                itemData.skill === skillFilter || itemData.secondarySkill == skillFilter || skillFilter === "none";
            return nameMatches && shouldDisplayWorldItem && skillsMatch;
        });
    }

    _onSearchFilterArmor(): void {
        const currentSection = this.element.querySelector('section.tab[data-tab="armor"]') as HTMLElement;
        const nameFilter = this.getNameFilter(currentSection);
        const displayWorldItems = this.getWorldItemsFilter(currentSection);

        filterItems(currentSection, (el) => {
            const name = el.querySelector("label")?.textContent ?? "";
            const features = el.dataset.features ?? "";
            const nameMatches = nameFilter.test(`${name} ${features}`);
            const shouldDisplayWorldItem = displayWorldItems || !!el.dataset.itemId?.startsWith("Compendium");
            return nameMatches && shouldDisplayWorldItem;
        });
    }

    _onSearchFilterShield(): void {
        const currentSection = this.element.querySelector('section.tab[data-tab="shield"]') as HTMLElement;
        const nameFilter = this.getNameFilter(currentSection);
        const displayWorldItems = this.getWorldItemsFilter(currentSection);

        filterItems(currentSection, (el) => {
            const name = el.querySelector("label")?.textContent ?? "";
            const features = el.dataset.features ?? "";
            const nameMatches = nameFilter.test(`${name} ${features}`);
            const shouldDisplayWorldItem = displayWorldItems || !!el.dataset.itemId?.startsWith("Compendium");
            return nameMatches && shouldDisplayWorldItem;
        });
    }

    _onSearchFilterNpc(): void {
        const currentSection = this.element.querySelector('section.tab[data-tab="npc"]') as HTMLElement;
        const nameFilter = this.getNameFilter(currentSection);
        const displayWorldItems = this.getWorldItemsFilter(currentSection);
        const typeFilter = this.getNpcTypeFilter(currentSection);

        filterItems(currentSection, (el) => {
            const name = el.querySelector("label")?.textContent ?? "";
            const npcType = el.dataset.npcType ?? "";
            const nameMatches = nameFilter.test(`${name} ${npcType}`);
            const shouldDisplayWorldItem = displayWorldItems || !!el.dataset.itemId?.startsWith("Compendium");
            const typeMatches = typeFilter === "none" || npcType.split(",").some((t) => t.trim() === typeFilter);
            return nameMatches && shouldDisplayWorldItem && typeMatches;
        });
    }

    private getCommonFilters(currentSection: HTMLElement) {
        return {
            nameFilter: this.getNameFilter(currentSection),
            skillFilter: this.getSkillFilter(currentSection),
            displayWorldItems: this.getWorldItemsFilter(currentSection),
        };
    }
    private getWorldItemsFilter(currentSection: HTMLElement): boolean {
        const checkbox: HTMLInputElement | null = currentSection.querySelector(
            '.row.flex-gap input[name="show-world-items"]'
        );
        return checkbox?.checked ?? false;
    }

    private getSkillFilter(currentSection: HTMLElement): string {
        const selectElement: HTMLSelectElement | null = currentSection.querySelector(
            '.compendium-item-filters select[name="skill"]'
        );
        return selectElement?.value ?? "none";
    }

    private getNpcTypeFilter(currentSection: HTMLElement): string {
        const selectElement: HTMLSelectElement | null = currentSection.querySelector(
            '.compendium-item-filters select[name="npc-type"]'
        );
        return selectElement?.value ?? "none";
    }

    private getNameFilter(currentSection: HTMLElement): RegExp {
        const nameFilterInput: HTMLInputElement | null = currentSection.querySelector('input[name="search"]');
        return new RegExp(this.escape_regex(nameFilterInput?.value ?? ""), "i");
    }

    private escape_regex(pattern: string): string {
        return pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }

    private getAllowedLevels(currentSection: HTMLElement): number[] {
        const levelFilters: NodeListOf<HTMLInputElement> | undefined = currentSection?.querySelectorAll(
            '.compendium-item-filters input[type="checkbox"]'
        );
        let noneChecked = true;
        levelFilters?.forEach((filter) => {
            noneChecked = noneChecked && !filter.checked;
        });

        const allowedLevels: number[] = [];
        levelFilters?.forEach((filter) => {
            if (noneChecked || filter.checked) {
                allowedLevels.push(parseInt(filter.value));
            }
        });
        return allowedLevels;
    }

    private getAvailablities(el: HTMLElement) {
        const availabilities = (el.dataset.availableIn ?? "").split(",").map((s: string) => s.trim());
        return availabilities.map((s: string) => {
            const [skill, level] = s.split(" ");
            return { skill, level: parseInt(level) };
        });
    }
}

function filterItems(section: HTMLElement | null, shouldDisplay: (item: HTMLElement) => boolean) {
    if (!section) {
        console.debug("Splittermond | CompendiumBrowser: no section to filter Items from");
        return;
    }
    const listItems = section.querySelectorAll(".list > ol > li") as NodeListOf<HTMLElement>;

    listItems.forEach((li) => {
        li.style.display = shouldDisplay(li) ? "flex" : "none";
    });

    let index = 0;
    listItems.forEach((li) => {
        li.classList.remove("even", "odd");
        li.classList.add(index % 2 == 0 ? "even" : "odd");
        index = index + 1;
    });
}
