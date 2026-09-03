import { CheckRequireModifierHandler } from "module/check/CheckRequireModifierHandler";
import sinon from "sinon";
import SplittermondItem from "module/item/item";
import { of } from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";

describe("CheckRequireModifierHandler", () => {
    const sandbox = sinon.createSandbox();
    const errorLogger = sandbox.stub();

    beforeEach(() => {
        sandbox.stub(foundryApi, "format").callsFake((key) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => {
            switch (key) {
                case "splittermond.rollType.standard":
                    return "Standardwurf";
                case "splittermond.rollType.risk":
                    return "Risikowurf";
                case "splittermond.rollType.safety":
                    return "Sicherheitswurf";
                case "splittermond.rollType.standardGrandmaster":
                    return "Standardwurf (Großmeister)";
                case "splittermond.rollType.riskGrandmaster":
                    return "Risikowurf (Großmeister)";
                case "splittermond.rollType.safetyGrandmaster":
                    return "Sicherheitswurf (Großmeister)";
                default:
                    return key;
            }
        });
    });

    afterEach(() => {
        sandbox.restore();
        errorLogger.resetHistory();
    });

    ["standard", "risk", "safety", "standardGrandmaster", "riskGrandmaster", "safetyGrandmaster"].forEach(
        (rollType) => {
            it(`should accept '${rollType}' as a valid rollType`, () => {
                const item = sandbox.createStubInstance(SplittermondItem);
                item.name = "Test Item";
                const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

                const result = underTest.processModifier({
                    path: "check.require",
                    rawFragment: `check.require rollType="${rollType}"`,
                    attributes: { rollType },
                    value: of(0),
                });

                expect(result).to.have.length(1);
                expect(result[0].attributes.rollType).to.equal(rollType);
                expect(result[0].attributes.name).to.equal("Test Item");
                expect(result[0].attributes.type).to.equal("innate");
                expect(result[0].selectable).to.equal(false);
                expect(errorLogger.called).to.be.false;
            });
        }
    );

    it("should resolve German translations to internal codes", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="Standardwurf"',
            attributes: { rollType: "Standardwurf" },
            value: of(0),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.rollType).to.equal("standard");
        expect(errorLogger.called).to.be.false;
    });

    it("should resolve German grandmaster translations to internal codes", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="Sicherheitswurf (Großmeister)"',
            attributes: { rollType: "Sicherheitswurf (Großmeister)" },
            value: of(0),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.rollType).to.equal("safetyGrandmaster");
        expect(errorLogger.called).to.be.false;
    });

    it("should log an error for invalid rollType and still return the raw value", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="invalidRollType"',
            attributes: { rollType: "invalidRollType" },
            value: of(0),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.rollType).to.equal("invalidRollType");
        expect(errorLogger.calledOnce).to.be.true;
        expect(errorLogger.firstCall.args[0]).to.equal("splittermond.modifiers.parseMessages.invalidDescriptorValue");
    });

    it("should handle missing rollType attribute gracefully", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: "check.require",
            attributes: {},
            value: of(0),
        });

        expect(result).to.have.length(0);
        expect(errorLogger.calledOnce).to.be.true;
        expect(errorLogger.firstCall.args[0]).to.equal("splittermond.modifiers.parseMessages.missingDescriptor");
    });

    it("should accept a skill filtering attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="standard" skill="endurance"',
            attributes: { rollType: "standard", skill: "endurance" },
            value: of(0),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.skill).to.equal("endurance");
        expect(result[0].attributes.rollType).to.equal("standard");
        expect(errorLogger.called).to.be.false;
    });

    it("should pass an invalid skill attribute through with an error", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="standard" skill="perturbance"',
            attributes: { rollType: "standard", skill: "perturbance" },
            value: of(0),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.skill).to.equal("perturbance");
        expect(errorLogger.called).to.be.true;
    });

    it("should accept a type filtering attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="standard" type="attack"',
            attributes: { rollType: "standard", type: "attack" },
            value: of(0),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.checkType).to.equal("attack");
        expect(result[0].attributes.rollType).to.equal("standard");
        expect(errorLogger.called).to.be.false;
    });

    it("should report a wrong type attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="standard" type="reverence"',
            attributes: { rollType: "standard", type: "reverence" },
            value: of(0),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.checkType).to.equal("reverence");
        expect(errorLogger.called).to.be.true;
    });

    it("should use item name when emphasis is not provided", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="standard"',
            attributes: { rollType: "standard" },
            value: of(0),
        })[0];

        expect(result.attributes.name).to.equal("Test Item");
        expect(result.attributes.emphasis).to.be.undefined;
        expect(result.selectable).to.equal(false);
        expect(errorLogger.called).to.be.false;
    });

    it("should use different modifier types", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "equipment");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="standard"',
            attributes: { rollType: "standard" },
            value: of(0),
        })[0];

        expect(result.attributes.type).to.equal("equipment");
        expect(errorLogger.called).to.be.false;
    });

    it("should produce a modifier with the check.require path and zero placeholder value", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckRequireModifierHandler(errorLogger, item, "innate");

        const result = underTest.processModifier({
            path: "check.require",
            rawFragment: 'check.require rollType="standard"',
            attributes: { rollType: "standard" },
            value: of(0),
        })[0];

        expect(result.groupId).to.equal("check.require");
        expect(result.value).to.deep.equal(of(0));
    });
});
