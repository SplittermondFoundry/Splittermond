import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import "module/activeEffect";
import {
    ActionEffectDataModel,
    type ActionEffectSchemaType,
} from "module/activeEffect/dataModel/ActionEffectDataModel";
import { serialize as serializeScalar } from "module/modifiers/expressions/scalar/serialization";
import { type Expression, of } from "module/modifiers/expressions/scalar";
import type { ModifierAttributes } from "module/modifiers";
import { serialize as serializeCost } from "module/modifiers/expressions/cost/serialization";
import { of as ofCost } from "module/modifiers/expressions/cost";
import { CostModifier } from "module/util/costs/Cost";
import { TooltipFormula } from "module/util/tooltip";
import { injectParent } from "__tests__/unit/testUtils";

type ModifierEntry = ActionEffectSchemaType["modifiers"][number];
type CostModifierEntry = ActionEffectSchemaType["costModifiers"][number];

function modifierEntry(
    path: string,
    value: Expression,
    kind: "additive" | "inverse" | "multiplicative",
    attributes: ModifierAttributes = { name: "Test", type: "innate" }
): ModifierEntry {
    return {
        path,
        serializedValue: serializeScalar(value),
        implementation: kind,
        selectable: false,
        attributes,
    };
}

function costModifierEntry(label: string, cost: CostModifier, skill: string | null = null): CostModifierEntry {
    return {
        label,
        serializedValue: serializeCost(ofCost(cost)),
        skill,
        attributes: {},
    };
}

function createModel(data: Partial<ActionEffectSchemaType>): ActionEffectDataModel {
    const model = new ActionEffectDataModel(
        {
            modifiers: data.modifiers ?? [],
            costModifiers: data.costModifiers ?? [],
        },
        {}
    );
    injectParent(model);
    return model;
}

