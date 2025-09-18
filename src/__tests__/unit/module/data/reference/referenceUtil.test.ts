import "../../../foundryMocks.js";
import { afterEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { referencesUtils } from "module/data/references/referencesUtils";
import { foundryApi } from "module/api/foundryApi";
import SplittermondActor from "module/actor/actor";

describe("getBestActor", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());
    it("should return an actor for token", () => {
        const sampleToken = { scene: "scene", token: "token", actor: "actor", alias: "alias" };
        const actor = sinon.createStubInstance(SplittermondActor);
        const agentMock = {
            documentName: "Token",
            parent: { id: "2", documentName: "Scene" },
            id: "1",
            items: new Map(),
            actor: actor,
        } as unknown as TokenDocument; /* mock good enough for this test */
        sandbox.stub(foundryApi, "getToken").returns(agentMock);
        sandbox.stub(foundryApi, "getSpeaker").returns(sampleToken);

        const result = referencesUtils.findBestUserActor();

        expect(result.id).to.equal(agentMock.id);
    });

    it("should query the actor if no token is found", () => {
        const sampleToken = { scene: "scene", token: "token", actor: "actor", alias: "alias" };
        const agentMock = {
            documentName: "Actor",
            parent: undefined,
            id: "1",
            items: new Map(),
        } as unknown as SplittermondActor; /*mock good enough for this test */
        sandbox.stub(foundryApi, "getToken").returns(undefined);
        sandbox.stub(foundryApi, "getActor").returns(agentMock);
        sandbox.stub(foundryApi, "getSpeaker").returns(sampleToken);

        const result = referencesUtils.findBestUserActor();

        expect(result.id).to.equal(agentMock.id);
    });

    it("should throw exception if no actor can be derived from the speaker", () => {
        const sampleToken = { scene: "scene", token: "token", actor: "actor", alias: "alias" };
        sandbox.stub(foundryApi, "getToken").returns(undefined);
        sandbox.stub(foundryApi, "getActor").returns(undefined);
        sandbox.stub(foundryApi, "getSpeaker").returns(sampleToken);

        expect(() => referencesUtils.findBestUserActor()).to.throw(Error);
    });
});
