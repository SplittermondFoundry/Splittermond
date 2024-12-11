import {parseCostString} from "./costParser";
import {Cost, CostModifier} from "./Cost";
import {SpellCostReductionManager} from "./spellCostManagement";
import {PrimaryCost} from "./PrimaryCost";
import {SplittermondSpellSystemData} from "module/data/ItemSystemData";

type SpellCostCalculationInput = Pick<SplittermondSpellSystemData, "skill" | "spellType" | "costs" | "enhancementCosts">;

export function calculateReducedSpellCosts(spellData:SpellCostCalculationInput, spellCostReductionManager:SpellCostReductionManager):string {
    const reductions = getApplicableReductions(spellData, spellCostReductionManager);
    const parsedCosts = (parseCostString(spellData.costs)).asPrimaryCost();
    const reducedCosts = applyReductions(parsedCosts, reductions);
    return ensureMinimumCosts(reducedCosts).render();
}

export function calculateReducedEnhancementCosts(spellData:SpellCostCalculationInput, spellCostReductionManager:SpellCostReductionManager) {
    const reductions = getApplicableReductions(spellData, spellCostReductionManager);
    const parsedCosts = parseCostString(spellData.enhancementCosts).asPrimaryCost();
    return applyReductions(parsedCosts, reductions).render()
}

function getApplicableReductions(spellData:SpellCostCalculationInput, spellCostReductionManager:SpellCostReductionManager) {
    let skillId = spellData.skill?.trim().toLowerCase() ?? null;
    let spellType = spellData.spellType?.toLowerCase().split(",").map(st => st.trim()) ?? [null];
    return spellType
        .map(type => spellCostReductionManager.getCostModifiers(skillId, type))
        .flatMap(red => red)
}

function applyReductions(costs:PrimaryCost, reductions:CostModifier[]):PrimaryCost {
    const initial = new Cost(0,0,false).asModifier();
    const consolidatedReductions = reductions.reduce(
        (costs,reduction) => costs.add(reduction), initial);
    return costs.subtract(consolidatedReductions)
}

function ensureMinimumCosts(cost:PrimaryCost):PrimaryCost {
    return cost.isZero() ? cost.add(new Cost(1, 0, false).asModifier()) : cost;
}