describe("ActionEffectDataModel", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    describe("schema defaults", () => {
        it("should initialize modifiers and costModifiers as empty arrays", () => {
            const model = createModel({});
            expect(model.toObject().modifiers).to.deep.equal([]);
            expect(model.toObject().costModifiers).to.deep.equal([]);
        });
    });

    describe("asModifiers getter", () => {
        it("should return empty array when no modifiers", () => {
            const model = createModel({});
            expect(model.asModifiers).to.have.length(0);
        });

        it("should deserialize additive modifier correctly", () => {
            const model = createModel({
                modifiers: [modifierEntry("speed.multiplier", of(2), "additive")],
            });
            const mods = model.asModifiers;
            expect(mods).to.have.length(1);
            expect(mods[0].groupId).to.equal("speed.multiplier");
            expect(mods[0].isBonus).to.be.true;
        });

        it("should detect additive malus correctly", () => {
            const model = createModel({
                modifiers: [modifierEntry("speed.multiplier", of(-3), "additive")],
            });
            const mod = model.asModifiers[0];
            expect(mod.isBonus).to.be.false;
        });

        it("should deserialize inverse modifier correctly", () => {
            const model = createModel({
                modifiers: [modifierEntry("initiative", of(-2), "inverse")],
            });
            const mod = model.asModifiers[0];
            expect(mod.isBonus).to.be.true;
        });

        it("should detect inverse malus correctly", () => {
            const model = createModel({
                modifiers: [modifierEntry("initiative", of(3), "inverse")],
            });
            const mod = model.asModifiers[0];
            expect(mod.isBonus).to.be.false;
        });

        it("should deserialize multiplicative modifier correctly", () => {
            const model = createModel({
                modifiers: [modifierEntry("damage", of(2), "multiplicative")],
            });
            const mod = model.asModifiers[0];
            expect(mod.isBonus).to.be.true;
        });

        it("should detect multiplicative malus correctly", () => {
            const model = createModel({
                modifiers: [modifierEntry("damage", of(0.5), "multiplicative")],
            });
            const mod = model.asModifiers[0];
            expect(mod.isBonus).to.be.false;
        });

        it("should deserialize multiple modifiers", () => {
            const model = createModel({
                modifiers: [
                    modifierEntry("path1", of(1), "additive"),
                    modifierEntry("path2", of(-1), "inverse"),
                    modifierEntry("path3", of(2), "multiplicative"),
                ],
            });
            const mods = model.asModifiers;
            expect(mods).to.have.length(3);
            expect(mods[0].groupId).to.equal("path1");
            expect(mods[1].groupId).to.equal("path2");
            expect(mods[2].groupId).to.equal("path3");
        });

        it("should preserve selectable flag", () => {
            const entry: ModifierEntry = {
                ...modifierEntry("path", of(1), "additive"),
                selectable: true,
            };
            const model = createModel({ modifiers: [entry] });
            expect(model.asModifiers[0].selectable).to.be.true;
        });

        it("should preserve attributes", () => {
            const model = createModel({
                modifiers: [modifierEntry("path", of(1), "additive", { name: "MyMod", type: "magic" })],
            });
            const attrs = model.asModifiers[0].attributes;
            expect(attrs.name).to.equal("MyMod");
            expect(attrs.type).to.equal("magic");
        });

        it("should format additive tooltip correctly", () => {
            const model = createModel({
                modifiers: [
                    modifierEntry("path", of(2), "additive", { name: "Bonus", type: "innate" }),
                    modifierEntry("path", of(-3), "additive", { name: "Malus", type: "innate" }),
                ],
            });
            const formula = sandbox.createStubInstance(TooltipFormula);
            model.asModifiers[0].addTooltipFormulaElements(formula);
            model.asModifiers[1].addTooltipFormulaElements(formula);
            expect(formula.addBonus.calledWith("+2", "Bonus")).to.be.true;
            expect(formula.addMalus.calledWith("-3", "Malus")).to.be.true;
        });

        it("should format inverse tooltip correctly", () => {
            const model = createModel({
                modifiers: [
                    modifierEntry("path", of(-2), "inverse", { name: "InvBonus", type: "innate" }),
                    modifierEntry("path", of(3), "inverse", { name: "InvMalus", type: "innate" }),
                ],
            });
            const formula = sandbox.createStubInstance(TooltipFormula);
            model.asModifiers[0].addTooltipFormulaElements(formula);
            model.asModifiers[1].addTooltipFormulaElements(formula);
            expect(formula.addOperator.calledWith("-")).to.be.true;
            expect(formula.addOperator.calledWith("+")).to.be.true;
            expect(formula.addPart.calledWith("2", "InvBonus", "bonus")).to.be.true;
            expect(formula.addPart.calledWith("3", "InvMalus", "malus")).to.be.true;
        });

        it("should format multiplicative tooltip correctly", () => {
            const model = createModel({
                modifiers: [modifierEntry("path", of(2), "multiplicative", { name: "Mult", type: "innate" })],
            });
            const formula = sandbox.createStubInstance(TooltipFormula);
            model.asModifiers[0].addTooltipFormulaElements(formula);
            expect(formula.addOperator.calledWith("*")).to.be.true;
            expect(formula.addPart.calledWith("2", "Mult", "bonus")).to.be.true;
        });
    });

    describe("asCostModifiers getter", () => {
        it("should return empty array when no cost modifiers", () => {
            const model = createModel({});
            expect(model.asCostModifiers).to.have.length(0);
        });

        it("should deserialize cost modifier correctly", () => {
            const cost = new CostModifier({ _channeled: 2, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 });
            const model = createModel({
                costModifiers: [costModifierEntry("focus.reduction", cost, "fireMagic")],
            });
            const mods = model.asCostModifiers;
            expect(mods).to.have.length(1);
            expect(mods[0].label).to.equal("focus.reduction");
            expect(mods[0].skill).to.equal("fireMagic");
        });

        it("should preserve null skill", () => {
            const cost = new CostModifier({ _channeled: 1, _channeledConsumed: 0, _exhausted: 0, _consumed: 0 });
            const model = createModel({
                costModifiers: [costModifierEntry("focus.reduction", cost)],
            });
            expect(model.asCostModifiers[0].skill).to.be.null;
        });

        it("should preserve attributes", () => {
            const cost = new CostModifier({ _channeled: 0, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 });
            const entry: CostModifierEntry = {
                ...costModifierEntry("focus.reduction", cost),
                attributes: { skill: "fireMagic", type: "magic" },
            };
            const model = createModel({ costModifiers: [entry] });
            const attrs = model.asCostModifiers[0].attributes;
            expect(attrs.skill).to.equal("fireMagic");
            expect(attrs.type).to.equal("magic");
        });
    });

    describe("unboundWarningContext", () => {
        it("should not throw when modifiers exist", () => {
            const model = createModel({
                modifiers: [
                    modifierEntry("speed.multiplier", of(2), "additive", { name: "Speed Boost", type: "magic" }),
                ],
            });
            expect(() =>
                (model as unknown as { produceIssueWarning: () => () => void }).produceIssueWarning()()
            ).to.not.throw();
        });

        it("should not throw when modifiers is empty", () => {
            const model = createModel({});
            expect(() =>
                (model as unknown as { produceIssueWarning: () => () => void }).produceIssueWarning()()
            ).to.not.throw();
        });
    });
});
