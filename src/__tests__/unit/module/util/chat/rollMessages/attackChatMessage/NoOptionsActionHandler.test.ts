import sinon, { SinonSandbox } from "sinon";
import {
    setUpCheckReportSelfReference,
    setUpMockActor,
    setUpMockAttackSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf,
} from "./attackRollMessageTestHelper";
import { NoOptionsActionHandler } from "module/util/chat/rollMessages/attackChatMessage/NoOptionsActionHandler";
import SplittermondActor from "module/actor/actor";
import { AgentReference } from "module/data/references/AgentReference";
import { expect } from "chai";
import { referencesUtils } from "module/data/references/referencesUtils";
import { injectParent } from "../../../../../testUtils";

describe("Roll Fumble", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => sandbox.restore());
    it("should not render the action if the roll is not a fumble", () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble = false;

        const actions = underTest.renderActions();

        expect(actions.find((a) => a.type === "rollFumble")).to.be.undefined;
    });

    it("should render the action if the roll is a fumble", () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble = true;

        const actions = underTest.renderActions();

        expect(actions.find((a) => a.type === "rollFumble")).not.to.be.undefined;
    });
    it("should not allow using the action if the roll is not a fumble", async () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble = false;

        await underTest.useAction({ action: "rollFumble" });

        expect(underTest.casterReference.getAgent().rollAttackFumble.called).to.be.false;
    });
    it("should call the action if the roll was a fumble", async () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble = true;

        await underTest.useAction({ action: "rollFumble" });

        expect(underTest.casterReference.getAgent().rollAttackFumble.called).to.be.true;
    });
    it("should allow using the action if it has already been used, as it is local", async () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble = true;

        await underTest.useAction({ action: "rollFumble" });
        await underTest.useAction({ action: "rollFumble" });

        expect(underTest.casterReference.getAgent().rollAttackFumble.calledTwice).to.be.true;
    });
});

describe("Active Defense", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        const actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor, "getAgent", { value: () => actor }); //make actor a reference onto itself
        sandbox.stub(referencesUtils, "findBestUserActor").returns(actor as unknown as AgentReference);
    });
    afterEach(() => sandbox.restore());
    it("should not update the state", () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        const updateSourceSpy = sinon.spy(underTest, "updateSource");

        underTest.useAction({ action: "activeDefense" });

        expect(updateSourceSpy.called).to.be.false;
    });

    it("should not be offered if check did not succeed", () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().succeeded = false;

        const actions = underTest.renderActions();

        expect(actions.find((a) => a.type === "activeDefense")).to.be.undefined;
    });

    it("should be offered if check succeeded", () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().succeeded = true;

        const actions = underTest.renderActions();

        expect(actions.find((a) => a.type === "activeDefense")).not.to.be.undefined;
    });
});

function setUpNoOptionsActionHandler(sandbox: SinonSandbox): WithMockedRefs<NoOptionsActionHandler> {
    const mockReportReference = setUpCheckReportSelfReference();
    const mockActor = setUpMockActor(sandbox);
    const mockAttackReference = setUpMockAttackSelfReference(sandbox, mockActor);

    return withToObjectReturnsSelf(() => {
        const handler = NoOptionsActionHandler.initialize(
            mockReportReference,
            mockAttackReference,
            AgentReference.initialize(mockActor)
        );
        injectParent(handler);
        return handler as unknown as WithMockedRefs<NoOptionsActionHandler>; //TS cannot know we placed mocks inside this object.
    });
}
