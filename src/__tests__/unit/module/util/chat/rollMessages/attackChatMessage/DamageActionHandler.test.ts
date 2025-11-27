import { describe } from "mocha";
import sinon, { SinonSandbox, SinonStubbedInstance } from "sinon";
import {
    setUpCheckReportSelfReference,
    setUpMockActor,
    setUpMockAttackSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf,
} from "./attackRollMessageTestHelper";
import { AgentReference } from "module/data/references/AgentReference";
import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";
import { DamageActionHandler } from "module/util/chat/rollMessages/attackChatMessage/DamageActionHandler";
import { DamageInitializer } from "module/util/chat/damageChatMessage/initDamage";
import { SplittermondChatCard } from "module/util/chat/SplittermondChatCard";
import { createTestRoll, MockRoll, stubFoundryRoll, stubRollApi } from "__tests__/unit/RollMock";
import { DamageRoll } from "module/util/damage/DamageRoll";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import Attack from "module/actor/attack";
import { CostBase } from "module/util/costs/costTypes";

describe("DamageActionHandler", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "getSpeaker").returns({
            actor: "actor",
            alias: "alias",
            scene: "scene",
            token: "token",
        });
    });
    afterEach(() => {
        sandbox.restore();
    });

    describe("options", () => {
        it("should deliver damage addition options", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            sandbox.stub(underTest.attackReference.get(), "damage").get(() => "1");
            underTest.checkReportReference.get().succeeded = true;

            const options = underTest.renderDegreeOfSuccessOptions();

            expect(options).to.have.length(4);
            expect(options.map((o) => o.render.action)).to.contain("damageUpdate");
        });

        it("active options addToDamage", () => {
            const underTest = setUpDamageActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();

            expect(underTest.damageAddition).to.equal(2);
        });

        it("unchecking options should reset damage addition", () => {
            const underTest = setUpDamageActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();
            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();

            expect(underTest.damageAddition).to.equal(0);
        });

        it("unchecking options should come with negative costs", () => {
            const underTest = setUpDamageActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();
            const uncheckCost = underTest.useDegreeOfSuccessOption({
                action: "damageUpdate",
                multiplicity: "2",
            }).usedDegreesOfSuccess;

            expect(uncheckCost).to.be.lessThan(0);
        });

        it("should not render options if they are not an option", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = false;

            const options = underTest.renderDegreeOfSuccessOptions();
            expect(options).to.have.length(0);
        });

        [1, 2, 4, 8].forEach((multiplicity) => {
            it(`should render degree of success costs negatively if the consumed ${multiplicity} is checked`, () => {
                const underTest = setUpDamageActionHandler(sandbox);
                underTest.checkReportReference.get().succeeded = true;

                underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity }).action();
                const options = underTest.renderDegreeOfSuccessOptions();

                expect(options.find((o) => o.render.multiplicity === `${multiplicity}`)?.cost).to.be.lessThan(0);
            });
        });
    });

    describe("Increasing damage", () => {
        it("should not render action if its not an option", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = false;

            const actions = underTest.renderActions();

            expect(actions).to.have.length(0);
        });

        it("should disable all options after consuming ticks", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            sandbox.stub(underTest.attackReference.get(), "damage").get(() => "0d0 + 1");
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.checkReportReference.get().succeeded = true;

            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" });

            underTest.useAction({ action: "applyDamage" });

            const options = underTest.renderDegreeOfSuccessOptions();

            expect(options).to.have.length(4);
            expect(options.map((o) => o.render.disabled).reduce((a, b) => a && b, true)).to.be.true;
        });

        it("should invoke Dice module on damage application", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const diceModuleStub = sandbox
                .stub(DamageInitializer, "rollFromDamageRoll")
                .returns(Promise.resolve(chatCardMock));
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            sandbox.stub(underTest.attackReference.get(), "damage").get(() => "0d0 + 1");

            underTest.useAction({ action: "applyDamage" });

            expect(diceModuleStub.called).to.be.true;
        });

        it("should respect damage increases", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const diceModuleStub = sandbox
                .stub(DamageInitializer, "rollFromDamageRoll")
                .returns(Promise.resolve(chatCardMock));
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("0d0 + 1"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "bleeding",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [],
            });
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");

            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();
            underTest.useAction({ action: "applyDamage" });

            expect(diceModuleStub.lastCall.firstArg).to.deep.equal([
                underTest.attackReference.get().getForDamageRoll().principalComponent,
            ]);
            expect(diceModuleStub.lastCall.lastArg).to.equal(underTest.actorReference.getAgent());
        });

        it("should not allow using actions multiple times", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const diceModuleStub = sandbox
                .stub(DamageInitializer, "rollFromDamageRoll")
                .returns(Promise.resolve(chatCardMock));
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "damage").get(() => "0d0 + 1");
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();

            underTest.useAction({ action: "applyDamage" });
            underTest.useAction({ action: "applyDamage" });

            expect(diceModuleStub.calledOnce).to.be.true;
        });
    });

    describe("Actions", () => {
        it("should not render action if its not an option", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = false;

            const actions = underTest.renderActions();

            expect(actions).to.have.length(0);
        });

        it("should render modified actions", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6 + 1"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [
                    {
                        damageRoll: new DamageRoll(createTestRoll("", [], 2), ItemFeaturesModel.emptyFeatures()),
                        damageType: "rock",
                        damageSource: "Felsenharter Hammer",
                    },
                ],
            });
            const mockRoll = new MockRoll("1d6 + 1");
            mockRoll.terms.push(foundryApi.rollInfra.plusTerm(), foundryApi.rollInfra.numericTerm(2));
            stubFoundryRoll(mockRoll, sandbox);

            const actions = underTest.renderActions();

            expect(actions).to.have.length(1);
            expect(actions[0].value).to.equal("1W6 + 3");
        });

        it("should pass updated damage values to damage calculator", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const initMock = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6 + 1"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [
                    {
                        damageRoll: new DamageRoll(createTestRoll("", [], 2), ItemFeaturesModel.emptyFeatures()),
                        damageType: "rock",
                        damageSource: "Felsenharter Hammer",
                    },
                ],
            });
            const mockRoll = new MockRoll("1d6 + 1");
            mockRoll.terms.push(foundryApi.rollInfra.plusTerm(), foundryApi.rollInfra.numericTerm(2));
            stubFoundryRoll(mockRoll, sandbox);

            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();
            underTest.useAction({ action: "applyDamage" });

            expect(initMock.lastCall.args[0][0].damageRoll.getDamageFormula()).to.deep.equal("1W6 + 3");
            expect(initMock.lastCall.args[0][1]).to.deep.equal(
                underTest.attackReference.get().getForDamageRoll().otherComponents[0]
            );
            expect(initMock.lastCall.args[1]).to.deep.equal({ costBase: CostBase.create("V"), grazingHitPenalty: 0 });
        });
    });
});

function setUpDamageActionHandler(sandbox: SinonSandbox): WithMockedRefs<DamageActionHandler> {
    const actor = setUpMockActor(sandbox);
    const attackReference = setUpMockAttackSelfReference(sandbox, actor);
    setNecessaryDefaultsForAttackProperties(attackReference, sandbox);
    const checkReportReference = setUpCheckReportSelfReference();
    return withToObjectReturnsSelf(() => {
        return DamageActionHandler.initialize(AgentReference.initialize(actor), attackReference, checkReportReference);
    }) as unknown as WithMockedRefs<DamageActionHandler>; /*TS cannot know that we're injecting mocks*/
}

function setNecessaryDefaultsForAttackProperties(
    attackMock: SinonStubbedInstance<Attack>,
    sandbox: sinon.SinonSandbox
) {
    sandbox.stub(attackMock, "damage").get(() => "1W6");
    attackMock.getForDamageRoll.returns({
        principalComponent: {
            damageRoll: new DamageRoll(new MockRoll("1d6"), ItemFeaturesModel.emptyFeatures()),
            damageType: "physical",
            damageSource: attackMock.name,
        },
        otherComponents: [],
    });
}
