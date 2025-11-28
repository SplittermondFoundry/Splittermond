import "../../../../../foundryMocks";
import { afterEach, beforeEach, describe } from "mocha";
import { AttackRollMessage } from "module/util/chat/rollMessages/attackChatMessage/AttackRollMessage";
import sinon, { SinonSandbox, SinonStubbedInstance } from "sinon";
import { setUpMockActor, setUpMockAttackSelfReference, WithMockedRefs } from "./attackRollMessageTestHelper";
import { expect } from "chai";
import SplittermondActor from "module/actor/actor";
import { foundryApi } from "module/api/foundryApi";
import { CheckReport } from "module/check";
import { referencesUtils } from "module/data/references/referencesUtils";
import { AgentReference } from "module/data/references/AgentReference";
import { injectParent } from "../../../../../testUtils";
import { DamageRoll } from "module/util/damage/DamageRoll";
import { createTestRoll } from "../../../../../RollMock";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { DamageInitializer } from "module/util/chat/damageChatMessage/initDamage";
import { SplittermondChatCard } from "module/util/chat/SplittermondChatCard";
import Attack from "module/actor/attack";
import { withToObjectReturnsSelf } from "../util";

describe("AttackRollMessage", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
    });
    afterEach(() => {
        sandbox.restore();
    });

    it("should load", () => {
        const attackRollMessage = createAttackRollMessage(sandbox);
        expect(attackRollMessage?.getData()).to.not.be.undefined;
    });

    it("should filter degree of success options that are too expensive on render", () => {
        const attackRollMessage = createAttackRollMessage(sandbox);
        attackRollMessage.updateSource({ openDegreesOfSuccess: 0 });
        expect(attackRollMessage.getData().degreeOfSuccessOptions).to.be.empty;
    });

    it("should allow options that are checked, even if no degrees of success are left", () => {
        const attackRollMessage = createAttackRollMessage(sandbox);
        attackRollMessage.updateSource({ openDegreesOfSuccess: 1000 });

        attackRollMessage.handleGenericAction({ action: "damageUpdate", multiplicity: "1" });
        attackRollMessage.updateSource({ openDegreesOfSuccess: 0 });

        expect(attackRollMessage.getData().degreeOfSuccessOptions).to.have.length.greaterThan(0);
        const checkedOption = attackRollMessage.getData().degreeOfSuccessOptions.find((o) => o.checked);
        expect(checkedOption).to.not.be.undefined;
        expect(checkedOption?.action).to.equal("damageUpdate");
    });

    it("should allow to unchecked options that are checked, even if no degrees of success are left", () => {
        const attackRollMessage = createAttackRollMessage(sandbox);
        attackRollMessage.updateSource({ openDegreesOfSuccess: 1000 });

        attackRollMessage.handleGenericAction({ action: "damageUpdate", multiplicity: "1" });
        attackRollMessage.updateSource({ openDegreesOfSuccess: 0 });
        attackRollMessage.handleGenericAction({ action: "damageUpdate", multiplicity: "1" });
        attackRollMessage.updateSource({ openDegreesOfSuccess: 1000 });

        expect(attackRollMessage.getData().degreeOfSuccessOptions.filter((dos) => dos.checked)).to.be.empty;
    });

    ["damageUpdate", "rangeUpdate"].forEach((option) => {
        it(`should handle option ${option}`, () => {
            const underTest = createAttackRollMessage(sandbox);

            underTest.updateSource({ openDegreesOfSuccess: 100 });

            underTest.handleGenericAction({ action: option, multiplicity: "1" });
            const afterFirstUpdate = underTest
                .getData()
                .degreeOfSuccessOptions.filter((o) => o.action === option)
                .find((o) => o.multiplicity === "1");
            underTest.handleGenericAction({ action: option, multiplicity: "1" });
            const afterSecondUpdate = underTest
                .getData()
                .degreeOfSuccessOptions.filter((o) => o.action === option)
                .find((o) => o.multiplicity === "1");

            expect(afterFirstUpdate?.checked).to.be.true;
            expect(afterSecondUpdate?.checked).to.be.false;
        });
    });

    it(`should handle action rollFumble`, async () => {
        const underTest = createAttackRollMessage(sandbox);
        underTest.checkReport.succeeded = true;
        const warnUserStub = sandbox.stub(foundryApi, "warnUser");

        await underTest.handleGenericAction({ action: "rollFumble" });

        expect(warnUserStub.called).to.be.false;
    });
    it(`should handle action advanceToken`, async () => {
        const underTest = createAttackRollMessage(sandbox);
        underTest.checkReport.succeeded = true;
        const warnUserStub = sandbox.stub(foundryApi, "warnUser");

        await underTest.handleGenericAction({ action: "advanceToken" });

        expect(warnUserStub.called).to.be.true;
    });

    it("should handle action applyDamage", async () => {
        const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
        const damageStub = sandbox.stub(DamageInitializer, "rollFromDamageRoll").resolves(chatCardMock);
        const underTest = createAttackRollMessage(sandbox);
        underTest.checkReport.succeeded = true;
        sandbox.stub(underTest.attack, "costType").get(() => "V");

        await underTest.handleGenericAction({ action: "applyDamage" });

        expect(damageStub.called).to.be.true;
    });

    it("should handle action activeDefense", async () => {
        const underTest = createAttackRollMessage(sandbox);
        underTest.checkReport.succeeded = true;
        const actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor, "getAgent", { value: () => actor }); //make actor a reference onto itself
        sandbox.stub(referencesUtils, "findBestUserActor").returns(actor as unknown as AgentReference);
        const warnUserStub = sandbox.stub(foundryApi, "warnUser");

        await underTest.handleGenericAction({ action: "activeDefense" });

        expect(warnUserStub.called).to.be.false;
    });
    describe("Splinterpoint usage", () => {
        it("should increase degrees of success by three", async () => {
            const underTest = createAttackRollMessage(sandbox);
            underTest.actorReference.getAgent().spendSplinterpoint.returns({
                pointSpent: true,
                getBonus() {
                    return 3;
                },
            });
            underTest.updateSource({ checkReport: fullCheckReport() });

            await underTest.handleGenericAction({ action: "useSplinterpoint" });

            expect(underTest.checkReport.degreeOfSuccess).to.deep.equal({ fromRoll: 3, modification: 0 });
        });

        it("should only be usable once", async () => {
            const underTest = createAttackRollMessage(sandbox);
            underTest.actorReference.getAgent().spendSplinterpoint.returns({
                pointSpent: true,
                getBonus() {
                    return 3;
                },
            });
            underTest.updateSource({ checkReport: fullCheckReport() });

            await underTest.handleGenericAction({ action: "useSplinterpoint" });
            await underTest.handleGenericAction({ action: "useSplinterpoint" });

            expect(underTest.checkReport.degreeOfSuccess).to.deep.equal({ fromRoll: 3, modification: 0 });
        });

        it("should convert a failure into a success", async () => {
            const underTest = createAttackRollMessage(sandbox);
            underTest.actorReference.getAgent().spendSplinterpoint.returns({
                pointSpent: true,
                getBonus() {
                    return 3;
                },
            });
            underTest.updateSource({ checkReport: fullCheckReport() });
            underTest.checkReport.roll.total = underTest.checkReport.difficulty - 1;
            underTest.checkReport.degreeOfSuccess = { fromRoll: 0, modification: 0 };
            underTest.checkReport.succeeded = false;

            await underTest.handleGenericAction({ action: "useSplinterpoint" });

            expect(underTest.checkReport.degreeOfSuccess).to.deep.equal({ fromRoll: 0, modification: 0 });
            expect(underTest.checkReport.succeeded).to.be.true;
        });
        it("should be rendered if not a fumble", () => {
            const underTest = createAttackRollMessage(sandbox);
            underTest.checkReport.isFumble = false;

            expect(underTest.getData().actions.useSplinterpoint).not.to.be.undefined;
        });
        it("should not be applicable for fumbles", () => {
            const underTest = createAttackRollMessage(sandbox);
            underTest.checkReport.isFumble = true;

            expect(underTest.getData().actions.useSplinterpoint).to.be.undefined;
        });

        function fullCheckReport(): CheckReport {
            return {
                succeeded: false,
                degreeOfSuccess: { fromRoll: 2, modification: 0 },
                degreeOfSuccessMessage: "",
                difficulty: 9,
                defenseType: null,
                hideDifficulty: false,
                isCrit: false,
                isFumble: false,
                modifierElements: [],
                roll: { dice: [{ total: 5 }], tooltip: "", total: 15 },
                rollType: "standard",
                skill: { attributes: { strength: 1, agility: 2 }, id: "slashing", points: 7 },
                maneuvers: [],
            };
        }
    });
});

