import {describe, it} from "mocha";
import {expect} from "chai";
import {
    calculateReducedEnhancementCosts,
    calculateReducedSpellCosts
} from "module/util/costs/spellCosts.js";
import {Cost} from "module/util/costs/Cost.js";
import {initializeSpellCostManagement, SpellCostReductionManager} from "module/util/costs/spellCostManagement.js";
import {of} from "../../../../../module/modifiers/expressions/cost";

function mockReductionManager<T>(...cost:T[]){
 //This is a mock and therefore incomplete. For the purpose of the test this is a SpellCostReductionManager.
 return {getCostModifiers: () => cost} as unknown as SpellCostReductionManager
}
describe("Spell cost calculation basics", () => {
    const noReductionSpellCostManager = mockReductionManager();
    const baseSpellData = {
        skill: "deathmagic",
        spellType: "conjuration",
        costs: "K2V2",
        enhancementCosts: "K2V2",
    };

    it("should be able to calculate the cost of a spell", () => {
        const costs = "K2V2";
        const spellData = {...baseSpellData, costs};
        const reducedCosts = calculateReducedSpellCosts(spellData, noReductionSpellCostManager);
        expect(reducedCosts).to.deep.equal(costs);
    });

    it("should be able to calculate the enhanced cost of a spell", () => {
        const costs = "K2V2";
        const spellData = {...baseSpellData, enhancementCosts: `1EG/+${costs}`};
        const reducedCosts = calculateReducedEnhancementCosts(spellData, noReductionSpellCostManager);
        expect(reducedCosts).to.deep.equal(costs);
    });

    ["", null, undefined, [], 1, "0"].forEach((costs) => {
        it(`should handle a spell with invalid cost ${costs}`, () => {
            const spellData = {...baseSpellData, costs: costs as any/*we're simulationg invalid input here*/};
            const reducedCosts = calculateReducedSpellCosts(spellData, noReductionSpellCostManager);
            expect(reducedCosts).to.equal("1");
        });
        it(`should handle a spell with invalid enhancement cost ${costs}`, () => {
            const spellData = {...baseSpellData, enhancementCosts: costs as any/*we're simulationg invalid input here*/};
            const reducedCosts = calculateReducedEnhancementCosts(spellData, noReductionSpellCostManager);
            expect(reducedCosts).to.equal("0");
        });
    });

    ["", null, undefined].forEach((value) => {
        it(`should handle a spell with invalid type ${value}`, () => {
            const spellData = {...baseSpellData, spellType: value as any /*we're simulating invalid input*/};
            const reducedCosts = calculateReducedSpellCosts(spellData, noReductionSpellCostManager);
            expect(reducedCosts).to.equal(spellData.costs);
        });
        it(`enhancement should handle a spell with invalid type ${value}`, () => {
            const spellData = {...baseSpellData, spellType: value as any /*we're simulating invalid input*/};
            const reducedCosts = calculateReducedEnhancementCosts(spellData, noReductionSpellCostManager);
            expect(reducedCosts).to.equal(spellData.costs);
        });

        it(`should handle a spell with invalid skill ${value}`, () => {
            const spellData = {...baseSpellData, skill: value as any /*we're simulating invalid input*/};
            const reducedCosts = calculateReducedSpellCosts(spellData, noReductionSpellCostManager);
            expect(reducedCosts).to.equal(spellData.costs);
        });

        it(`enhancement should handle a spell with invalid skill ${value}`, () => {
            const spellData = {...baseSpellData, skill: value as any /*we're simulating invalid input*/};
            const reducedCosts = calculateReducedEnhancementCosts(spellData, noReductionSpellCostManager);
            expect(reducedCosts).to.equal(spellData.costs);
        });
    });
});

