import { ActorSkillHandler, SkillHandler } from "module/actor/modifiers/SkillHandler";
import sinon from "sinon";
import SplittermondItem from "module/item/item";
import { of } from "module/modifiers/expressions/scalar";
import { expect } from "chai";
import { splittermond } from "module/config";
import { foundryApi } from "module/api/foundryApi";

describe("SkillHandler", () => {
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
    describe("skill collectives", () => {
        (
            [
                ["general", splittermond.skillGroups.general],
                ["fighting", splittermond.skillGroups.fighting],
                ["magic", splittermond.skillGroups.magic],
            ] as const
        ).forEach(([name, group]) => {
            it(`should map ${name} skills`, () => {
                const item = sandbox.createStubInstance(SplittermondItem);
                const underTest = new ActorSkillHandler(errorLogger, item, "innate", of(1));
                const result = underTest.processModifier({
                    path: `actor.skills.${name}`,
                    attributes: {},
                    value: of(2),
                });
                expect(result).to.have.length(group.length);
                result.forEach((skill) => {
                    expect(skill.value).to.deep.equal(of(2));
                    expect(skill.attributes.name).to.equal(item.name);
                    expect(skill.attributes.type).to.equal("innate");
                    expect(skill.groupId).to.be.oneOf(group);
                });
            });
        });
    });

    it("should accept a modifier with skill name", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new SkillHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "skills",
            attributes: { skill: "athletics" },
            value: of(3),
        });

        expect(result).to.have.length(1);
        expect(result[0].groupId).to.equal("actor.skills");
        expect(result[0].value).to.deep.equal(of(3));
        expect(result[0].attributes.skill).to.equal("athletics");
        expect(result[0].attributes.name).to.equal("Test Item");
        expect(result[0].attributes.type).to.equal("innate");
        expect(errorLogger.called).to.be.false;
    });

    ["attribute1", "attribute2"].forEach((attr) => {
        it(`should accept a modifier with ${attr}`, () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.name = "Test Item";
            const underTest = new SkillHandler(errorLogger, item, "innate", of(1));

            const attributes: Record<string, string> = {};
            attributes[attr] = "strength";

            const result = underTest.processModifier({
                path: "skills",
                attributes,
                value: of(2),
            });

            expect(result).to.have.length(1);
            expect(result[0].groupId).to.equal("actor.skills");
            expect(result[0].value).to.deep.equal(of(2));
            expect(result[0].attributes[attr]).to.equal("strength");
            expect(errorLogger.called).to.be.false;
        });
    });

    it("should log an error for unknown skill", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new ActorSkillHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "actor.skills",
            attributes: { skill: "unknownSkill" },
            value: of(2),
        });

        expect(result).to.have.length(1);
        expect(errorLogger.calledOnce).to.be.true;
        expect(errorLogger.firstCall.args[0]).to.equal("splittermond.modifiers.parseMessages.invalidDescriptorValue");
    });

    it("should log an error for unknown attribute", () => {
        const item = sandbox.createStubInstance(SplittermondItem);
        item.name = "Test Item";
        const underTest = new ActorSkillHandler(errorLogger, item, "innate", of(1));

        const result = underTest.processModifier({
            path: "actor.skills",
            attributes: { attribute1: "unknownAttribute" },
            value: of(2),
        });

        expect(result).to.have.length(1);
        expect(errorLogger.calledOnce).to.be.true;
        expect(errorLogger.firstCall.args[0]).to.equal("splittermond.modifiers.parseMessages.invalidDescriptorValue");
    });
});
