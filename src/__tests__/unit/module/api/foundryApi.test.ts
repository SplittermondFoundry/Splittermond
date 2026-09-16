import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon, { type SinonSandbox } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { ChatMessage } from "module/api/ChatMessage";

describe("foundryApi.getSpeakerActor", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => sandbox.restore());

    it("delegates speaker resolution to Foundry", () => {
        const speaker = { scene: "scene-id", actor: "actor-id", token: null, alias: "Actor" };
        const actor = {};
        const getSpeakerActor = sandbox.stub(ChatMessage, "getSpeakerActor").returns(actor as never);

        expect(foundryApi.getSpeakerActor(speaker)).to.equal(actor);
        expect(getSpeakerActor.calledOnceWithExactly(speaker)).to.be.true;
    });

    it("returns null when Foundry cannot resolve the speaker", () => {
        const speaker = { scene: "scene-id", actor: null, token: null, alias: "Unknown" };
        sandbox.stub(ChatMessage, "getSpeakerActor").returns(null);

        expect(foundryApi.getSpeakerActor(speaker)).to.be.null;
    });
});
