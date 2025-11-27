import { CheckModifierHandler } from "module/check/CheckModifierHandler";
import sinon from "sinon";
import SplittermondItem from "module/item/item";
import { condense, of } from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";

describe("CheckModifierHandler", () => {
    const sandbox = sinon.createSandbox();
    const errorLogger = sandbox.stub();

    beforeEach(() => {
        sandbox.stub(foundryApi, "format").callsFake((key) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key) => key);
    });

    afterEach(() => {
        sandbox.restore();
        errorLogger.resetHistory();
    });

    it("should accept a modifier with a valid outcome category", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "outstanding" },
            value: of(2),
        });

        expect(result).to.have.length(1);
        expect(result[0].groupId).to.equal("check.result");
        expect(result[0].value).to.deep.equal(of(2));
        expect(result[0].attributes.category).to.equal("outstanding");
        expect(result[0].attributes.name).to.equal("Test Item");
        expect(result[0].attributes.type).to.equal("innate");
        expect(result[0].selectable).to.equal(false);
        expect(errorLogger.called).to.be.false;
    });

    it("should correct value by multiplier", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(3));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "success" },
            value: of(2),
        });

        expect(condense(result[0].value)).to.deep.equal(of(6));
        expect(errorLogger.called).to.be.false;
    });

    ["outstanding", "success", "nearmiss", "failure", "devastating"].forEach((category) => {
        it(`should accept '${category}' as a valid category`, () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.name = "Test Item";
            const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

            const result = underTest.processModifier({
                path: "check.result",
                attributes: { category },
                value: of(3),
            });

            expect(result).to.have.length(1);
            expect(result[0].attributes.category).to.equal(category);
            expect(errorLogger.called).to.be.false;
        });
    });

    it("should accept a skill attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "success", skill: "endurance" },
            value: of(3),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.skill).to.equal("endurance");
        expect(errorLogger.called).to.be.false;
    });

    it("should pass an invalid skill attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "success", skill: "perturbance" },
            value: of(3),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.skill).to.equal("perturbance");
        expect(errorLogger.called).to.be.true;
    });

    it("should use item name when emphasis is not provided", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "success" },
            value: of(2),
        })[0];

        expect(result.attributes.name).to.equal("Test Item");
        expect(result.attributes.emphasis).to.be.undefined;
        expect(result.selectable).to.equal(false);
        expect(errorLogger.called).to.be.false;
    });

    it("should use different modifier types", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "equipment", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "failure" },
            value: of(1),
        })[0];

        expect(result.attributes.type).to.equal("equipment");
        expect(errorLogger.called).to.be.false;
    });

    it("should log an error for invalid category", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "invalidCategory" },
            value: of(2),
        });

        expect(result).to.have.length(1);
        expect(errorLogger.calledOnce).to.be.true;
        expect(errorLogger.firstCall.args[0]).to.equal("splittermond.modifiers.parseMessages.invalidDescriptorValue");
    });

    it("should handle missing category attribute gracefully", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: {},
            value: of(2),
        });

        expect(result).to.have.length(0);
        expect(errorLogger.calledOnce).to.be.true;
        expect(errorLogger.firstCall.args[0]).to.equal("splittermond.modifiers.parseMessages.missingDescriptor");
    });

    it("should accept a type attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "success", type: "attack" },
            value: of(3),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.checkType).to.equal("attack");
        expect(errorLogger.called).to.be.false;
    });

    it("should report a wrong type attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new CheckModifierHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "check.result",
            attributes: { category: "success", type: "reverence" },
            value: of(3),
        });

        expect(result).to.have.length(1);
        expect(result[0].attributes.checkType).to.equal("reverence");
        expect(errorLogger.called).to.be.true;
    });
});
