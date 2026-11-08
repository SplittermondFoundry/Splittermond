import { expect } from "chai";
import sinon from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { useScene, withActor, withScene, withUnlinkedToken } from "../integration/fixtures";
import SplittermondActor from "module/actor/actor";

declare const game: object;

describe("Scene fixture cleanup", () => {
    const sandbox = sinon.createSandbox();
    const original = { id: "original", active: true, activate: sandbox.stub(), view: sandbox.stub() };
    const temporary = {
        id: "temporary",
        active: false,
        dimensions: { width: 4000, height: 3000 },
        view: sandbox.stub(),
        activate: sandbox.stub(),
        createEmbeddedDocuments: sandbox.stub(),
        deleteEmbeddedDocuments: sandbox.stub(),
    };
    let currentScene: { id: string };
    let deleteDocuments: sinon.SinonStub;

    beforeEach(() => {
        original.activate.resolves();
        original.view.resolves();
        currentScene = original;
        temporary.active = false;
        temporary.view.resolves();
        temporary.activate.resolves();
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
        temporary.view.reset();
        temporary.activate.reset();
        temporary.createEmbeddedDocuments.reset();
        temporary.deleteEmbeddedDocuments.reset();
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

    describe("Suite scene preparation", () => {
        it("awaits viewing the scene and then activates it without an additional timer", async () => {
            const clock = sandbox.useFakeTimers();
            const beforeHook = sandbox.stub();
            const afterHook = sandbox.stub();
            let finishView!: () => void;
            temporary.view.returns(new Promise<void>((resolve) => (finishView = resolve)));
            useScene({ before: beforeHook, after: afterHook }, () => undefined);
            const prepare = beforeHook.firstCall.args[0] as () => Promise<void>;
            const cleanup = afterHook.firstCall.args[0] as () => Promise<void>;

            const preparation = prepare();
            try {
                await clock.tickAsync(0);
                sinon.assert.calledOnce(temporary.view);
                sinon.assert.notCalled(temporary.activate);

                finishView();
                await clock.tickAsync(0);

                sinon.assert.calledOnce(temporary.activate);
                await preparation;
            } finally {
                finishView();
                await clock.runAllAsync();
                await preparation;
                await cleanup();
            }
        });

        it("removes the suite scene when viewing it fails", async () => {
            const error = new Error("Scene view failure");
            temporary.view.rejects(error);
            const beforeHook = sandbox.stub();
            const afterHook = sandbox.stub();
            useScene({ before: beforeHook, after: afterHook }, () => undefined);
            const prepare = beforeHook.firstCall.args[0] as () => Promise<void>;
            const cleanup = afterHook.firstCall.args[0] as () => Promise<void>;

            const result = await prepare().catch((caught: unknown) => caught);
            await cleanup();

            expect(result).to.equal(error);
            sinon.assert.notCalled(temporary.activate);
            sinon.assert.calledOnceWithExactly(deleteDocuments, [temporary.id]);
        });
    });

    describe("Unlinked token fixture cleanup", () => {
        const token = { id: "token" };
        let deleteActors: sinon.SinonStub;

        beforeEach(() => {
            const actor = sandbox.createStubInstance(SplittermondActor);
            Object.defineProperty(actor, "id", { value: "actor" });
            deleteActors = sandbox.stub().resolves([]);
            sandbox.define(Actor, "create", sandbox.stub().resolves(actor));
            sandbox.define(Actor, "deleteDocuments", deleteActors);
            sandbox.define(game, "messages", []);
            temporary.createEmbeddedDocuments.resolves([token]);
            temporary.deleteEmbeddedDocuments.resolves([]);
        });

        it("forwards arguments and deletes its centered token before its actor and scene", async () => {
            const result = await withUnlinkedToken(async (createdToken, input: string) => {
                expect(createdToken).to.equal(token);
                expect(input).to.equal("input");
                return "result";
            })("input");

            expect(result).to.equal("result");
            expect(temporary.createEmbeddedDocuments.firstCall.args).to.deep.equal([
                "Token",
                [{ type: "base", actorLink: false, actorId: "actor", x: 2000, y: 1500 }],
            ]);
            sinon.assert.calledOnceWithExactly(temporary.deleteEmbeddedDocuments, "Token", [token.id]);
            sinon.assert.callOrder(temporary.deleteEmbeddedDocuments, deleteActors, deleteDocuments);
        });

        it("deletes the token from its parent scene when the callback fails", async () => {
            const error = new Error("Token test failure");

            const result = await withUnlinkedToken(async () => {
                // The viewed scene is still the original, not the token's parent.
                throw error;
            })().catch((caught: unknown) => caught);

            expect(result).to.equal(error);
            sinon.assert.calledOnceWithExactly(temporary.deleteEmbeddedDocuments, "Token", [token.id]);
            sinon.assert.callOrder(temporary.deleteEmbeddedDocuments, deleteActors, deleteDocuments);
        });

        it("still removes the actor and scene when token deletion fails", async () => {
            const error = new Error("Token deletion failure");
            temporary.deleteEmbeddedDocuments.rejects(error);

            const result = await withUnlinkedToken(async () => undefined)().catch((caught: unknown) => caught);

            expect(result).to.equal(error);
            sinon.assert.callOrder(temporary.deleteEmbeddedDocuments, deleteActors, deleteDocuments);
        });
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
