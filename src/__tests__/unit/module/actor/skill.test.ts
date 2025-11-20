import sinon, { SinonSandbox } from "sinon";
import { stubRollApi } from "__tests__/unit/RollMock";
import { expect } from "chai";
import { describe } from "mocha";
import SplittermondActor from "module/actor/actor";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import ModifierManager from "module/actor/modifiers/modifier-manager";
import Skill from "module/actor/skill";
import { foundryApi } from "module/api/foundryApi";
import { Dice } from "module/check/dice";
import { Chat } from "module/util/chat";
import CheckDialog from "module/apps/dialog/check-dialog";

describe("Skill", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "currentUser").get(() => ({
            targets: new Set(),
        }));
        stubRollApi(sandbox);
    });

    afterEach(() => sandbox.restore());

    it("should allow overwriting options with the check dialog", async () => {
        const actor = setUpActor(sandbox);
        const underTest = new Skill(actor, "Testskill");

        const customOptions = {
            type: "test roll",
            difficulty: 20,
            modifier: 1,
            askUser: true,
        };
        const checkDialogStub = sandbox.stub(CheckDialog, "create").resolves({
            difficulty: "25", // changed from 20 to 25
            maneuvers: [],
            modifier: 3, // changed from 1 to 3
            modifierElements: [{ value: 3, description: "modifier" }],
            rollMode: "gmroll", // changed from publicroll to gmroll
            rollType: "risk", // changed from standard to risk
        });
        sandbox.stub(foundryApi, "settings").get(() => ({
            get: () => "publicroll",
        }));
        sandbox.stub(foundryApi, "rollModes").get(() => ({}));

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

    it("should use the passed options if askUser is false", async () => {
        const actor = setUpActor(sandbox);
        const underTest = new Skill(actor, "Testskill");

        const roll = {
            dice: [],
            total: 26,
            getTooltip: () => "",
        };
        const diceCheckStub = sandbox.stub(Dice, "check").returns({
            difficulty: 20,
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
            difficulty: 20,
            modifier: 1,
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
            difficulty: 20,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            maneuvers: [],
            modifierElements: [
                {
                    value: "1",
                    description: "splittermond.modifier",
                    isMalus: false,
                },
            ],
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

    it("should use default options if askUser is false and no options where passed", async () => {
        const actor = setUpActor(sandbox);
        const underTest = new Skill(actor, "Testskill");

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
            type: "skill",
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
