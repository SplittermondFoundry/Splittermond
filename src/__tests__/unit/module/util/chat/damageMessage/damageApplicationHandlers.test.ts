import {damageHandlers} from "../../../../../../module/util/chat/damageChatMessage/damageApplicationHandlers";
import {createDamageEvent, createDamageImplement} from "../../damage/damageEventTestHelper";
import {beforeEach, describe, it} from "mocha";
import sinon, {SinonSandbox, SinonStubbedInstance} from "sinon";
import {foundryApi} from "../../../../../../module/api/foundryApi";
import {expect} from "chai";
import {
    UserModificationDialogue
} from "../../../../../../module/util/chat/damageChatMessage/userDialogue/UserModificationDialogue";
import SplittermondActor from "../../../../../../module/actor/actor";
import {PrimaryCost} from "../../../../../../module/util/costs/PrimaryCost";
import {Cost} from "../../../../../../module/util/costs/Cost";
import {referencesUtils} from "../../../../../../module/data/references/referencesUtils";
import {AgentReference} from "../../../../../../module/data/references/AgentReference";

describe("damageApplicationHandlers", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, 'format').returnsArg(0);
    });
    afterEach(() => sandbox.restore());

    describe("applyDamageToTargets", () => {
        it("should warn user if no target is selected", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(foundryApi, "currentUser").get(() => createMockUser(sandbox, 0));
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());

            await damageHandlers.applyDamageToTargets(createDamageEvent(sandbox, createDamageImplement(10, 1)))

            expect(warnUser.calledOnce).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.called).to.be.false;

        })
        it("should apply damage to all targets", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(foundryApi, "currentUser").get(() => createMockUser(sandbox, 3));
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());
            const report = createDamageEvent(sandbox, createDamageImplement(10, 1));

            await damageHandlers.applyDamageToTargets(report);

            expect(warnUser.calledOnce).to.be.false;
            expect(dialogMock.getUserAdjustedDamage.calledThrice).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.args.map(arg => arg[0].totalDamage.length))
                .to.deep.equal([report.totalDamage(), report.totalDamage(), report.totalDamage()]);
            expect(dialogMock.getUserAdjustedDamage.args
                .map(arg => (arg[0].target as SinonStubbedInstance<SplittermondActor>).consumeCost.called)).to.deep.equal([true, true, true]);
        });

        it("should do nothing if user aborts", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(foundryApi, "currentUser").get(() => createMockUser(sandbox, 2));
            const dialogMock = mockDialog(sandbox, "Aborted");
            const report = createDamageEvent(sandbox, createDamageImplement(10, 1));

            await damageHandlers.applyDamageToTargets(report);

            expect(warnUser.calledOnce).to.be.false;
            expect(dialogMock.getUserAdjustedDamage.calledTwice).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.args
                .map(arg => (arg[0].target as SinonStubbedInstance<SplittermondActor>).consumeCost.called)).to.deep.equal([false, false]);
        });
    });

    describe("applyDamageToUserTargets", () => {
        it("should warn user if actor", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());
            const report = createDamageEvent(sandbox, createDamageImplement(10, 1));
            sandbox.stub(report, "causer").get(() => null);

            await damageHandlers.applyDamageToUserTargets(report)

            expect(warnUser.calledOnce).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.called).to.be.false;

        });
        it("should warn user if user is found", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(foundryApi, "users").get(() => []);
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());

            await damageHandlers.applyDamageToUserTargets(createDamageEvent(sandbox, createDamageImplement(10, 1)))

            expect(warnUser.calledOnce).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.called).to.be.false;

        });
        it("should warn user if no target is selected", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(foundryApi, "users").get(() => [createMockUser(sandbox, 0)]);
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());

            await damageHandlers.applyDamageToUserTargets(createDamageEvent(sandbox, createDamageImplement(10, 1)))

            expect(warnUser.calledOnce).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.called).to.be.false;

        });

        it("should apply damage to all targets", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(foundryApi, "users").get(() => [createMockUser(sandbox, 3)]);
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());
            const report = createDamageEvent(sandbox, createDamageImplement(10, 1));

            await damageHandlers.applyDamageToUserTargets(report);

            expect(warnUser.calledOnce).to.be.false;
            expect(dialogMock.getUserAdjustedDamage.calledThrice).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.args.map(arg => arg[0].totalDamage.length))
                .to.deep.equal([report.totalDamage(), report.totalDamage(), report.totalDamage()]);
            expect(dialogMock.getUserAdjustedDamage.args
                .map(arg => (arg[0].target as SinonStubbedInstance<SplittermondActor>).consumeCost.called)).to.deep.equal([true, true, true]);
        });

        it("should do nothing if user aborts", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(foundryApi, "users").get(() => [createMockUser(sandbox, 2)]);
            const dialogMock = mockDialog(sandbox, "Aborted");
            const report = createDamageEvent(sandbox, createDamageImplement(10, 1));

            await damageHandlers.applyDamageToUserTargets(report);

            expect(warnUser.calledOnce).to.be.false;
            expect(dialogMock.getUserAdjustedDamage.calledTwice).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.args
                .map(arg => (arg[0].target as SinonStubbedInstance<SplittermondActor>).consumeCost.called)).to.deep.equal([false, false]);
        });
    });

    describe("applyDamageToSelf", () => {
        it("should warn user if no actor on user", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(referencesUtils).findBestUserActor.throws(new Error("buya"));
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());

            await damageHandlers.applyDamageToSelf(createDamageEvent(sandbox, createDamageImplement(10, 1)))

            expect(warnUser.calledOnce).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.called).to.be.false;

        })
        it("should apply damage to self", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(referencesUtils).findBestUserActor.returns(createAgentReference(sandbox, 5));
            const dialogMock = mockDialog(sandbox, new Cost(0, 1, false, true).asPrimaryCost());
            const report = createDamageEvent(sandbox, createDamageImplement(10, 1));

            await damageHandlers.applyDamageToSelf(report);

            expect(warnUser.calledOnce).to.be.false;
            expect(dialogMock.getUserAdjustedDamage.calledOnce).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.firstCall.args[0].totalDamage.length).to.deep.equal(report.totalDamage());
            expect((dialogMock.getUserAdjustedDamage.firstCall.args[0].target as SinonStubbedInstance<SplittermondActor>)
                .consumeCost.called).to.be.true;
        });

        it("should do nothing if user aborts", async () => {
            const warnUser = sandbox.stub(foundryApi, "warnUser");
            sandbox.stub(referencesUtils).findBestUserActor.returns(createAgentReference(sandbox, 5));
            const dialogMock = mockDialog(sandbox, "Aborted");
            const report = createDamageEvent(sandbox, createDamageImplement(10, 1));

            await damageHandlers.applyDamageToSelf(report);

            expect(warnUser.calledOnce).to.be.false;
            expect(dialogMock.getUserAdjustedDamage.calledOnce).to.be.true;
            expect(dialogMock.getUserAdjustedDamage.firstCall.args[0].totalDamage.length).to.deep.equal(report.totalDamage());
            expect((dialogMock.getUserAdjustedDamage.firstCall.args[0].target as SinonStubbedInstance<SplittermondActor>)
                .consumeCost.called).to.be.false;
        });
    });
});

