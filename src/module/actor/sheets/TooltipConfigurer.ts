import { foundryApi } from "module/api/foundryApi";
import { closestData } from "module/data/ClosestDataMixin";
import * as Tooltip from "module/util/tooltip";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { showElementIn } from "module/util/animatedDisplay";
import type SplittermondActor from "module/actor/actor";
import type SplittermondActorSheet from "module/actor/sheets/actor-sheet";
import type SplittermondSpellItem from "module/item/spell";
import type SplittermondItem from "module/item/item";
import type { MasteryDataModel } from "module/item/dataModel/MasteryDataModel";
import { splittermond } from "module/config";
import type { SplittermondSkill } from "module/config/skillGroups";
import { isMember } from "module/util/util";

enum TooltipPosition {
    // Position the tooltip below and to the left of the target
    BOTTOM_LEFT = "bottom-left",
    // Position the tooltip above and to the right of the target
    TOP_RIGHT = "bottom-right",
    // Position the tooltip centered below the target
    BOTTOM_CENTERED = "bottom-center",
    OVERLAY = "overlay",
}
enum TemplateKind {
    SPELL_TOOLTIP = "spell-tooltip",
    INVENTORY_TOOLTIP = "inventory-tooltip",
    COMPOSITION_TOOLTIP = "composition-tooltip",
    MASTERY_TOOLTIP = "mastery-tooltip",
}
interface TemplateContext {
    readonly tooltipKind: TemplateKind;
    readonly [x: string]: unknown;
    readonly id?: string;
}

export class TooltipConfigurer {
    private activeTooltips: string[] = [];
    constructor(private sheet: SplittermondActorSheet) {}
    get actor(): SplittermondActor {
        return this.sheet.actor;
    }
    get element(): HTMLElement {
        return this.sheet.element;
    }

    private async renderTooltip(target: HTMLElement, hbsContent: TemplateContext, position: TooltipPosition) {
        const contextWithId = this.enhanceById(hbsContent);
        this.activeTooltips.push(contextWithId.id);
        const rendered = await foundryApi.renderer(`${TEMPLATE_BASE_PATH}/sheets/actor/tooltip.hbs`, contextWithId);
        this.element.insertAdjacentHTML("beforeend", rendered);
        const tooltip = this.element.querySelector(`#${contextWithId.id}`) as HTMLElement;
        const css = this.selectPosition(position, target, tooltip);

        for (const key in css) {
            const value = css[key as keyof typeof css] ?? null; //will never be null, but the type is generalized over all objects;
            tooltip.style.setProperty(key, value);
        }
        showElementIn(tooltip, 100);
    }
    private enhanceById(hbsContext: TemplateContext) {
        return {
            ...hbsContext,
            id: hbsContext.id ?? "splittermond-tooltip-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
        };
    }

    private selectPosition(strategy: TooltipPosition, target: HTMLElement, tooltipElement: HTMLElement) {
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();

        switch (strategy) {
            case TooltipPosition.BOTTOM_LEFT:
                return {
                    top: targetRect.top + targetRect.height + window.scrollY + "px",
                    left: targetRect.left + window.scrollX + "px",
                    display: "none",
                };
            case TooltipPosition.TOP_RIGHT:
                return {
                    display: "none",
                    top: targetRect.top + window.scrollY - tooltipRect.height + "px",
                    left: targetRect.right + window.scrollX - tooltipRect.width + "px",
                };
            case TooltipPosition.BOTTOM_CENTERED:
                return {
                    top: targetRect.top + targetRect.height + window.scrollY + "px",
                    left: targetRect.left + window.scrollX - (tooltipRect.width - targetRect.width) / 2 + "px",
                    display: "none",
                };
            case TooltipPosition.OVERLAY:
                return {
                    top: targetRect.top + window.scrollY + "px",
                    left: targetRect.left + window.scrollX + "px",
                    width: targetRect.width + "px",
                    display: "none",
                    "pointer-events": "none",
                };
        }
    }

    private setHover(selector: string, enterHandler: (target: HTMLElement) => void) {
        this.element.querySelectorAll(selector).forEach((el) => {
            this.onHover(el, enterHandler);
        });
    }

    private onHover(element: Element, enterHandler: (target: HTMLElement) => void) {
        element.addEventListener("mouseenter", (event) => enterHandler(event.currentTarget as HTMLElement));
        element.addEventListener("mouseleave", () => this.removeTooltips());
    }

    removeTooltips() {
        this.activeTooltips.forEach((activeTooltip) => {
            this.element.querySelector(`#${activeTooltip}`)?.remove();
        });
        this.activeTooltips = [];
    }

    configureTooltips() {
        if (!this.element) {
            console.warn("Splittermond | Attempted to configure tooltips on an unrendered sheet.");
            return;
        }
        this.setHover(".list.inventory [data-item-id]", (t) => this.displayInventoryTooltip(t));
        this.setHover(".list.spells [data-item-id]", (t) => this.displaySpellTooltip(t));
        this.setHover(".list.skills [data-skill]", (t) => this.displaySkillTooltip(t));
        this.setHover(".derived-attribute", (t) => this.displayDerivedAttributeTooltip(t));
        this.setHover(".damage-reduction", (t) => this.displayDamageReductionTooltip(t));
        this.setHover(".list.attack .value", (t) => this.displayAttackTooltip(t));
        this.setHover(".list.active-defense .value", (t) => this.displayActiveDefenseTooltip(t));
        this.setHover(".list.masteries [data-item-id] .taglist-item-name", (t) => this.displayInventoryTooltip(t));
    }
    private async displayInventoryTooltip(target: HTMLElement) {
        const itemId = closestData(target, "item-id") ?? "";
        const item = this.actor.items.get(itemId) as SplittermondItem | null;
        if (!item || !item.system.description) return;
        const hbsContent = {
            tooltipKind: TemplateKind.INVENTORY_TOOLTIP,
            descriptionHtml: await foundryApi.utils.enrichHtml(item.system.description),
        };
        return this.renderTooltip(target, hbsContent, TooltipPosition.BOTTOM_LEFT);
    }

