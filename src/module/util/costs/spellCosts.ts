import { parseCostString } from "./costParser";
import { Cost, CostModifier } from "./Cost";
import { SpellCostReductionManager } from "./spellCostManagement";
import { PrimaryCost } from "./PrimaryCost";
import { SpellDataModel } from "../../item/dataModel/SpellDataModel";

type SpellCostCalculationInput = Pick<SpellDataModel, "skill" | "spellType" | "costs" | "enhancementCosts">;

export function calculateReducedSpellCosts(
    spellData: SpellCostCalculationInput,
    spellCostReductionManager: SpellCostReductionManager
): string {
    const reductions = getApplicableReductions(spellData, spellCostReductionManager);
    const parsedCosts = parseCostString(spellData.costs ?? "").asPrimaryCost();
    const reducedCosts = applyReductions(parsedCosts, reductions);
    return ensureMinimumCosts(reducedCosts).render();
}

export function calculateReducedEnhancementCosts(
    spellData: SpellCostCalculationInput,
    spellCostReductionManager: SpellCostReductionManager
) {
    const reductions = getApplicableReductions(spellData, spellCostReductionManager);
    const parsedCosts = parseCostString(spellData.enhancementCosts ?? "").asPrimaryCost();
    return applyReductions(parsedCosts, reductions).render();
}

function getApplicableReductions(
    spellData: SpellCostCalculationInput,
    spellCostReductionManager: SpellCostReductionManager
) {
    const skillId = spellData.skill?.trim().toLowerCase() ?? null;
    const spellType = spellData.spellType
        ?.toLowerCase()
        .split(",")
        .map((st) => st.trim()) ?? [null];
    const uniqueReductions = new Set<CostModifier>();
    //We need to deduplicate, because reductions based on skill alone will show up for each type.
    spellType
        .map((type) => spellCostReductionManager.getCostModifiers(skillId ?? "", type ?? ""))
        .flatMap((red) => red)
        .forEach((red) => uniqueReductions.add(red));
    return Array.from(uniqueReductions);
}

function applyReductions(costs: PrimaryCost, reductions: CostModifier[]): PrimaryCost {
    const initial = new Cost(0, 0, false).asModifier();
    const consolidatedReductions = reductions.reduce((costs, reduction) => costs.add(reduction), initial);
    return costs.subtract(consolidatedReductions);
}

function ensureMinimumCosts(cost: PrimaryCost): PrimaryCost {
    return cost.isZero() ? cost.add(new Cost(1, 0, false).asModifier()) : cost;
}
