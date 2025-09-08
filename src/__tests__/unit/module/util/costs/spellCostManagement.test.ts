import {describe, it} from "mocha";
import {expect} from "chai";
import {initializeSpellCostManagement} from "module/util/costs/spellCostManagement";
import {Cost} from "module/util/costs/Cost";
import {parseCostString} from "../../../../../module/util/costs/costParser";
import {type CostExpression, of} from "../../../../../module/actor/modifiers/expressions/cost";

describe("Spell cost Management initialization", () => {
    const management = initializeSpellCostManagement({});
    it("should have a spell cost reduction manager", () => {
        expect(management.spellCostReduction).to.not.be.undefined;
    });
    it("should have a spell enhanced cost reduction manager", () => {
        expect(management.spellEnhancedCostReduction).to.not.be.undefined;
    });
});
describe("Spell cost Management addition of reductions", () => {
    ([
        ["spellCostManger", "spellCostReduction"],
        ["enhancementCostManger", "spellEnhancedCostReduction"]
    ] as const).forEach(([title, managerKey]) => {
        it(`should be able to add a global cost modifier for ${title}`, () => {
            const manager = initializeSpellCostManagement({})[managerKey];
            manager.addCostModifier({label: "foreduction", value: mod("K2V1"), skill: null});
            const reductions = manager.getCostModifiers("deathmagic", "conjuration");
            expect(reductions).to.deep.contain(new Cost(1, 1, true).asModifier());
        });

        it(`should be able to add a skill specific cost modifier for ${title} for a skilled item`, () => {
            const manager = initializeSpellCostManagement({})[managerKey];
            manager.addCostModifier({label: "foreduction", value: mod("K2V1"), skill: "deathmagic"});
            const reductions = manager.getCostModifiers("deathmagic", "");
            expect(reductions).to.deep.contain(new Cost(1, 1, true).asModifier());
            expect(manager.getCostModifiers("", "")).to.be.empty;
        });

        it(`should be able to add a skill specific cost modifier for ${title}`, () => {
            const manager = initializeSpellCostManagement({})[managerKey];
            manager.addCostModifier({label: "foreduction.deathmagic", value: mod("4V2"), skill: "deathmagic"});
            const reductions = manager.getCostModifiers("deathmagic", "conjuration");
            expect(reductions).to.deep.contain(new Cost(2, 2, false).asModifier());
        });

        it(`should be able to add a skill & type specific cost modifier for ${title}`, () => {
            const manager = initializeSpellCostManagement({})[managerKey];
            manager.addCostModifier({
                label: "foreduction.deathmagic.conjuration",
                value: mod("6V3"),
                skill: "deathmagic"
            });
            const reductions = manager.getCostModifiers("deathmagic", "conjuration");
            expect(reductions).to.deep.contain(new Cost(3, 3, false).asModifier());
        });

        it(`should be use the skill as group if no group is given for ${title}`, () => {
            const manager = initializeSpellCostManagement({})[managerKey];
            manager.addCostModifier({label: "foreduction", value: mod("8V4"), skill: "deathmagic"});
            const reductions = manager.getCostModifiers("deathmagic", "conjuration");
            expect(reductions).to.deep.contain(new Cost(4, 4, false).asModifier());
        });
    });
});

describe("Spell cost Management multiple reductions", () => {
    ([
        ["spell cost reduction", "spellCostReduction"],
        ["spell enhancement cost reduction", "spellEnhancedCostReduction"]
    ] as const).forEach(([title, managerKey]) => {
            it(`should return all global reductions for ${title}`, () => {
                const manager = initializeSpellCostManagement({})[managerKey];
                const zero = new Cost(0, 0, true).asModifier();
                manager.addCostModifier({label: "foreduction", value: mod("K2V1"), skill: null});
                manager.modifiers.put(of(new Cost(2, 2, true).asModifier()), null, null);

                expect(manager.getCostModifiers("", "")).to.have.length(2);
                expect(manager.getCostModifiers("", "").reduce((a, b) => a.add(b), zero)).to.deep.equal(new Cost(3, 3, true).asModifier());
            });

            it(`should return all skill specific reductions for ${title}`, () => {
                const manager = initializeSpellCostManagement({})[managerKey];
                const zero = new Cost(0, 0, true).asModifier();
                manager.modifiers.put(of(new Cost(1, 1, true).asModifier()), "deathmagic", null);
                manager.modifiers.put(of(new Cost(2, 2, true).asModifier()), "deathmagic", null);

                expect(manager.getCostModifiers("deathmagic", "")).to.have.length(2);
                expect(manager.getCostModifiers("deathmagic", "").reduce((a, b) => a.add(b), zero)).to.deep.equal(new Cost(3, 3, true).asModifier());
            });

            it(`should return all skill and type specific reductions for ${title}`, () => {
                const manager = initializeSpellCostManagement({})[managerKey];
                const zero = new Cost(0, 0, true).asModifier();
                manager.modifiers.put(of(new Cost(1, 1, true).asModifier()), "deathmagic", "spirit");
                manager.modifiers.put(of(new Cost(2, 2, true).asModifier()), "deathmagic", "spirit");

                expect(manager.getCostModifiers("deathmagic", "spirit")).to.have.length(2);
                expect(manager.getCostModifiers("deathmagic", "spirit").reduce((a, b) => a.add(b), zero)).to.deep.equal(new Cost(3, 3, true).asModifier());
            });
        }
    )
    ;
});