describe("Spell cost calculation with reductions", () => {
    const baseSpellData = {
        skill: "deathmagic",
        spellType: "conjuration",
        costs: "K2V2",
        enhancementCosts: "K2V2"
    };

    it("should reduce the cost of a spell", () => {
        const reductionSpellCostManager = mockReductionManager(new Cost(1, 1, true).asModifier());
        const spellData = {...baseSpellData,costs : "K2V2"};
        const reducedCosts = calculateReducedSpellCosts(spellData, reductionSpellCostManager);
        expect(reducedCosts).to.equal("K1V1");
    })

    it ("should apply reductions if spell type is not set", () => {
        const reductionSpellCostManager = mockReductionManager(new Cost(1, 1, true).asModifier());
        const reducedCosts = calculateReducedSpellCosts(baseSpellData, reductionSpellCostManager);
        expect(reducedCosts).to.equal("K1V1");
    });

    it ("should apply reductions if skill is not set", () => {
        const reductionSpellCostManager = mockReductionManager(new Cost(1, 1, true).asModifier());
        const reducedCosts = calculateReducedSpellCosts(baseSpellData, reductionSpellCostManager);
        expect(reducedCosts).to.equal("K1V1");
    });

    it("should reduce the enhanced cost of a spell", () => {
        const reductionSpellCostManager = mockReductionManager(new Cost(1, 1, true).asModifier());
        baseSpellData.enhancementCosts = "1EG/+K2V2";
        const reducedCosts = calculateReducedEnhancementCosts(baseSpellData, reductionSpellCostManager);
        expect(reducedCosts).to.equal("K1V1");
    });
    ([["cost reduction", calculateReducedEnhancementCosts], ["enhancement reduction", calculateReducedSpellCosts]] as const).forEach(
        ([title, calculationFunction]) => {
            it(`${title} should allow increasing costs`, () => {
                const reductionSpellCostManager = mockReductionManager(new Cost(-1, -1, false).asModifier());
                baseSpellData.costs = "K2V2";
                const reducedCosts = calculationFunction(baseSpellData, reductionSpellCostManager);
                expect(reducedCosts).to.equal("K4V3");
            });

            it(`${title} should apply multiple reductions`, () => {
                const reductionSpellCostManager = mockReductionManager(
                    new Cost(-1, -1, false).asModifier(),
                    new Cost(2, 2, true).asModifier()
                );
                baseSpellData.costs = "K2V2";
                const reducedCosts = calculationFunction(baseSpellData, reductionSpellCostManager);
                expect(reducedCosts).to.equal("K1V1");
            });
        });
});

describe('Spell cost calculation reduction selection', () => {
    const reductionManagement = initializeSpellCostManagement({});
    const spellData = {
        skill: "",
        spellType: "conjuration, corporal",
        costs: "K20V5",
        enhancementCosts: "5EG/+K20V5",
    };
    [reductionManagement.spellCostReduction, reductionManagement.spellEnhancedCostReduction].forEach(
        reductionManager => {
            reductionManager.modifiers.put(of(new Cost(1, 1, true).asModifier()), "deathmagic", "conjuration");
            reductionManager.modifiers.put(of(new Cost(2, 2, false).asModifier()), "lightmagic", "corporal");
            reductionManager.modifiers.put(of(new Cost(3, 3, false).asModifier()), "lightmagic", "conjuration");
            reductionManager.modifiers.put(of(new Cost(3, 1, false).asModifier()), "combatmagic", null);
        });

    it("cost Reduction should apply the reduction for the skill and type", () => {
        spellData.skill = "deathmagic";
        const reducedCosts = calculateReducedSpellCosts(spellData, reductionManagement.spellCostReduction);
        expect(reducedCosts).to.equal("K18V4");
    });

    it("cost Reduction should apply reductions for several types", () => {
        spellData.skill = "lightmagic";
        const reducedCosts = calculateReducedSpellCosts(spellData, reductionManagement.spellCostReduction);
        expect(reducedCosts).to.equal("K10");
    });
    it("enhancement cost reduction should apply the reduction for the skill and type", () => {
        spellData.skill = "deathmagic";
        const reducedCosts = calculateReducedEnhancementCosts(spellData, reductionManagement.spellCostReduction);
        expect(reducedCosts).to.equal("K18V4");
    });

    it("enhancement cost Reduction should apply reductions for several types", () => {
        spellData.skill = "lightmagic";
        const reducedCosts = calculateReducedEnhancementCosts(spellData, reductionManagement.spellCostReduction);
        expect(reducedCosts).to.equal("K10");
    });

    it("should apply reductions only once per spell", ()=>{
        spellData.skill = "combatmagic";
        const reducedCosts = calculateReducedEnhancementCosts(spellData, reductionManagement.spellCostReduction);
        expect(reducedCosts).to.equal("K16V4");
    })
})
;