function createAttackRollMessage(sandbox: SinonSandbox) {
    const mockActor = setUpMockActor(sandbox);
    const mockAttack = setUpMockAttackSelfReference(sandbox, mockActor);
    setNecessaryDefaultsForAttackProperties(mockAttack, sandbox);
    const attackRollMessage = withToObjectReturnsSelf(() => {
        return AttackRollMessage.initialize(mockAttack, {
            degreeOfSuccess: {
                fromRoll: 0,
                modification: 0,
            },
            degreeOfSuccessMessage: "A very important message",
            difficulty: 0,
            defenseType: null,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            modifierElements: [],
            roll: { dice: [], tooltip: "", total: 0 },
            rollType: "standard",
            skill: { attributes: {}, id: "longrange", points: 0 },
            succeeded: true,
            maneuvers: [],
            grazingHitPenalty: 0,
        });
    });
    injectParent(attackRollMessage);
    return attackRollMessage as unknown as WithMockedRefs<AttackRollMessage>; //TS cannot know that we injected mocks
}

function setNecessaryDefaultsForAttackProperties(
    attackMock: SinonStubbedInstance<Attack>,
    sandbox: sinon.SinonSandbox
) {
    sandbox.stub(attackMock, "damage").get(() => "1W6 + 1");
    sandbox.stub(attackMock, "damageType").get(() => "physical");
    attackMock.getForDamageRoll.returns({
        principalComponent: {
            damageRoll: new DamageRoll(createTestRoll("1d6", [6], 7), ItemFeaturesModel.emptyFeatures()),
            damageType: "physical",
            damageSource: attackMock.name,
        },
        otherComponents: [],
    });
}
