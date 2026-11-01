import { expect } from "chai";
import sinon from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { withActor, withScene } from "../integration/fixtures";
import SplittermondActor from "module/actor/actor";

declare const game: object;

describe("Scene fixture cleanup", () => {
    const sandbox = sinon.createSandbox();
    const original = { id: "original", active: true, activate: sandbox.stub(), view: sandbox.stub() };
    const temporary = { id: "temporary", active: false };
    let currentScene: { id: string };
    let deleteDocuments: sinon.SinonStub;

    beforeEach(() => {
        original.activate.resolves();
        original.view.resolves();
        currentScene = original;
        temporary.active = false;
        deleteDocuments = sandbox.stub().resolves([]);
        sandbox.define(globalThis, "Scene", { create: sandbox.stub().resolves(temporary), deleteDocuments });
        sandbox.define(globalThis, "ui", { combat: { viewed: null } });
        sandbox.define(globalThis, "canvas", { ready: true });
        sandbox.stub(foundryApi, "currentScene").get(() => currentScene);
        sandbox.stub(foundryApi, "scenes").get(() => [original, temporary]);
        sandbox.stub(foundryApi, "combats").get(() => []);
    });
    afterEach(() => {
        original.activate.reset();
        original.view.reset();
        sandbox.restore();
    });

    it("restores the original scene before deleting the viewed test scene when the test succeeds", async () => {
        const result = await withScene(async (scene) => {
            expect(scene).to.equal(temporary);
            currentScene = temporary;
            temporary.active = true;
            return "result";
        })();

        expect(result).to.equal("result");
        sinon.assert.callOrder(original.activate, original.view, deleteDocuments);
        expect(deleteDocuments.firstCall.args).to.deep.equal([[temporary.id]]);
    });

    it("restores the original scene before deleting the viewed test scene when the test fails", async () => {
        const error = new Error("Test failure");
        const result = await withScene(async (scene) => {
            expect(scene).to.equal(temporary);
            currentScene = temporary;
            temporary.active = true;
            throw error;
        })().catch((caught: unknown) => caught);

        expect(result).to.equal(error);
        sinon.assert.callOrder(original.activate, original.view, deleteDocuments);
        expect(deleteDocuments.firstCall.args).to.deep.equal([[temporary.id]]);
    });

    it("deletes an unused test scene without changing the viewed scene", async () => {
        await withScene(async () => undefined)();
        expect(original.activate.called).to.be.false;
        expect(original.view.called).to.be.false;
        expect(deleteDocuments.calledOnce).to.be.true;
    });

    it("still removes the temporary scene if restoring the original fails", async () => {
        const error = new Error("Scene restoration failure");
        original.view.rejects(error);

        const result = await withScene(async () => {
            currentScene = temporary;
        })().catch((caught: unknown) => caught);

        expect(result).to.equal(error);
        expect(deleteDocuments.calledOnce).to.be.true;
    });
});

describe("Actor fixture cleanup", () => {
    const sandbox = sinon.createSandbox();
    let character: SplittermondActor;
    let npc: SplittermondActor;
    let deleteDocuments: sinon.SinonStub;

    beforeEach(() => {
        character = sandbox.createStubInstance(SplittermondActor);
        npc = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(character, "id", { value: "character" });
        Object.defineProperty(npc, "id", { value: "npc" });
        deleteDocuments = sandbox.stub().resolves([]);
        sandbox.define(Actor, "create", sandbox.stub().resolves(character));
        sandbox.define(Actor, "deleteDocuments", deleteDocuments);
        sandbox.define(game, "messages", []);
    });
    afterEach(() => sandbox.restore());

    it("combines a custom actor factory with the default fixture and cleans up both actors", async () => {
        const result = await withActor(
            withActor(
                async (target, source) => {
                    expect(target).to.equal(npc);
                    expect(source).to.equal(character);
                    return "result";
                },
                async () => npc
            )
        )();

        expect(result).to.equal("result");
        expect(deleteDocuments.args).to.deep.equal([[[npc.id]], [[character.id]]]);
    });

    it("deletes the actor from a custom factory when the callback fails", async () => {
        const error = new Error("Sheet cleanup failure");
        const result = await withActor(
            async () => {
                throw error;
            },
            async () => npc
        )().catch((caught: unknown) => caught);

        expect(result).to.equal(error);
        expect(deleteDocuments.args).to.deep.equal([[[npc.id]]]);
    });
});