    private async displaySpellTooltip(target: HTMLElement) {
        const itemId = target?.dataset.itemId ?? "";
        const item = this.actor.items.get(itemId) as SplittermondSpellItem | null;
        if (!item) return;
        const hbsContent = {
            tooltipKind: TemplateKind.SPELL_TOOLTIP,
            descriptionHtml: await foundryApi.utils.enrichHtml(item.system.description || ""),
            enhancementCosts: item.system.enhancementCosts,
            enhancementDescription: item.system.enhancementDescription,
        };
        return this.renderTooltip(target, hbsContent, TooltipPosition.BOTTOM_LEFT);
    }

    private async displaySkillTooltip(target: HTMLElement) {
        const skillId = closestData(target, "skill") ?? "";
        if (!isMember(splittermond.skillGroups.all, skillId)) return;
        return Promise.all([this.displayFormula(target, skillId), this.displaySkillMasteries(skillId)]);
    }

    private async displayFormula(target: HTMLElement, skillId: SplittermondSkill) {
        const skillData = skillId in this.actor.skills ? this.actor?.skills[skillId] : null;
        if (!skillData) return;
        const hbsContent = {
            tooltipKind: TemplateKind.COMPOSITION_TOOLTIP,
            tooltip: skillData.tooltip(),
        };
        return this.renderTooltip(target, hbsContent, TooltipPosition.TOP_RIGHT);
    }

    private async displaySkillMasteries(skillId: SplittermondSkill) {
        const masteries = this.actor.items
            .filter((i) => i.type === "mastery")
            .filter((i) => (i.system as MasteryDataModel).skill === skillId);
        if (masteries.length === 0) return;
        const masteryHighlight = {
            tooltipKind: TemplateKind.MASTERY_TOOLTIP,
            skill: {
                label: splittermond.masterySkillsOption[skillId as SplittermondSkill],
                masteries,
            },
        };
        const anchor: HTMLElement = this.element.querySelector(`.list.masteries [data-skill="${skillId}"]`)!;
        const visibleByItsself = anchor.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        const visibleInScroll = this.masteryVisibleInScroll(anchor);
        if (!visibleByItsself || !visibleInScroll) return;
        return this.renderTooltip(anchor, masteryHighlight, TooltipPosition.OVERLAY);
    }

    // Check if the mastery element is fully visible within its scrollable container
    private masteryVisibleInScroll(element: HTMLElement): boolean {
        const rect = element.getBoundingClientRect();
        const container = element.closest(".list.masteries") as HTMLElement;
        if (!container) return false;

        const containerRect = container.getBoundingClientRect();
        return (
            rect.top >= containerRect.top &&
            rect.bottom <= containerRect.bottom &&
            rect.left >= containerRect.left &&
            rect.right <= containerRect.right
        );
    }

    private async displayDerivedAttributeTooltip(target: HTMLElement) {
        const attribute = target.id;
        if (!this.actor.derivedValues[attribute]) return;
        const hbsContent = {
            tooltipKind: TemplateKind.COMPOSITION_TOOLTIP,
            tooltip: this.actor.derivedValues[attribute].tooltip(),
        };
        return this.renderTooltip(target, hbsContent, TooltipPosition.BOTTOM_LEFT);
    }

    private async displayDamageReductionTooltip(target: HTMLElement) {
        if (this.actor.damageReduction === 0) return;
        let formula = new Tooltip.TooltipFormula();
        formula.addPart(0, "");
        this.actor.modifier.getForId("damagereduction").getModifiers().addTooltipFormulaElements(formula);
        const hbsContent = {
            tooltipKind: TemplateKind.COMPOSITION_TOOLTIP,
            tooltip: formula.render(),
        };
        return this.renderTooltip(target, hbsContent, TooltipPosition.BOTTOM_LEFT);
    }

    private async displayAttackTooltip(target: HTMLElement) {
        const attackId = closestData(target, "attack-id") ?? "";
        const attackData = this.actor?.attacks.find((atk) => atk.toObject().id === attackId);
        if (!attackData) return;
        const hbsContent = {
            tooltipKind: TemplateKind.COMPOSITION_TOOLTIP,
            tooltip: attackData.skill.tooltip(),
        };
        return this.renderTooltip(target, hbsContent, TooltipPosition.BOTTOM_CENTERED);
    }

    private async displayActiveDefenseTooltip(target: HTMLElement) {
        const defenseId = closestData(target, "defense-id") ?? "";
        const defenseData = this.findDefenseDataById(defenseId);
        if (!defenseData) return;
        const hbsContent = {
            tooltipKind: TemplateKind.COMPOSITION_TOOLTIP,
            tooltip: defenseData.tooltip(),
        };
        return this.renderTooltip(target, hbsContent, TooltipPosition.BOTTOM_CENTERED);
    }

    private findDefenseDataById(defenseId: string) {
        return [
            ...this.actor.activeDefense.defense,
            ...this.actor.activeDefense.mindresist,
            ...this.actor.activeDefense.bodyresist,
        ].find((d) => d.id === defenseId);
    }
}
