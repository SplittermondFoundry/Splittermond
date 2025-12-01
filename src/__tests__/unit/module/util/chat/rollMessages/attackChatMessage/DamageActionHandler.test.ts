import { describe } from "mocha";
import sinon, { SinonSandbox, SinonStubbedInstance } from "sinon";
import {
    setUpCheckReportSelfReference,
    setUpMockActor,
    setUpMockAttackSelfReference,
    WithMockedRefs,
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
import { withToObjectReturnsSelf } from "../util";

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

            expect(options.filter((o) => o.render.action == "damageUpdate")).to.have.length(4);
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

            expect(options.filter((o) => o.render.action == "damageUpdate")).to.have.length(4);
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

    describe("Grazing Hit", () => {
        it("should render grazing hit option when grazing hit penalty > 0", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;

            const options = underTest.renderDegreeOfSuccessOptions();

            const grazingHitOption = options.find((o) => o.render.action === "grazingHitUpdate");
            expect(grazingHitOption).to.not.be.undefined;
            expect(grazingHitOption?.render.text).to.equal("splittermond.chatCard.attackMessage.selectConsumeCost");
            expect(grazingHitOption?.cost).to.equal(0);
        });

        it("should not render grazing hit option when grazing hit penalty is 0", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 0;

            const options = underTest.renderDegreeOfSuccessOptions();

            const grazingHitOption = options.find((o) => o.render.action === "grazingHitUpdate");
            expect(grazingHitOption).to.be.undefined;
        });

        it("should render consumeCost action when grazing hit is consumed", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;

            underTest.useDegreeOfSuccessOption({ action: "grazingHitUpdate", multiplicity: "1" }).action();

            const actions = underTest.renderActions();
            const consumeCostAction = actions.find((a) => a.type === "consumeCost");
            expect(consumeCostAction).to.not.be.undefined;
            expect(consumeCostAction?.value).to.equal("4");
            expect(consumeCostAction?.disabled).to.be.false;
        });

        it("should not render consumeCost action when grazing hit is not consumed", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;

            const actions = underTest.renderActions();
            const consumeCostAction = actions.find((a) => a.type === "consumeCost");
            expect(consumeCostAction).to.be.undefined;
        });

        it("should toggle grazing hit consumption when grazingHitUpdate is called", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;

            underTest.useDegreeOfSuccessOption({ action: "grazingHitUpdate", multiplicity: "1" }).action();
            expect(underTest.consumedGrazingHitCost).to.be.true;

            underTest.useDegreeOfSuccessOption({ action: "grazingHitUpdate", multiplicity: "1" }).action();
            expect(underTest.consumedGrazingHitCost).to.be.false;
        });

        it("should disable grazing hit option when damage is used", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            sandbox.stub(DamageInitializer, "rollFromDamageRoll").returns(Promise.resolve(chatCardMock));
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            sandbox.stub(underTest.attackReference.get(), "damage").get(() => "0d0 + 10");

            underTest.useAction({ action: "applyDamage" });

            const options = underTest.renderDegreeOfSuccessOptions();
            const grazingHitOption = options.find((o) => o.render.action === "grazingHitUpdate");
            expect(grazingHitOption?.render.disabled).to.be.true;
        });

        it("should reduce damage by grazing hit penalty when not consumed", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const initMock = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6 + 10"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [],
            });

            underTest.useAction({ action: "applyDamage" });

            // Verify the damage was reduced by 4
            const damageRoll = initMock.lastCall.firstArg[0].damageRoll;
            const rollOptions = initMock.lastCall.args[1];
            expect(damageRoll.getDamageFormula()).to.equal("1W6 + 10");
            expect(rollOptions.grazingHitPenalty).to.equal(4);
        });

        it("should not reduce damage by grazing hit penalty when consumed", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const initMock = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6 + 10"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [],
            });

            underTest.useDegreeOfSuccessOption({ action: "grazingHitUpdate", multiplicity: "1" }).action();
            underTest.useAction({ action: "applyDamage" });

            // Verify the damage was not reduced
            const damageRoll = initMock.lastCall.args[0][0].damageRoll;
            expect(damageRoll.getDamageFormula()).to.equal("1W6 + 10");
        });

        it("should consume cost from actor health when consumeCost action is used", async () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const actor = underTest.actorReference.getAgent();
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;

            underTest.useDegreeOfSuccessOption({ action: "grazingHitUpdate", multiplicity: "1" }).action();
            await underTest.useAction({ action: "consumeCost" });

            expect(actor.consumeCost.calledOnceWith("health", "4", "")).to.be.true;
        });

        it("should mark consumeCost as used after execution", async () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;

            underTest.useDegreeOfSuccessOption({ action: "grazingHitUpdate", multiplicity: "1" }).action();
            await underTest.useAction({ action: "consumeCost" });

            const actions = underTest.renderActions();
            const consumeCostAction = actions.find((a) => a.type === "consumeCost");
            expect(consumeCostAction?.disabled).to.be.true;
        });

        it("should not allow consumeCost to be used multiple times", async () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const actor = underTest.actorReference.getAgent();
            underTest.checkReportReference.get().succeeded = true;
            underTest.checkReportReference.get().grazingHitPenalty = 4;

            underTest.useDegreeOfSuccessOption({ action: "grazingHitUpdate", multiplicity: "1" }).action();
            await underTest.useAction({ action: "consumeCost" });
            await underTest.useAction({ action: "consumeCost" });

            expect(actor.consumeCost.calledOnce).to.be.true;
        });
    });

    describe("Numbing Damage", () => {
        it("should render numbingDamage option when attack succeeds", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;

            const options = underTest.renderDegreeOfSuccessOptions();

            const numbingDamageOption = options.find((o) => o.render.action === "numbingDamageUpdate");
            expect(numbingDamageOption).to.not.be.undefined;
            expect(numbingDamageOption?.render.text).to.equal("splittermond.chatCard.attackMessage.numbingDamage");
            expect(numbingDamageOption?.cost).to.equal(1);
        });

        it("should not render numbingDamage option when attack fails", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = false;

            const options = underTest.renderDegreeOfSuccessOptions();

            const numbingDamageOption = options.find((o) => o.render.action === "numbingDamageUpdate");
            expect(numbingDamageOption).to.be.undefined;
        });

        it("should toggle convertedToNumbingDamage when numbingDamageUpdate is called", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;

            underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" }).action();
            expect(underTest.convertedToNumbingDamage).to.be.true;

            underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" }).action();
            expect(underTest.convertedToNumbingDamage).to.be.false;
        });

        it("should cost 1 degrees of success when toggling numbingDamage", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;

            const result = underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" });

            expect(result.usedDegreesOfSuccess).to.equal(1);
        });

        it("should cost -1 degrees of success to remove toggled numbingDamage", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.updateSource({ convertedToNumbingDamage: true });

            const result = underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" });

            expect(result.usedDegreesOfSuccess).to.equal(-1);
        });

        it("should display -1 degrees of success to remove toggled numbingDamage", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;
            underTest.updateSource({ convertedToNumbingDamage: true });

            const result = underTest.renderDegreeOfSuccessOptions();

            expect(result.find((o) => o.render.action === "numbingDamageUpdate")!.cost).to.equal(-1);
        });

        it("should render numbingDamage option as checked when enabled", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = true;

            underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" }).action();
            const options = underTest.renderDegreeOfSuccessOptions();

            const numbingDamageOption = options.find((o) => o.render.action === "numbingDamageUpdate");
            expect(numbingDamageOption?.render.checked).to.be.true;
        });

        it("should disable numbingDamage option when damage is used", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            sandbox.stub(DamageInitializer, "rollFromDamageRoll").returns(Promise.resolve(chatCardMock));
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            sandbox.stub(underTest.attackReference.get(), "damage").get(() => "1d6");

            underTest.useAction({ action: "applyDamage" });

            const options = underTest.renderDegreeOfSuccessOptions();
            const numbingDamageOption = options.find((o) => o.render.action === "numbingDamageUpdate");
            expect(numbingDamageOption?.render.disabled).to.be.true;
        });

        it("should change cost type to 'E' when numbingDamage is enabled", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const initMock = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6 + 5"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [],
            });

            underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" }).action();
            underTest.useAction({ action: "applyDamage" });

            const rollOptions = initMock.lastCall.args[1];
            expect(rollOptions.costBase.costType).to.equal("E");
        });

        it("should use attack cost type when numbingDamage is not enabled", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const initMock = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6 + 5"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [],
            });

            underTest.useAction({ action: "applyDamage" });

            const rollOptions = initMock.lastCall.args[1];
            expect(rollOptions.costBase.costType).to.equal("V");
        });

        it("should use 'E' cost type when numbingDamage is toggled and attack has null cost type", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const initMock = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => null);
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [],
            });

            underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" }).action();
            underTest.useAction({ action: "applyDamage" });

            const rollOptions = initMock.lastCall.args[1];
            expect(rollOptions.costBase.costType).to.equal("E");
        });

        it("should work together with damage increases", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const initMock = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.attackReference.get(), "costType").get(() => "V");
            underTest.attackReference.get().getForDamageRoll.returns({
                principalComponent: {
                    damageRoll: new DamageRoll(new MockRoll("1d6 + 5"), ItemFeaturesModel.emptyFeatures()),
                    damageType: "physical",
                    damageSource: underTest.attackReference.get().name,
                },
                otherComponents: [],
            });
            const mockRoll = new MockRoll("1d6 + 5");
            mockRoll.terms.push(foundryApi.rollInfra.plusTerm(), foundryApi.rollInfra.numericTerm(2));
            stubFoundryRoll(mockRoll, sandbox);

            underTest.useDegreeOfSuccessOption({ action: "damageUpdate", multiplicity: "2" }).action();
            underTest.useDegreeOfSuccessOption({ action: "numbingDamageUpdate", multiplicity: "1" }).action();
            underTest.useAction({ action: "applyDamage" });

            const damageRoll = initMock.lastCall.args[0][0].damageRoll;
            const rollOptions = initMock.lastCall.args[1];
            expect(damageRoll.getDamageFormula()).to.equal("1W6 + 7");
            expect(rollOptions.costBase.costType).to.equal("E");
        });
    });
});

function setUpDamageActionHandler(sandbox: SinonSandbox): WithMockedRefs<DamageActionHandler> {
    const actor = setUpMockActor(sandbox);
    const attackReference = setUpMockAttackSelfReference(sandbox, actor);
    setNecessaryDefaultsForAttackProperties(attackReference, sandbox);
    const checkReportReference = setUpCheckReportSelfReference();
    checkReportReference.skill = { id: "melee", attributes: { strength: 3, agility: 3 }, points: 3 };
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
