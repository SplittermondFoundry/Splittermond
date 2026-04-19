import sinon, { type SinonSandbox, type SinonStub } from "sinon";
import { expect } from "chai";
import { describe } from "mocha";
import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { addFreeXP } from "module/util/macros";

describe("addFreeXP", () => {
    let sandbox: SinonSandbox;
    let warnUserStub: SinonStub;
    let informUserStub: SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        warnUserStub = sandbox.stub(foundryApi, "warnUser");
        informUserStub = sandbox.stub(foundryApi, "informUser");
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
    });

    afterEach(() => sandbox.restore());

    function stubActors(actors: object[]) {
        sandbox.stub(foundryApi.collections, "actors").get(() => ({
            filter: (fn: (a: object) => boolean) => actors.filter(fn),
        }));
    }

    function createActor(name: string, freeXP: number, hasPlayerOwner = true) {
        const updateStub = sandbox.stub().resolves();
        return {
            name,
            type: "character",
            hasPlayerOwner,
            system: { experience: { free: freeXP } },
            update: updateStub,
        };
    }

    /**
     * Stubs FoundryDialog.prompt to resolve with the given amount value,
     * or reject (simulating dialog close/cancel) when value is null.
     */
    function stubPromptWithValue(value: number | null) {
        const promptStub = sandbox.stub(FoundryDialog, "prompt");
        if (value === null) {
            promptStub.rejects(new Error("Dialog closed"));
        } else {
            promptStub.resolves(value);
        }
    }

    function stubChatMessage() {
        const createStub = sandbox.stub().resolves();
        const getSpeakerStub = sandbox.stub().returns({});
        // @ts-ignore
        globalThis.ChatMessage.create = createStub;
        // @ts-ignore
        globalThis.ChatMessage.getSpeaker = getSpeakerStub;
        // @ts-ignore
        globalThis.foundry.utils = { escapeHTML: (s: string) => s };
        return createStub;
    }

    it("should warn when no player characters exist", async () => {
        stubActors([]);

        await addFreeXP();

        expect(warnUserStub.calledOnce).to.be.true;
        expect(warnUserStub.firstCall.args[0]).to.equal("splittermond.addFreeXP.noPlayerCharacters");
    });

    it("should warn when actors are not player-owned", async () => {
        const npcActor = createActor("NPC", 0, false);
        stubActors([npcActor]);

        await addFreeXP();

        expect(warnUserStub.calledOnce).to.be.true;
        expect(warnUserStub.firstCall.args[0]).to.equal("splittermond.addFreeXP.noPlayerCharacters");
    });

    it("should warn when actors are not of type character", async () => {
        const npc = { name: "Monster", type: "npc", hasPlayerOwner: true };
        stubActors([npc]);

        await addFreeXP();

        expect(warnUserStub.calledOnce).to.be.true;
        expect(warnUserStub.firstCall.args[0]).to.equal("splittermond.addFreeXP.noPlayerCharacters");
    });

    it("should inform user when amount is zero", async () => {
        const actor = createActor("Hero", 10);
        stubActors([actor]);
        stubPromptWithValue(0);

        await addFreeXP();

        expect(informUserStub.calledOnce).to.be.true;
        expect(informUserStub.firstCall.args[0]).to.equal("splittermond.addFreeXP.zeroAmount");
        expect(actor.update.called).to.be.false;
    });

    it("should not update actors when dialog is cancelled", async () => {
        const actor = createActor("Hero", 5);
        stubActors([actor]);
        stubPromptWithValue(null);

        await addFreeXP();

        expect(actor.update.called).to.be.false;
    });

    it("should update actors and post chat message when amount is positive", async () => {
        const actor1 = createActor("Hero1", 5);
        const actor2 = createActor("Hero2", 10);
        stubActors([actor1, actor2]);
        stubPromptWithValue(3);
        const chatCreateStub = stubChatMessage();

        await addFreeXP();

        expect(actor1.update.calledOnce).to.be.true;
        expect(actor1.update.firstCall.args[0]).to.deep.equal({ "system.experience.free": 8 });

        expect(actor2.update.calledOnce).to.be.true;
        expect(actor2.update.firstCall.args[0]).to.deep.equal({ "system.experience.free": 13 });

        expect(chatCreateStub.calledOnce).to.be.true;
        expect(informUserStub.calledOnce).to.be.true;
        expect(informUserStub.firstCall.args[0]).to.equal("splittermond.addFreeXP.distributed");
    });

    it("should not update npc actors or non-player-owned characters", async () => {
        const playerActor = createActor("Hero", 5);
        const npcActor = { name: "Monster", type: "npc", hasPlayerOwner: false, update: sandbox.stub().resolves() };
        const gmCharacter = createActor("GM-Char", 10, false);
        stubActors([playerActor, npcActor, gmCharacter]);
        stubPromptWithValue(3);
        stubChatMessage();

        await addFreeXP();

        expect(playerActor.update.calledOnce).to.be.true;
        expect(playerActor.update.firstCall.args[0]).to.deep.equal({ "system.experience.free": 8 });
        expect(npcActor.update.called).to.be.false;
        expect(gmCharacter.update.called).to.be.false;
    });

    it("should warn when all actor updates fail", async () => {
        const actor = createActor("Hero", 5);
        actor.update.rejects(new Error("Update failed"));
        stubActors([actor]);
        stubPromptWithValue(5);
        stubChatMessage();

        await addFreeXP();

        expect(warnUserStub.calledOnce).to.be.true;
        expect(warnUserStub.firstCall.args[0]).to.equal("splittermond.addFreeXP.noneUpdated");
    });
});
