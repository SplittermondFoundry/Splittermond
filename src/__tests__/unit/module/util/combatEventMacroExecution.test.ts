import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox, type SinonStub } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { executeFiredMacros, type FiredMacroPair } from "module/util/combatEventMacroExecution";
import type { VirtualToken } from "module/combat/VirtualToken";
import type { FoundryCombatant } from "module/api/foundryTypes";

function createVirtualToken(macroUuid: string | null): VirtualToken {
    return {
        name: "Poison",
        startTick: 10,
        interval: 5,
        times: 2,
        description: "Poisoned",
        img: "status-icon.png",
        level: 1,
        statusId: "x64isg0",
        macroRef: { name: "Apply Poison", uuid: macroUuid },
    };
}

function createCombatant(tokenPresent: boolean): FoundryCombatant {
    const actor = { id: "actorId", name: "Fighter" };
    const token = tokenPresent ? ({ id: "tokenId" } as object) : null;
    return {
        id: "combatantId",
        actor,
        token,
    } as unknown as FoundryCombatant;
}

describe("executeFiredMacros", () => {
    let sandbox: SinonSandbox;
    let getSpeakerStub: SinonStub;
    let fromUuidStub: SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        getSpeakerStub = sandbox.stub(foundryApi, "getSpeaker").returns({
            scene: "sceneId",
            actor: "actorId",
            token: "tokenId",
            alias: "Fighter",
        });
        fromUuidStub = sandbox.stub(foundryApi.utils, "fromUUID");
    });

    afterEach(() => sandbox.restore());

    it("does nothing when pairs is empty", () => {
        executeFiredMacros([]);

        expect(getSpeakerStub.called).to.be.false;
        expect(fromUuidStub.called).to.be.false;
    });

    it("skips pairs without a macroRef", () => {
        const virtualToken: VirtualToken = {
            ...createVirtualToken(null),
            macroRef: undefined,
        };

        executeFiredMacros([{ virtualToken, combatant: createCombatant(true) }]);

        expect(fromUuidStub.called).to.be.false;
    });

    it("skips pairs whose macroRef.uuid is null", () => {
        executeFiredMacros([
            {
                virtualToken: createVirtualToken(null),
                combatant: createCombatant(true),
            },
        ]);

        expect(fromUuidStub.called).to.be.false;
    });

    it("resolves and executes the macro with actor, token, and speaker in scope", async () => {
        const executeStub = sandbox.stub().resolves();
        fromUuidStub.resolves({
            canExecute: true,
            execute: executeStub,
        });

        const combatant = createCombatant(true);
        executeFiredMacros([{ virtualToken: createVirtualToken("macro.uuid.1"), combatant }]);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(fromUuidStub.calledOnce).to.be.true;
        expect(fromUuidStub.firstCall.args[0]).to.equal("macro.uuid.1");
        expect(getSpeakerStub.calledOnceWith({ actor: combatant.actor })).to.be.true;
        expect(executeStub.calledOnce).to.be.true;
        const scope = executeStub.firstCall.args[0] as {
            actor: unknown;
            token: unknown;
            speaker: unknown;
        };
        expect(scope.actor).to.equal(combatant.actor);
        expect(scope.token).to.deep.equal({ id: "tokenId" });
        expect(scope.speaker).to.deep.equal({
            scene: "sceneId",
            actor: "actorId",
            token: "tokenId",
            alias: "Fighter",
        });
    });

    it("passes token as undefined when combatant has no token", async () => {
        const executeStub = sandbox.stub().resolves();
        fromUuidStub.resolves({
            canExecute: true,
            execute: executeStub,
        });

        const combatant = createCombatant(false);
        executeFiredMacros([{ virtualToken: createVirtualToken("macro.uuid.2"), combatant }]);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(executeStub.calledOnce).to.be.true;
        const scope = executeStub.firstCall.args[0] as { token: unknown };
        expect(scope.token).to.be.undefined;
    });

    it("does not throw when macro execution rejects", async () => {
        fromUuidStub.resolves({
            canExecute: true,
            execute: sandbox.stub().rejects(new Error("macro blew up")),
        });
        const errorStub = sandbox.stub(console, "error");

        const pairs: FiredMacroPair[] = [
            { virtualToken: createVirtualToken("macro.uuid.3"), combatant: createCombatant(true) },
        ];

        expect(() => executeFiredMacros(pairs)).to.not.throw();
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(errorStub.called).to.be.true;
    });

    it("skips macros that resolve to null", () => {
        fromUuidStub.resolves(null);

        executeFiredMacros([{ virtualToken: createVirtualToken("missing.uuid"), combatant: createCombatant(true) }]);

        expect(fromUuidStub.calledOnce).to.be.true;
        expect(getSpeakerStub.called).to.be.true;
    });
});
