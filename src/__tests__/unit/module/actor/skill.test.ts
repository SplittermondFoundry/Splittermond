import sinon, { SinonSandbox } from "sinon";
import { stubRollApi } from "__tests__/unit/RollMock";
import { expect } from "chai";
import { describe } from "mocha";
import SplittermondActor from "module/actor/actor";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import ModifierManager from "module/actor/modifier-manager";
import Skill from "module/actor/skill";
import { foundryApi } from "module/api/foundryApi";
import { Dice } from "module/util/dice";
import { Chat } from "module/util/chat";
import CheckDialog from "module/apps/dialog/check-dialog";

describe("Skill", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        stubRollApi(sandbox);
    });

    afterEach(() => sandbox.restore());

    it("should make a skill check with the options from the check dialog", async () => {
        const actor = setUpActor(sandbox);
        const underTest = new Skill(actor, "Testskill");

        const checkDialogStub = sandbox.stub(CheckDialog, "create").resolves({
            difficulty: 25,
            maneuvers: [],
            modifier: 3,
            modifierElements: [{ value: 3, description: "modifier" }],
            rollMode: "gmroll",
            rollType: "risk",
        });
        sandbox.stub(foundryApi, "settings").get(() => ({
            get: () => "publicroll",
        }));
        sandbox.stub(foundryApi, "rollModes").get(() => ({}));
        sandbox.stub(foundryApi, "currentUser").get(() => ({
            targets: new Set(),
        }));

        const roll = {
            dice: [],
            total: 26,
            getTooltip: () => "",
        };
        const diceCheckStub = sandbox.stub(Dice, "check").returns({
            difficulty: 25,
            succeeded: true,
            isFumble: false,
            isCrit: false,
            degreeOfSuccess: 0,
            degreeOfSuccessMessage: "(Knapp) gelungen",
            roll,
        });
        const chatPrepareStub = sandbox.stub(Chat, "prepareCheckMessageData").resolves();
        const createMessageStub = sandbox.stub(foundryApi, "createChatMessage").resolves();

        const customOptions = {
            type: "test roll",
            difficulty: null,
            modifier: 0,
            preSelectedModifier: [],
            subtitle: null,
            title: null,
            checkMessageData: {},
            askUser: true,
        };

        await underTest.roll(customOptions);

        expect(checkDialogStub.calledOnce).to.be.true;
        expect(diceCheckStub.calledOnce).to.be.true;
        expect(chatPrepareStub.calledOnce).to.be.true;
        expect(chatPrepareStub.firstCall.args[0]).to.equal(actor);
        expect(chatPrepareStub.firstCall.args[1]).to.equal("gmroll");
        expect(chatPrepareStub.firstCall.args[2]).to.equal(roll);
        expect(chatPrepareStub.firstCall.args[3]).to.be.an("object");
        expect(chatPrepareStub.firstCall.args[3]).to.deep.include({
            availableSplinterpoints: 0,
            degreeOfSuccess: 0,
            difficulty: 25,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            maneuvers: [],
            modifierElements: [
                {
                    value: "3",
                    description: "modifier",
                    isMalus: false,
                },
            ],
            rollType: "risk",
            skill: "testskill",
            skillAttributes: {},
            skillPoints: 0,
            skillValue: 0,
            succeeded: true,
            type: "test roll",
        });
        expect(createMessageStub.calledOnce).to.be.true;
    });

    it("should skip the dialog if askUser is false", async () => {
        const actor = setUpActor(sandbox);
        const underTest = new Skill(actor, "Testskill");

        sandbox.stub(foundryApi, "currentUser").get(() => ({
            targets: new Set(),
        }));

        const roll = {
            dice: [],
            total: 26,
            getTooltip: () => "",
        };
        const diceCheckStub = sandbox.stub(Dice, "check").returns({
            difficulty: 15,
            succeeded: true,
            isFumble: false,
            isCrit: false,
            degreeOfSuccess: 3,
            degreeOfSuccessMessage: "(Gut) gelungen",
            roll,
        });
        const chatPrepareStub = sandbox.stub(Chat, "prepareCheckMessageData").resolves();
        const createMessageStub = sandbox.stub(foundryApi, "createChatMessage").resolves();

        const customOptions = {
            type: "test roll",
            difficulty: 15,
            modifier: 0,
            preSelectedModifier: [],
            subtitle: null,
            title: null,
            checkMessageData: {},
            askUser: false,
        };

        await underTest.roll(customOptions);

        expect(diceCheckStub.calledOnce).to.be.true;
        expect(chatPrepareStub.calledOnce).to.be.true;
        expect(chatPrepareStub.firstCall.args[0]).to.equal(actor);
        expect(chatPrepareStub.firstCall.args[1]).to.equal("publicroll");
        expect(chatPrepareStub.firstCall.args[2]).to.equal(roll);
        expect(chatPrepareStub.firstCall.args[3]).to.be.an("object");
        expect(chatPrepareStub.firstCall.args[3]).to.deep.include({
            availableSplinterpoints: 0,
            degreeOfSuccess: 3,
            difficulty: 15,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            maneuvers: [],
            modifierElements: [],
            rollType: "standard",
            skill: "testskill",
            skillAttributes: {},
            skillPoints: 0,
            skillValue: 0,
            succeeded: true,
            type: "test roll",
        });
        expect(createMessageStub.calledOnce).to.be.true;
    });
});

function setUpActor(sandbox: SinonSandbox) {
    const actor = sandbox.createStubInstance(SplittermondActor);
    const dataModel = sandbox.createStubInstance(CharacterDataModel);
    Object.defineProperty(dataModel, "experience", {
        value: { heroLevel: 1 },
        enumerable: true,
        writable: false,
    });
    Object.defineProperty(actor, "getFlag", { value: sandbox.stub(), enumerable: true, writable: false });
    Object.defineProperty(actor, "modifier", { value: new ModifierManager(), enumerable: true, writable: false });
    Object.defineProperty(actor, "system", { value: dataModel, enumerable: true, writable: false });
    Object.defineProperty(actor.system, "skills", { value: {}, enumerable: true, writable: false });
    Object.defineProperty(actor, "items", { value: [], enumerable: true, writable: true });
    actor.findItem.callThrough();
    return actor;
}
