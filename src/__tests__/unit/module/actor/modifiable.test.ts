import Modifiable from "module/actor/modifiable";
import sinon from "sinon";
import SplittermondActor from "module/actor/actor";
import ModifierManager, { type IModifier } from "module/actor/modifier-manager";
import { TooltipFormula } from "module/util/tooltip";
import { isLessThanZero, of } from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import { splittermond } from "module/config";
import { foundryApi } from "module/api/foundryApi";

describe("Modifiable", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    describe("Basics", () => {
        [[2], [-3, 6], [0, 6, 5]].forEach((values) => {
            it(`should calculate over modifier values [${values.join(", ")}]`, () => {
                const testActor = setUpActor();
                values.forEach((value) => {
                    testActor.modifier.addModifier(modifierWith({ groupId: "endurance", value: of(value) }));
                });
                const underTest = new Modifiable(testActor, "endurance");

                expect(underTest.mod).to.equal(values.reduce((a, b) => a + b, 0));
            });

            it(`should add a tooltip element for each of [${values.join(", ")}]`, () => {
                const testActor = setUpActor();
                const tooltipStub = sandbox.stub();
                values.forEach((value) => {
                    testActor.modifier.addModifier(
                        modifierWith({ groupId: "endurance", value: of(value), addTooltipFormulaElements: tooltipStub })
                    );
                });
                const underTest = new Modifiable(testActor, "endurance");

                const tooltip = new TooltipFormula();
                underTest.addModifierTooltipFormulaElements(tooltip);

                expect(tooltipStub.firstCall.firstArg).to.equal(tooltip);
                expect(tooltipStub.callCount).to.equal(values.length);
            });
        });
    });
    describe("Bonus cap calculation", () => {
        it("should apply bonus cap of 3 for hero level 1", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(5),
                    attributes: { type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 1 → bonusCap = 1 + 2 = 3
            // Equipment bonus = 5, capped to 3
            expect(underTest.mod).to.equal(3);
        });

        it("should apply bonus cap of 4 for hero level 2", () => {
            const testActor = setUpActor(2);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(6),
                    attributes: { type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 2 → bonusCap = 2 + 2 = 4
            // Equipment bonus = 6, capped to 4
            expect(underTest.mod).to.equal(4);
        });

        it("should apply bonus cap of 5 for hero level 3", () => {
            const testActor = setUpActor(3);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(7),
                    attributes: { type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 3 → bonusCap = 3 + 2 = 5
            // Equipment bonus = 7, capped to 5
            expect(underTest.mod).to.equal(5);
        });

        it("should apply bonus cap of 6 for hero level 4", () => {
            const testActor = setUpActor(4);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(8),
                    attributes: { type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 4 → bonusCap = 4 + 2 = 6
            // Equipment bonus = 8, capped to 6
            expect(underTest.mod).to.equal(6);
        });

        it("should not cap equipment bonuses below the cap", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(2),
                    attributes: { type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 1 → bonusCap = 3
            // Equipment bonus = 2, not capped
            expect(underTest.mod).to.equal(2);
        });

        it("should cap magic bonuses separately from equipment bonuses", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(5),
                    attributes: { type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(4),
                    attributes: { type: "magic" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 1 → bonusCap = 3
            // Equipment bonus = 5, capped to 3
            // Magic bonus = 4, capped to 3
            // Total = 3 + 3 = 6
            expect(underTest.mod).to.equal(6);
        });

        it("should not cap non-bonus (penalty) modifiers", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(5),
                    attributes: { type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(-2),
                    attributes: { type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 1 → bonusCap = 3
            // Equipment bonus = 5, capped to 3
            // Equipment penalty = -2, not capped
            // Total = 3 + (-2) = 1
            expect(underTest.mod).to.equal(1);
        });

        it("should not cap innate bonuses", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(5),
                    attributes: { type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(4),
                    attributes: { type: "innate" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 1 → bonusCap = 3
            // Equipment bonus = 5, capped to 3
            // Innate bonus = 4, not capped
            // Total = 3 + 4 = 7
            expect(underTest.mod).to.equal(7);
        });

        it("should handle multiple equipment and magic bonuses with cap", () => {
            const testActor = setUpActor(2);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(2),
                    attributes: { type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(3),
                    attributes: { type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(2),
                    attributes: { type: "magic" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(2),
                    attributes: { type: "magic" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // Hero level 2 → bonusCap = 4
            // Equipment bonuses = 2 + 3 = 5, capped to 4
            // Magic bonuses = 2 + 2 = 4, not capped (exactly at cap)
            // Total = 4 + 4 = 8
            expect(underTest.mod).to.equal(8);
        });

        it("should handle zero equipment bonuses", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(5),
                    attributes: { type: "innate" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            // No equipment/magic bonuses, so cap doesn't apply
            expect(underTest.mod).to.equal(5);
        });
    });
    describe("Bonus cap presentation", () => {
        beforeEach(() => {
            sandbox.stub(foundryApi, "localize").callsFake((key) => key);
        });
        it("should add a BonusCap malus to tooltip when equipment bonus exceeds cap", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(5),
                    attributes: { name: "Equipment Bonus", type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Should have a malus entry for the overflow (5 - 3 = 2)
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(1);
            expect(malusEntries[0].value).to.equal("2");
            expect(malusEntries[0].description).to.equal("splittermond.bonusCap");
        });

        it("should add a BonusCap malus when magic bonus exceeds cap", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(6),
                    attributes: { name: "Magic Bonus", type: "magic" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Should have a malus entry for the overflow (6 - 3 = 3)
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(1);
            expect(malusEntries[0].value).to.equal("3");
            expect(malusEntries[0].description).to.equal("splittermond.bonusCap");
        });

        it("should add a BonusCap malus for both equipment and magic overflow", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(5),
                    attributes: { name: "Equipment Bonus", type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(4),
                    attributes: { name: "Magic Bonus", type: "magic" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Should have a malus entry for combined overflow: equipment (5-3=2) + magic (4-3=1) = 3
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(1);
            expect(malusEntries[0].value).to.equal("3");
            expect(malusEntries[0].description).to.equal("splittermond.bonusCap");
        });

        it("should not add a BonusCap malus when equipment bonus is below cap", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(2),
                    attributes: { name: "Equipment Bonus", type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Should have no malus entries
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(0);
        });

        it("should not add a BonusCap malus when equipment bonus equals cap", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(3),
                    attributes: { name: "Equipment Bonus", type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Should have no malus entries when exactly at cap
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(0);
        });

        it("should not add a BonusCap malus for innate bonuses", () => {
            const testActor = setUpActor(1);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(10),
                    attributes: { name: "Innate Bonus", type: "innate" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Innate bonuses should not trigger cap malus
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(0);
        });

        it("should correctly calculate malus for multiple equipment bonuses exceeding cap", () => {
            const testActor = setUpActor(2);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(3),
                    attributes: { name: "Equipment Bonus 1", type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(4),
                    attributes: { name: "Equipment Bonus 2", type: "equipment" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Hero level 2 → cap = 4, equipment total = 7, overflow = 3
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(1);
            expect(malusEntries[0].value).to.equal("3");
            expect(malusEntries[0].description).to.equal("splittermond.bonusCap");
        });

        it("should show correct malus with equipment over cap and magic at cap", () => {
            const testActor = setUpActor(2);
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(6),
                    attributes: { name: "Equipment Bonus", type: "equipment" },
                })
            );
            testActor.modifier.addModifier(
                modifierWith({
                    groupId: "endurance",
                    value: of(4),
                    attributes: { name: "Magic Bonus", type: "magic" },
                })
            );
            const underTest = new Modifiable(testActor, "endurance");

            const tooltip = new TooltipFormula();
            underTest.addModifierTooltipFormulaElements(tooltip);
            const data = tooltip.getData();

            // Hero level 2 → cap = 4
            // Equipment: 6 - 4 = 2 overflow
            // Magic: 4 - 4 = 0 overflow
            // Total overflow = 2
            const malusEntries = data.filter((p) => p.classes.includes("malus"));
            expect(malusEntries).to.have.lengthOf(1);
            expect(malusEntries[0].value).to.equal("2");
            expect(malusEntries[0].description).to.equal("splittermond.bonusCap");
        });
    });
    function setUpActor(heroLevel: 1 | 2 | 3 | 4 = 1) {
        const actor = sandbox.createStubInstance(SplittermondActor);
        const dataModel = sandbox.createStubInstance(CharacterDataModel);
        dataModel.updateSource.callThrough();
        dataModel.updateSource({
            experience: {
                heroLevel,
                free: 0,
                spent: 100 * heroLevel,
                nextLevelValue: splittermond.heroLevel[heroLevel - 1],
            },
        });
        actor.system = dataModel;
        Object.defineProperty(actor, "type", { value: "character" });
        Object.defineProperty(actor, "modifier", { value: new ModifierManager() });
        return actor;
    }

    function modifierWith(
        props: Omit<Partial<IModifier>, "attributes"> & { attributes?: Partial<IModifier["attributes"]> }
    ): IModifier {
        return {
            groupId: props.groupId ?? "unknown",
            isBonus: !(props.value && isLessThanZero(props.value)),
            selectable: props.selectable ?? false,
            origin: props.origin ?? null,
            value: props.value ?? of(1),
            addTooltipFormulaElements: props.addTooltipFormulaElements ?? sandbox.stub(),
            attributes: {
                name: props.attributes?.name ?? "Test Modifier",
                type: props.attributes?.type ?? "innate",
            },
        };
    }
});
