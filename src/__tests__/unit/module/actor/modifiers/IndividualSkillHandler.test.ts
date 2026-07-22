import SplittermondItem from "module/item/item";
import { IndividualSkillHandlers } from "module/actor/modifiers/ActorModifierHandlers";
import { condense, of } from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import sinon from "sinon";
import { foundryApi } from "module/api/foundryApi";

describe("ActorModifierHandlers", () => {
    const sandbox = sinon.createSandbox();
    const errorLogger = sandbox.stub();

    beforeEach(() => {
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
    });

    afterEach(() => {
        sandbox.restore();
        errorLogger.resetHistory();
    });
    it("should create a handler for a specific skill", () => {
        const skill = "athletics";
        const item = sandbox.createStubInstance(SplittermondItem);
        const IndividualSkillHandlerClass = IndividualSkillHandlers(skill);
        const underTest = new IndividualSkillHandlerClass(errorLogger, item, "innate");
        item.name = "Test Item";

        const result = underTest.processModifier({
            path: "athletics",
            rawFragment: "athletics +3",
            attributes: {},
            value: of(3),
        })[0];
        expect(result.groupId).to.equal("athletics");
        expect(condense(result.value)).to.deep.equal(of(3));
        expect(result.attributes.name).to.equal("Test Item");
        expect(result.attributes.type).to.equal("innate");
        expect(errorLogger.called).to.be.false;
    });

    it("should log an error for invalid emphasis attribute", () => {
        const skill = "athletics";
        const item = sandbox.createStubInstance(SplittermondItem);
        const IndividualSkillHandlerClass = IndividualSkillHandlers(skill);
        const underTest = new IndividualSkillHandlerClass(errorLogger, item, "innate");
        item.name = "Test Item";

        const result = underTest.processModifier({
            path: "athletics",
            rawFragment: 'athletics emphasis="123" +3',
            attributes: { emphasis: 123 },
            value: of(3),
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].attributes.emphasis).to.be.undefined;
        expect(errorLogger.called).to.be.true;
    });

    it("should omit modifier for zero value", () => {
        const skill = "athletics";
        const item = sandbox.createStubInstance(SplittermondItem);
        const IndividualSkillHandlerClass = IndividualSkillHandlers(skill);
        const underTest = new IndividualSkillHandlerClass(errorLogger, item, "innate");
        item.name = "Test Item";

        const result = underTest.processModifier({
            path: "athletics",
            rawFragment: "athletics +0",
            attributes: {},
            value: of(0),
        });
        expect(result).to.be.empty;
        expect(errorLogger.called).to.be.false;
    });

    it("should not bake the multiplier into the value", () => {
        const skill = "athletics";
        const item = sandbox.createStubInstance(SplittermondItem);
        const IndividualSkillHandlerClass = IndividualSkillHandlers(skill);
        const underTest = new IndividualSkillHandlerClass(errorLogger, item, "innate");
        item.name = "Test Item";

        const result = underTest.processModifier({
            path: "athletics",
            rawFragment: "athletics +3",
            attributes: {},
            value: of(3),
        })[0];
        expect(result.groupId).to.equal("athletics");
        expect(condense(result.value)).to.deep.equal(of(3));
        expect(result.attributes.name).to.equal("Test Item");
        expect(result.attributes.type).to.equal("innate");
        expect(errorLogger.called).to.be.false;
    });

    it("should account for emphasis attribute", () => {
        const skill = "athletics";
        const item = sandbox.createStubInstance(SplittermondItem);
        const IndividualSkillHandlerClass = IndividualSkillHandlers(skill);
        const underTest = new IndividualSkillHandlerClass(errorLogger, item, "innate");
        item.name = "Test Item";

        const result = underTest.processModifier({
            path: "athletics",
            rawFragment: 'athletics emphasis="Running" +3',
            attributes: { emphasis: "Running" },
            value: of(3),
        })[0];
        expect(result.groupId).to.equal("athletics");
        expect(condense(result.value)).to.deep.equal(of(3));
        expect(result.attributes.name).to.equal("Running");
        expect(result.attributes.emphasis).to.equal("Running");
        expect(result.attributes.type).to.equal("innate");
        expect(errorLogger.called).to.be.false;
    });
});
