import { expect } from "chai";
import sinon from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { withScene } from "../integration/fixtures";

describe("Scene fixture cleanup", () => {
    const sandbox = sinon.createSandbox();
    const original = { id: "original", activate: sandbox.stub(), view: sandbox.stub() };
    const temporary = { id: "temporary" };
    let currentScene: { id: string };
    let deleteDocuments: sinon.SinonStub;

    beforeEach(() => {
        original.activate.reset();
        original.view.reset();
        original.activate.resolves();
        original.view.resolves();
        currentScene = original;
        deleteDocuments = sandbox.stub().resolves([]);
        sandbox.define(globalThis, "Scene", { create: sandbox.stub().resolves(temporary), deleteDocuments });
        sandbox.stub(foundryApi, "currentScene").get(() => currentScene);
    });
    afterEach(() => sandbox.restore());

    for (const fails of [false, true]) {
        it(`restores the original scene before deleting the viewed test scene when the test ${fails ? "fails" : "succeeds"}`, async () => {
            const error = new Error("Test failure");
            const test = withScene(async (scene) => {
                expect(scene).to.equal(temporary);
                currentScene = temporary;
                if (fails) throw error;
                return "result";
            });

            const result = await test().catch((caught: unknown) => caught);

            expect(result).to.equal(fails ? error : "result");
            sinon.assert.callOrder(original.activate, original.view, deleteDocuments);
            expect(deleteDocuments.firstCall.args).to.deep.equal([[temporary.id]]);
        });
    }

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