function mockDialog(sandbox: sinon.SinonSandbox, adjustmentResult: PrimaryCost | "Aborted") {
    const dialogMock = sandbox.createStubInstance(UserModificationDialogue);
    sandbox.stub(UserModificationDialogue, "create").returns(dialogMock);
    dialogMock.getUserAdjustedDamage.resolves(adjustmentResult);
    return dialogMock;
}

function createMockUser(sandbox: SinonSandbox, targetSize: number) {
    return {
        targets: {
            user: null,
            size: targetSize,
            [Symbol.iterator]() {
                return createMockTarget(sandbox, targetSize)
            }
        }
    }
}

function* createMockTarget(sandbox: SinonSandbox, targetSize: number): Generator<Token> {
    for (let i = 0; i < targetSize; i++) {
        yield {
            document: {
                parent: {id: "sceneId"} as any,
                actor: createTargetActor(sandbox, i),
                id: `${i}`,
                documentName: "Token",
                updateSource: function (): void {
                },
                prepareBaseData: function (): void {
                },
                prepareDerivedData: function (): void {
                },
                toObject: function () {
                },
                getFlag: function () {
                }
            }
        };
    }
}

function createAgentReference(sandbox: SinonSandbox, id: number) {
    const ref = sandbox.createStubInstance(AgentReference);
    ref.getAgent.returns(createTargetActor(sandbox, id));
    return ref;
}

function createTargetActor(sandbox: SinonSandbox, id: number) {
    const actor = sandbox.createStubInstance(SplittermondActor);
    actor.name = `Victim${id}`;
    sandbox.stub(actor, "susceptibilities").get(() => ({"physical": 0}));
    sandbox.stub(actor, "damageReduction").get(() => 0);
    return actor;
}
