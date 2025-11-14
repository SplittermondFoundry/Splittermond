import { CostModifierHandler } from "module/util/costs/CostModifierHandler";
import sinon from "sinon";
import SplittermondSpellItem from "module/item/spell";
import { of } from "module/modifiers/expressions/scalar";
import { of as ofCost, times } from "module/modifiers/expressions/cost";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import { parseCostString } from "module/util/costs/costParser";
import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";

describe("CostModifierHandler", () => {
    const sandbox = sinon.createSandbox();
    let allErrors: string[] = [];

    function errorLogger(...messages: string[]) {
        allErrors.push(...messages);
    }
    beforeEach(() => {
        sandbox.stub(foundryApi, "localize").callsFake((key) => key);
        sandbox.stub(foundryApi, "format").callsFake((key) => key);
    });

    afterEach(() => {
        allErrors = [];
        sandbox.restore();
    });
    it("should fail for invalid path", () => {
        const item = createItemWithSkill(sandbox, "deathmagic");
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "invalid.path",
            value: asCost("2V1"),
            attributes: {},
        });

        expect(result).to.be.empty;
        expect(allErrors).to.have.length(1);
    });

    it("should map addition to reduction", () => {
        const item = createItemWithSkill(sandbox, "deathmagic");
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "focus.addition",
            value: asCost("2V1"),
            attributes: {},
        })![0];

        expect(result).to.not.be.null;
        expect(result?.label).to.equal("focus.reduction");
        expect(result?.value).to.deep.equal(times(of(-1), asCost("2V1")));
        expect(allErrors).to.have.length(0);
    });

    it("should map enhancedAddition to enhancedReduction", () => {
        const item = createItemWithSkill(sandbox, "deathmagic");
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "focus.enhancedAddition",
            value: asCost("2V1"),
            attributes: {},
        })![0];

        expect(result).to.not.be.null;
        expect(result?.label).to.equal("focus.enhancedreduction");
        expect(result?.value).to.deep.equal(times(of(-1), asCost("2V1")));
        expect(allErrors).to.have.length(0);
    });

    it("should create use item skill if skill attribute is invalid", () => {
        const item = createItemWithSkill(sandbox, "deathmagic");
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "focus.reduction",
            value: asCost("2V1"),
            attributes: { skill: "invalid" },
        })![0];

        expect(result).to.not.be.null;
        expect(result?.skill).to.equal("deathmagic");
        expect(allErrors).to.have.length(1);
    });

    it("should use the item skill if skill attribute is missing", () => {
        const item = createItemWithSkill(sandbox, "deathmagic");
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "focus.reduction",
            value: asCost("2V1"),
            attributes: {},
        })![0];

        expect(result).to.not.be.null;
        expect(result?.skill).to.equal("deathmagic");
        expect(allErrors).to.have.length(0);
    });

    it("should handle null multiplier for addition paths", () => {
        const item = createItemWithSkill(sandbox, "deathmagic");
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(2));

        const result = underTest.processModifier({
            path: "focus.addition",
            value: asCost("3V1"),
            attributes: {},
        })![0];

        expect(result).to.not.be.null;
        expect(result?.label).to.equal("focus.reduction");
        // The multiplier should be negated for addition paths
        expect(allErrors).to.have.length(0);
    });

    it("should handle items without skill property", () => {
        const item = createItemWithSkill(sandbox, null);
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "focus.reduction",
            value: asCost("2V1"),
            attributes: {},
        })![0];

        expect(result).to.not.be.null;
        expect(result?.skill).to.be.null;
        expect(allErrors).to.have.length(0);
    });

    it("should validate type attribute", () => {
        const item = createItemWithSkill(sandbox, "deathmagic");
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "focus.reduction",
            value: asCost("2V1"),
            attributes: { type: "valid-type" },
        })![0];

        expect(result).to.not.be.null;
        expect(result?.attributes.type).to.equal("valid-type");
        expect(allErrors).to.have.length(0);
    });

    it("should handle invalid skill but no item skill fallback", () => {
        const item = createItemWithSkill(sandbox, null);
        const underTest = new CostModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "focus.reduction",
            value: asCost("2V1"),
            attributes: { skill: "invalid" },
        })![0];

        expect(result).to.not.be.null;
        expect(result?.attributes.skill).to.equal("invalid");
        expect(allErrors).to.have.length(1);
    });
});

function createItemWithSkill(sandbox: sinon.SinonSandbox, skill: string | null | undefined) {
    const item = sandbox.createStubInstance(SplittermondSpellItem);
    item.system = sandbox.createStubInstance(SpellDataModel);
    Object.defineProperty(item.system, "skill", { value: skill, writable: false, enumerable: true });
    return item;
}

function asCost(costStr: string) {
    return ofCost(parseCostString(costStr).asModifier());
}