describe("Spell cost Management selection of reductions", () => {
    const deathmagicConjurationReduction = new Cost(1, 1, true).asModifier();
    const deathmagicSicknessReduction = new Cost(2, 2, false).asModifier();
    const lightmagicConjurationReduction = new Cost(3, 3, true).asModifier();
    const deathmagicReduction = new Cost(4, 4, false).asModifier();
    const lightmagicReduction = new Cost(5, 5, true).asModifier();
    const conjurationReduction = new Cost(6, 6, false).asModifier();
    const sicknessReduction = new Cost(7, 7, true).asModifier();
    const globalReduction = new Cost(8, 8, false).asModifier();
    const management = initializeSpellCostManagement({});
    [management.spellCostReduction, management.spellEnhancedCostReduction].forEach(
        reductionManager => {
            reductionManager.modifiers.put(of(deathmagicConjurationReduction), "deathmagic", "conjuration");
            reductionManager.modifiers.put(of(deathmagicSicknessReduction), "deathmagic", "sickness");
            reductionManager.modifiers.put(of(lightmagicConjurationReduction), "lightmagic", "conjuration");
            reductionManager.modifiers.put(of(sicknessReduction), null, "sickness");
            reductionManager.modifiers.put(of(conjurationReduction), null, "conjuration");
            reductionManager.modifiers.put(of(deathmagicReduction), "deathmagic", null);
            reductionManager.modifiers.put(of(lightmagicReduction), "lightmagic", null);
            reductionManager.modifiers.put(of(globalReduction), null, null);
        });

    ([management.spellCostReduction, management.spellEnhancedCostReduction] as const).forEach(
        reductionManager => {
            it("should return only the global reduction if no skill or type is given", () => {
                const reductions = reductionManager.getCostModifiers("", "")
                expect(reductions).to.have.length(1);
                expect(reductions).to.contain(globalReduction);
            });

            it("should return skill specific and global reductions if only a skill is given", () => {
                const reductions = reductionManager.getCostModifiers("deathmagic", "");
                expect(reductions).to.have.length(2);
                expect(reductions).to.contain.all.members([deathmagicReduction, globalReduction]);
            });

            it("should return type specific and global reductions if only a type is given", () => {
                const reductions = reductionManager.getCostModifiers("", "conjuration");
                expect(reductions).to.have.length(2);
                expect(reductions).to.contain.all.members([conjurationReduction, globalReduction]);
            });

            it("should return skill and type specific and global reductions if both are given", () => {
                const reductions = reductionManager.getCostModifiers("deathmagic", "conjuration");
                expect(reductions).to.have.length(4);
                expect(reductions).to.contain.all.members([deathmagicConjurationReduction, conjurationReduction, deathmagicReduction, globalReduction]);
            });

            it("should return the global reduction if wrong skill and no type is given", () => {
                const reductions = reductionManager.getCostModifiers("illusionmagic", "");
                expect(reductions).to.have.length(1);
                expect(reductions).to.contain(globalReduction);
            });

            it("should return the global reduction if wrong type and no skill is given", () => {
                const reductions = reductionManager.getCostModifiers("", "spirit");
                expect(reductions).to.have.length(1);
                expect(reductions).to.contain(globalReduction);
            });

            it("should return skill specific reduction if wrong type is given", () => {
                const reductions = reductionManager.getCostModifiers("deathmagic", "spirit");
                expect(reductions).to.have.length(2);
                expect(reductions).to.contain.all.members([deathmagicReduction, globalReduction]);

            });

            it("should return type specific reduction if wrong skill is given", () => {
                const reductions = reductionManager.getCostModifiers("illusionmagic", "conjuration");
                expect(reductions).to.have.length(2);
                expect(reductions).to.contain.all.members([conjurationReduction, globalReduction]);
            });
        });
});

function mod(input: string): CostExpression {
    return of(parseCostString(input).asModifier());
}
