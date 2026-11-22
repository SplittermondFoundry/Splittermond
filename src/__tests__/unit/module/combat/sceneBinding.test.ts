import { expect } from "chai";
import sinon from "sinon";
import { foundryApi } from "module/api/foundryApi";
import type { FoundryCombat, FoundryScene } from "module/api/foundryTypes";
import { setPreCreateCombatHook } from "module/combat/sceneBinding";

describe("default combat scene", () => {
    const sandbox = sinon.createSandbox();
    let onCreate: (
        combat: Pick<FoundryCombat, "updateSource"> & { scene: Pick<FoundryScene, "id"> | null },
        data: { scene?: string | null }
    ) => void;
    beforeEach(() => {
        const registration = sandbox.stub(foundryApi.hooks, "on");
        setPreCreateCombatHook();
        expect(registration.firstCall.args[0]).to.equal("preCreateCombat");
        onCreate = registration.firstCall.args[1] as typeof onCreate;
    });
    afterEach(() => sandbox.restore());

    it("leaves a combat unbound when no scene is viewed", () => {
        sandbox.stub(foundryApi, "currentScene").get(() => null);
        const updateSource = sandbox.stub();

        onCreate({ scene: null, updateSource }, {});

        expect(updateSource.called).to.be.false;
    });

    it("preserves a scene already supplied by another creation hook", () => {
        const updateSource = sandbox.stub();
        sandbox.stub(foundryApi, "currentScene").get(() => ({ id: "viewed-scene" }));

        onCreate({ scene: { id: "existing-scene" }, updateSource }, {});

        expect(updateSource.called).to.be.false;
    });
});
