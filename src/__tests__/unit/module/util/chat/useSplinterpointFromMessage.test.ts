import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon, { type SinonSandbox } from "sinon";
import { useSplinterpointFromMessage } from "module/util/chat";
import { foundryApi } from "module/api/foundryApi";

describe("useSplinterpointFromMessage", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => sandbox.restore());

    it("uses the resolved speaker actor when the message has no token speaker", async () => {
        const actor = { useSplinterpointBonus: sandbox.stub().resolves() };
        const message = {
            speaker: { scene: "scene-id", actor: "actor-id", token: null, alias: "Actor" },
        };
        const getToken = sandbox.stub(foundryApi, "getToken");
        sandbox
            .stub(foundryApi, "getActor")
            .withArgs("actor-id")
            .returns(actor as never);

        await useSplinterpointFromMessage(message as any);

        expect(getToken.notCalled).to.be.true;
        expect(actor.useSplinterpointBonus.calledOnceWithExactly(message)).to.be.true;
    });

    it("prefers the token actor when the message has a token speaker", async () => {
        const actor = { useSplinterpointBonus: sandbox.stub().resolves() };
        const message = {
            speaker: { scene: "scene-id", actor: "actor-id", token: "token-id", alias: "Actor" },
        };
        sandbox
            .stub(foundryApi, "getToken")
            .withArgs("scene-id", "token-id")
            .returns({ actor } as never);
        const getActor = sandbox.stub(foundryApi, "getActor");

        await useSplinterpointFromMessage(message as any);

        expect(getActor.notCalled).to.be.true;
        expect(actor.useSplinterpointBonus.calledOnceWithExactly(message)).to.be.true;
    });

    it("does nothing when the message speaker has no actor", () => {
        const message = {
            speaker: { scene: "scene-id", actor: null, token: null, alias: "Unknown" },
        };

        expect(() => useSplinterpointFromMessage(message as any)).not.to.throw();
    });
});
