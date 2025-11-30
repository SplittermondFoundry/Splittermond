import { describe } from "mocha";
import sinon, { SinonSandbox } from "sinon";
import { setUpMockActor, WithMockedRefs } from "./attackRollMessageTestHelper";
import { TickCostActionHandler } from "module/util/chat/rollMessages/attackChatMessage/TickCostActionHandler";
import { AgentReference } from "module/data/references/AgentReference";
import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";
import { withToObjectReturnsSelf } from "../util";

describe("TickCostActionHandler", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
    });
    afterEach(() => {
        sandbox.restore();
    });

    describe("Consuming ticks", () => {
        it("should not render action if its not an option", () => {
            const underTest = setUpTickActionHandler(sandbox);
            underTest.updateSource({ isOption: false });

            const actions = underTest.renderActions();

            expect(actions).to.have.length(0);
        });

        it("should send tick usage to the actor", () => {
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useAction({ action: "advanceToken" });

            expect(underTest.actorReference.getAgent().addTicks.called).to.be.true;
            expect(underTest.actorReference.getAgent().addTicks.calledWith(3, "", false)).to.be.true;
        });

        it("should not allow using actions multiple times", () => {
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useAction({ action: "advanceToken" });
            underTest.useAction({ action: "advanceToken" });

            expect(underTest.actorReference.getAgent().addTicks.calledOnce).to.be.true;
        });
    });
});

function setUpTickActionHandler(sandbox: SinonSandbox): WithMockedRefs<TickCostActionHandler> {
    const actor = setUpMockActor(sandbox);
    return withToObjectReturnsSelf(() => {
        return TickCostActionHandler.initialize(AgentReference.initialize(actor), 3);
    }) as unknown as WithMockedRefs<TickCostActionHandler>; /*TS cannot know tha we're injecting mocks*/
}
