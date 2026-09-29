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
        expect(result.sceneId).to.equal(agentMock.parent?.id);
        expect(result.type).to.equal("token");
    });

    for (const token of [null, "missing-token"]) {
        it(`should resolve the actor when the speaker token is ${token}`, () => {
            const speaker = { scene: "scene", token, actor: "actor", alias: "alias" };
            const agentMock = {
                documentName: "Actor",
                parent: undefined,
                id: "1",
                items: new Map(),
            } as unknown as SplittermondActor; /*mock good enough for this test */
            sandbox.stub(foundryApi, "getToken").returns(undefined);
            sandbox.stub(foundryApi, "getSpeakerActor").returns(agentMock);
            sandbox.stub(foundryApi, "getSpeaker").returns(speaker);

            const result = referencesUtils.findBestUserActor();

            expect(result.id).to.equal(agentMock.id);
            expect(result.sceneId).to.be.null;
            expect(result.type).to.equal("actor");
        });
    }

    it("should fall back to the world actor if the token reference cannot be initialized", () => {
        const speaker = { scene: "scene", token: "token", actor: "actor", alias: "alias" };
        const invalidToken = { documentName: "Token", id: "token" } as TokenDocument;
        const actor = {
            documentName: "Actor",
            id: "actor",
        } as SplittermondActor;
        sandbox.stub(foundryApi, "getSpeaker").returns(speaker);
        sandbox.stub(foundryApi, "getToken").returns(invalidToken);
        sandbox
            .stub(foundryApi, "getSpeakerActor")
            .withArgs({ ...speaker, token: null })
            .returns(actor);

        const result = referencesUtils.findBestUserActor();

        expect(result.id).to.equal(actor.id);
        expect(result.sceneId).to.be.null;
        expect(result.type).to.equal("actor");
    });

    it("should throw exception if no actor can be derived from the speaker", () => {
        const sampleToken = { scene: "scene", token: "token", actor: "actor", alias: "alias" };
        sandbox.stub(foundryApi, "getToken").returns(undefined);
        sandbox.stub(foundryApi, "getSpeakerActor").returns(null);
        sandbox.stub(foundryApi, "getSpeaker").returns(sampleToken);

        expect(() => referencesUtils.findBestUserActor()).to.throw(Error);
    });
});
